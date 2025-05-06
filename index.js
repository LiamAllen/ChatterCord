var port = process.env.PORT || 8080

//imports go here
const express = require("express");
const http = require("node:http");
const socket = require("socket.io");

//libraries for 0Auth2.0 implementation
const axios = require('axios');
const dotenv = require('dotenv');
const session = require('express-session');
const MongoStore = require('connect-mongodb-session')(session);

dotenv.config();
const githubAuthUrl =  `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${process.env.GITHUB_REDIRECT_URI}&scope=user:email`;

const app = express();
const server = http.createServer(app);
const io = new socket.Server(server);

let USERDATA;

//middleware for detecting if current session is authenticated via github
function isAuthenticated(req, res, next) {
  if (req.session && req.session.accessToken) {
    // User is authenticated
    console.log('user is authenticated');
    next();
  } else {
    // User is not authenticated
    console.log('user is not authenticated');
    res.redirect(githubAuthUrl); // Redirect to GitHub auth route
  }
}

app.use(express.static(__dirname + '/public'));

app.use(
  session({
    secret: process.env.SESSION_SECRET, //generate strong key later
    resave: false, //prevents unmodified session from being saved to storage. 
    saveUninitialized: false, //prevents new, unmodified session from being saved to storage.
    cookie: {
      secure: false, //set true for https
      httpOnly: true, //set false for https
      maxAge: 1800000, //sets max session age to 30m
    },
  })
);

app.get('/', (req, res) => { //home router
  res.sendFile(__dirname + '/public/index.html');
});

app.get('/login', (req, res) => { //0auth router
  res.redirect(githubAuthUrl);
});

app.get('/contact', (req, res) => { //contact page router
  res.sendFile(__dirname + '/public/contact.html');
});

//authenticated endpoints here
app.get('/profile', isAuthenticated, async (req, res) => { //profile router
  res.sendFile(__dirname + '/public/profile.html');
});

app.get('/chat', isAuthenticated, async (req, res) => { //chatroom router
  res.sendFile(__dirname + '/public/chat.html');
});

//REST API Endpoints
app.get('/api/userData', isAuthenticated, async (req, res) => { //gets user data from current session
  res.json(JSON.stringify(USERDATA));
});

//remeber to alter .html files to finish routes. Some templates can be found at E:/Servers/Chattercord
//troubleshoot a way to reuse the banner. ReactJS?
//create chatbot to manage potenetial group activities (hangman? multi-user drawpad?) 

//0auth2.0 callback handler for GitHub authentication
app.get('/callback', async (req, res) => {
  const { code } = req.query;

  try {
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: process.env.GITHUB_REDIRECT_URI,
      },
      {
        headers: {
          Accept: 'application/json',
        },
      }
    );

    const { access_token } = tokenResponse.data;

    req.session.accessToken = access_token;

    const userResponse = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const userData = userResponse.data;
    USERDATA = userData;

    res.redirect('/profile');

  } catch (error) {
    console.error(error);
    res.status(500).send('Authentication failed');
  }
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

server.listen(process.env.PORT, () => { 
    console.log("Server is listening on port 8080")
});

//(c) 2025 Liam Patrick Allen