import express from 'express';
import cors from 'cors';
import dotenv from "dotenv";
import joi from 'joi';
import { MongoClient } from 'mongodb';

const server = express();
server.use(express.json());
server.use(cors());
dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

mongoClient.connect().then(() => {
  db = mongoClient.db("projeto12-API-bate-papo-UOL");
});


server.post('/participants', (req, res) => {
  db.collection("participants").insertOne(req.body).then(() => {
    res.sendStatus(201);
  }).catch(error => {
    if(!req.body){
      console.log(error);
      res.sendStatus(422);
    }
  })
});

server.get('/participants', (req, res) => {
  db.collection("participants").find().toArray().then(participant => {
    res.send(participant);
  }).catch(error => {
    if(!req.body){
      console.log(error);
      res.sendStatus(422);
    }
  })
});

server.listen(5000);