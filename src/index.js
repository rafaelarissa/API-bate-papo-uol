import express from 'express';
import cors from 'cors';
import dotenv from "dotenv";
import joi from 'joi';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br.js';
import { MongoClient } from 'mongodb';

const server = express();
server.use(express.json());
server.use(cors());
dotenv.config();

const participantSchema = joi.object({
  name: joi.string().required()
})

const messageSchema = joi.object({
  to: joi.string().required(),
  text: joi.string().required(),
  type: joi.any().valid('message','private_message')
})

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

mongoClient.connect().then(() => {
  db = mongoClient.db("projeto12-API-bate-papo-UOL");
});

server.post('/participants', async (req, res) => {
  const validation = participantSchema.validate(req.body, { abortEarly: true });

  if(validation.error) {
    res.sendStatus(422);
    return
  }
  
  const existingParticipant = await db.collection("participants").find(req.body).toArray();

  if(existingParticipant.length !== 0) {
    res.status(409).send('Nome já cadastrado');
    return
  }

  const participant = {
    name: req.body.name,
    lastStatus: Date.now()
  }

  const message = {
    from: participant.name,
    to: 'Todos',
    text: 'entra na sala...',
    type: 'status',
    time: dayjs().format('HH:MM:ss')
  }

  try {
    await db.collection("participants").insertOne(participant);
    await db.collection("messages").insertOne(message);
    
    res.sendStatus(201);
  } catch(error) {
    console.log(error);
    res.sendStatus(500);
  }  
});

server.get('/participants', async (req, res) => {
  try {
    const participant = await db.collection("participants").find().toArray();

    res.send(participant);
  } catch (error) {
      console.log(error);
      res.sendStatus(500); 
  }
});

server.post('/messages', async (req, res) => {
  const validation = messageSchema.validate(req.body, { abortEarly: false });
  const isParticipant = await db.collection("participants").findOne({ name: req.headers.user });
  
  if(validation.error || !isParticipant) {
    res.sendStatus(422);
    return
  }

  const message = {
    from: req.headers.user,
    ...req.body,
    time: dayjs().format('HH:mm:ss')
  }
  
  try {
    await db.collection("messages").insertOne(message);

    res.sendStatus(201);  
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

server.get('/messages', async (req, res) => {
  const limit = parseInt(req.query.limit);

  try {
    const message = await db.collection("messages").find().toArray();
    
    const filterUserMessage = message.filter(message => 
      message.to === req.headers.user || message.from === req.headers.user || message.to === 'Todos'
    )
    
    let filterMessages = filterUserMessage.slice(0, limit)

    res.send(
      limit ? filterMessages : filterUserMessage
    );
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

server.listen(5000);