import express from 'express';
import cors from 'cors';
import dotenv from "dotenv";
import joi from 'joi';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br.js';
import { MongoClient, ObjectId } from 'mongodb';
import { stripHtml } from 'string-strip-html';

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
    name: stripHtml(req.body.name).result.trim(),
    lastStatus: Date.now()
  }

  const message = {
    from: participant.name,
    to: 'Todos',
    text: 'entra na sala...',
    type: 'status',
    time: dayjs().format('HH:mm:ss')
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
  
  if(validation.error || isParticipant === null) {
    res.sendStatus(422);
    return
  }

  const message = {
    from: req.headers.user,
    to: stripHtml(req.body.to).result.trim(),
    text: stripHtml(req.body.text).result.trim(),
    type: stripHtml(req.body.type).result.trim(),
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
    const filterUserMessage = await db.collection("messages").find( { $or: [ { to: req.headers.user }, { from: req.headers.user }, { type: 'status' }, { type: 'message' } ] } ).toArray();
    
    let filterMessages = filterUserMessage.slice(0, limit)

    res.send(
      limit ? filterMessages : filterUserMessage
    );
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

server.post('/status', async (req, res) => {
  const isParticipant = await db.collection("participants").findOne({ name: req.headers.user });

  if(isParticipant === null) {
    res.sendStatus(404);
    return
  }

  try {    
    await db.collection("participants").updateOne({
      name: req.headers.user
    }, { $set: { lastStatus: Date.now() }})

    res.sendStatus(200);
  } catch (error) {
    console.log(error)
    res.sendStatus(500);
  }
});

setInterval( async () => {
 const listParticipants = await db.collection("participants").find().toArray();

 for(let i in listParticipants) {
   if(Date.now() - listParticipants[i].lastStatus > 10000) {
     await db.collection("participants").deleteOne({ lastStatus: listParticipants[i].lastStatus });
     await db.collection("messages").insertOne({
      from: listParticipants[i].name,
      to: 'Todos',
      text: 'sai da sala...',
      type: 'status',
      time: dayjs().format('HH:mm:ss')
     })
   }
 }
}, 15000);

server.delete('/messages/:id', async (req, res) => {
  const { id } = req.params;

  const searchMessage = await db.collection("messages").find({ _id: new ObjectId(id) }).toArray();
  
  if(searchMessage === null) {
    res.send('Id não encontrado').status(404);
    return
  }

  const searchUser = await db.collection("participants").find({name: req.headers.user});
  if(searchUser === null) {
    res.sendStatus(401)
    return
  } 

  try {
    await db.collection("messages").deleteOne({ _id: new ObjectId(id) })
    
    res.send('Mensagem excluída').status(200);
  } catch(error) {
    console.log(error);
    res.sendStatus(500);
  }
});

server.listen(5000);