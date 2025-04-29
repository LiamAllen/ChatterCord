//imports go here
const express = require("express");
const http = require("node:http");
const socket = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new socket.Server(server);

app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => { //index router
  res.sendFile(__dirname + '/login.html');
});

io.on('connection', (socket) => {   //alerts when a user connects
    io.emit('a user has joined the room');
    console.log('a user connected');

    socket.on("message", function(msg) {
        io.emit("message", msg);
    });

    socket.on('disconnect', () => {     //alerts when a user disconnects
        io.emit('a user has left the room');
        console.log('user disconnected');
    });
  });

server.listen(3000, () => { 
    console.log("Server is listening on port 3000")
});

//(c) 2025 Liam Patrick Allen