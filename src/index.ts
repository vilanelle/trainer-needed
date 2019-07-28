import { readFileSync } from 'fs';
import http from 'http';
import * as process from 'process';
import * as WebSocket from 'ws';
import {
  Action,
  FileExtensionToContentTypeMap,
  State,
  StaticFileExtension,
  User,
  Event,
  ContentType,
  Issue,
} from './types';

const PORT = process.env.PORT || 5000;

const FILE_EXTENSION_TO_CONTENT_TYPE: FileExtensionToContentTypeMap = {
  css: 'text/css',
  html: 'text/html',
  ico: 'image/x-icon',
  js: 'text/javascript',
};

const server = http.createServer(function(req, res) {
    try {
      const url = req.url === '/' ? 'index.html' : req.url;
      const urlParts = url ? url.split('.') : '';
      const fileExtension = urlParts[urlParts.length - 1];
      const contentType = FILE_EXTENSION_TO_CONTENT_TYPE[fileExtension];
      
      res.writeHead(200,{ 'Content-Type': contentType });
      const file = readFileSync(`${process.cwd()}/public/${url}`);
      res.end(file);
    }
    catch(e) {
      console.log(e)
      res.end(e);
    }
  
}).listen(PORT, function() {
  console.log("Server running on PORT: " + PORT)
});


const webSocketsServer = new WebSocket.Server({ server: server });
webSocketsServer.on('connection', (socket: WebSocket) => {
  const connectedUser: User = {
    id: `user-id-${Date.now()}`,
    data: {
      name: '',
      group: '',
    },
    socket,
  };

  socket.on('message', (data) => {
    const { action, payload } = JSON.parse(data.toString());
     switch (action as Action) {
      case 'PARTICIPANT_LOGIN': {
        connectedUser.data.name = payload.name;
        connectedUser.data.group = payload.group;
        state.participants.push(connectedUser);
        sendEvent(socket, { action: 'PARTICIPANT_LOGGED' });
        break;
      }
      case 'TRAINER_LOGIN': {
        connectedUser.data.name = payload.name;
        state.trainers.push(connectedUser);
        sendEvent(socket, { action: 'TRAINER_LOGGED' });
        break;
      }
      case 'TRAINER_NEEDED': {

        const issue: Issue = {
          id: '',
          status: 'PENDING',
          userId: '',
          userName: '',
          userGroup: '',
          problem: '',
        };
      
        issue.id = Date.now().toString();
        issue.status = 'PENDING';
        issue.userId = connectedUser.id;
        issue.userName = connectedUser.data.name;
        issue.userGroup = connectedUser.data.group;
        issue.problem = payload.problem;
        state.issues.push(issue);
        sendEvent(socket, { action: 'ISSUE_RECEIVED' });
        state.trainers.forEach(trainer => sendEvent(trainer.socket, { action: 'ISSUES', payload: state.issues }));
        break;
      }
      case 'ISSUE_TAKEN': {
        const issue = state.issues.find(iss => iss.id === payload && iss.status !== 'SOLVED');
        if(!issue) {
          break;
        }
        issue.status = 'TAKEN';
        state.trainers.forEach(trainer => sendEvent(trainer.socket, { action: 'ISSUES', payload: state.issues }));
        const participant = state.participants.find(participant => participant.id === issue.userId);
        if(!participant) {
          break;
        }
        sendEvent(participant.socket, { action: 'ISSUE_TAKEN', payload: connectedUser.data.name });
        break;
      }
      case 'ISSUE_SOLVED': {
        const issue = state.issues.find(iss => iss.id === payload);
        if(!issue) {
          break;
        }
        issue.status = 'SOLVED';
        break;
      }
      default: {
        console.error('unknown action');
      }
    }
  });
});


const state: State = {
  participants: [],
  trainers: [],
  issues: [],
};

const sendEvent = (socket: WebSocket, event: Event): void => {
  try {
    socket.send(JSON.stringify(event));
  }
  catch (e) {
    console.error(e);
  }
};