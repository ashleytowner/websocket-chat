import * as WebSocket from 'ws';
import * as readline from 'readline';
import * as fs from 'fs';
const socket = new WebSocket('ws://localhost:8080');

var currentTimeout: NodeJS.Timeout;
var alive = true;
var token: string;

interface Message {
  type: 'message' | 'command',
  token?: string,
  value: string
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function getNickname() {
  return new Promise<string>(res => {
    rl.question('What is your nickname?\n', res);
  });
}

function formMessage(text: string): Message {
  return {
    type: text[0] === '/' ? 'command' : 'message',
    token,
    value: text
  };
}

function getMessage(socket: WebSocket) {
  rl.question('', (answer) => {
    const msg = formMessage(answer)
    socket.send(JSON.stringify(msg))
    if (alive) {
      currentTimeout = setTimeout(() => getMessage(socket), 0);
    }
  });
}

function login() {
  getNickname().then((nickname) => {
    const loginMessage: Message = {
      type: 'command',
      value: `/login ${nickname}`
    }
    socket.send(JSON.stringify(loginMessage));
    getMessage(socket);
  });
}

function attemptReconnection(socket: WebSocket) {
  fs.readFile('token.txt', (err, data) => {
    if (err) return login();
    token = data.toString();
    const reconnectMessage: Message = {
      token,
      value: `/reconnect ${token}`,
      type: 'command'
    }
    socket.send(JSON.stringify(reconnectMessage));
    getMessage(socket);
  });
}

function setToken(tkn: string) {
  token = tkn;
  fs.writeFile('token.txt', tkn, (err) => {
    if (err) throw err;
  });
}

socket.on('open', () => {
  attemptReconnection(socket);
  socket.on('message', (data) => {
    const message = data.toString();
    if (message.split(' ')[0] === 'Token:') {
      setToken(message.split(' ')[1]);
    } else {
      console.log(message);
    }
  });
});

socket.on('close', () => {
  alive = false;
  rl.close();
  clearTimeout(currentTimeout);
  console.log('Server Disconnected');
});
