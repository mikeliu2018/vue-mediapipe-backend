'use strict';

const express = require('express');
const http = require('http');
const uuid = require('uuid');
const jose = require('jose');
const { WebSocketServer } = require('ws');
const exampleMongo = require('./examples/mongo');
const exampleMysql = require('./examples/mysql');
const exampleMysqlX = require('./examples/mysqlx');
const { PrismaClient } = require('@prisma/client');
const mysqlx = require('@mysql/xdevapi');
const { getUser, LoginWithGoogle, UserLoginHistory } = require('./modules/user');
const { verify } = require('crypto');

const app = express();
const port = 3000;

process.on('uncaughtException', err => {
  console.error('There was an uncaught error', err);
  // process.exit(1); // mandatory (as per the Node.js docs)
});

//
// Serve static files from the 'public' folder.
//
app.use(express.static('public'));
app.use(express.json());

const mysqlxConfig = {
  schema: process.env.MYSQL_DATABASE,
  password: process.env.MYSQL_PASSWORD,
  user: process.env.MYSQL_USER,
  host: process.env.MYSQL_HOST,
  port: parseInt(process.env.MYSQL_X_PORT),
};

app.post('/login-with-google', async function (req, res) {  

  const prisma = new PrismaClient();
  const session = await mysqlx.getSession(mysqlxConfig);
  console.log('mysqlxConfig', mysqlxConfig);
  console.log('session', session);
  
  try {
    const user = await LoginWithGoogle(prisma, req);
    console.log('loginWithGoogle result', user);
    
    const userLoginHistory = await UserLoginHistory(session, user);
    console.log('userLoginHistory', userLoginHistory);

    res.send({ result: 'OK', message: 'login successfully' });

  } catch (err) {
    console.error(err);
    res.send({ result: 'error', message: err.message });
  } finally {
    prisma.$disconnect();
    session.close();
  }  
  
});

app.delete('/logout', function (request, response) {
  const ws = map.get(request.session.userId);
  if (ws) ws.close();
  response.send({ result: 'OK', message: 'logout successfully' });  
});

//
// Create an HTTP server.
//
const server = http.createServer(app);

//
// Create a WebSocket server completely detached from the HTTP server.
//
const wss = new WebSocketServer({ clientTracking: false, noServer: true });

server.on('upgrade', function (request, socket, head) {

  console.log('Authenticate session from request...');

  let authenticate = async function(request, cb) {
    console.log('request', request);    
    console.log('request.headers', request.headers);
    console.log('request.url', request.url);
    const url = request.url.split('?')[1];
    const urlParams = new URLSearchParams(url);
    console.log('urlParams', urlParams);
    let err = true;
    
    const credential = urlParams.has('credential') ? urlParams.get('credential') : '';    
    const claims = jose.decodeJwt(credential);
    console.log(claims);
    
    if (claims['iss'] === 'https://accounts.google.com') {
      const account_source_type = 'google';
      const account_source_id = claims['sub'];
      const prisma = new PrismaClient();

      try {
        let user = await getUser(prisma, account_source_type, account_source_id);              
        console.log(user);
        err = (user === null);
      } catch (error) {        
        console.log(error);
      } finally {
        prisma.$disconnect();
      }

    }
      
    cb(err, request.client);
  };

  // This function is not defined on purpose. Implement it with your own logic.
  authenticate(request, function next(err, client) {
    if (err || !client) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, function done(ws) {
      wss.emit('connection', ws, request, client);
    });
  });

});

wss.on('connection', function (ws, request) {

  ws.on('message', function (message) {
    //
    // Here we can now use session parameters.
    //
    // console.log(`Received message ${message} from user ${userId}`);
    const json = JSON.parse(message)
    if (json) {
      exampleMongo.record_pose_landmarks(json)
      .then( res => {
        console.log(res);
      })
      .catch( e => {
        console.error(e);
      });

      // exampleMysql.record_pose_landmarks(json)
      // .then( res => {
      //   console.log(res);
      // })
      // .catch( e => {
      //   console.error(e);
      // });

      // exampleMysqlX.record_pose_landmarks(json)
      // .then( res => {
      //   console.log(res);
      // })
      // .catch( e => {
      //   console.error(e);
      // });
      
    }
  });

  ws.on('close', function () {
    console.log("Client disconnected.");
  });
});

//
// Start the server.
//
server.listen(port, function () {
  console.log(`Listening on http://localhost:${port}`);
});