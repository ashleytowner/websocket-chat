import * as WebSocket from 'ws';

const server = new WebSocket.Server({ port: 8080 });

var clients: Client[] = [];

interface Message {
  type: 'message' | 'command',
  token?: string,
  value: string
}

class Client {
  public nickname: string;
  public socket: WebSocket;
  public token: string;

  constructor(nickname: string, socket: WebSocket, token: string) {
	 this.nickname = nickname;
	 this.socket = socket;
	 this.token = token;
  }

  public send(message: string) {
	 this.socket.send(message);
  }
}

function broadcastMessage(message: string, exclude?: string) {
  console.log(message);
  clients.forEach(client => {
	 if (client.token !== exclude) {
		client.send(message);
	 }
  })
}

function handleLogin(args: string[], socket: WebSocket) {
  if (args.length !== 2) {
	 socket.send('Invalid Login Command');
	 socket.close();
	 return;
  }
  const nickname: string = args[1];
  const nnMatch = clients.findIndex(client => client.nickname === nickname);
  if (nnMatch !== -1) {
	 socket.send('Nickname is taken!');
	 socket.close();
	 return;
  }
  const token = String(Math.floor(Math.random() * 1000000000));
  clients.push(new Client(nickname, socket, token));
  console.log(`${nickname} ${token}`);
  socket.send(`Token: ${token}`);
  broadcastMessage(`${nickname} joined!`);
}

function getNicknameFromToken(token: string) {
  return clients.find(client => client.token === token)?.nickname;
}

function handleLogout(token: string, socket: WebSocket) {
  socket.close();
  broadcastMessage(`${getNicknameFromToken(token)} logged out`);
  clients = clients.filter(client => {
	 return client.token !== token
  });
}

function handleList(socket: WebSocket) {
  socket.send(clients.map(client => client.nickname).join('\n'));
}

function handleMe(message: Message) {
  const nickname = getNicknameFromToken(message.token);
  broadcastMessage(`* ${nickname} ${message.value.replace(/^\/me /, '')} *`);
}

function handleDisconnect(socket: WebSocket, token: string) {
  socket.close();
  const client = clients.find(client => client.token === token);
  if (client) {
	 broadcastMessage(`${client.nickname} disconnected!`);
  }
}

function handleReconnect(args: string[], socket: WebSocket) {
  const token = args[1];
  const oldClient = clients.find(client => client.token === token);
  if (oldClient) {
	 oldClient.socket = socket;
	 socket.send(`Token: ${token}`);
	 broadcastMessage(`${oldClient.nickname} reconnected!`);
  }
}

function handleCommand(message: Message, socket: WebSocket) {
  const args = message.value.split(' ');
  switch(args[0]) {
	 case '/login':
		handleLogin(args, socket);
		break;
	 case '/reconnect':
		handleReconnect(args, socket);
		break;
	 case '/logout':
		handleLogout(message.token, socket);
		break;
	 case '/ping':
		socket.send('Pong!');
		break;
	 case '/list':
		handleList(socket);
		break;
	 case '/me':
		handleMe(message);
		break;
	 case '/disconnect':
		handleDisconnect(socket, message.token);
		break;
	 default:
		socket.send('Unsupported command!');
  }
}

function parseMessage(data: WebSocket.Data): Message {
  return JSON.parse(data.toString());
}

function messageToString(message: Message) {
  const nickname = clients.find(client => client.token === message.token)?.nickname;
  return `<${nickname}> ${message.value}`;
}

server.on('connection', (socket) => {
  socket.on('message', data => {
	 const message = parseMessage(data);
	 if (message.type === 'message') {
		broadcastMessage(messageToString(message), message.token);
	 } else {
		handleCommand(message, socket);
	 }
  })
});
