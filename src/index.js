import express from 'express';
import cors from 'cors';
import dotenv from "dotenv";
import joi from 'joi';
import { MongoClient } from 'mongodb';

const server = express();
server.use(express.json());
server.use(cors());
dotenv.config();

const participantSchema = joi.object({
  name: joi.string().required(),
  price: joi.number().required()
})

const customerSchema = joi.object({
  name: joi.string().required(),
  email: joi.string().required()
})

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

mongoClient.connect().then(() => {
  db = mongoClient.db("projeto12-API-bate-papo-UOL");
});


server.post('/participants', async (req, res) => {
  const participant = req.body;
  const validation = participantSchema.validate(participant, { abortEarly: false });

  if(validation.error) {
    res.status(422);
    return
  }
  
  try {
    await db.collection("participants").insertOne(req.body);

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

server.listen(5000);