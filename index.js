var port = process.env.PORT || 8080

//imports go here
const express = require("express");
const http = require("node:http");
const socket = require("socket.io");
const url = require('url');

//libraries for 0Auth2.0 implementation
const axios = require('axios'); //for making requests to apis
const crypto = require('node:crypto');
const dotenv = require('dotenv'); //for grabing environment variables
const session = require('express-session'); //for storing session data
const { json } = require("node:stream/consumers"); //for interpreting JSON
const MongoStore = require('connect-mongodb-session')(session); //for implementing mongoDB in session storage TODO

const { google } = require('googleapis'); //for handling api requests to google 0auth2.0 api

dotenv.config();

const googleOauthClient = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const googleScope = ['https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile']; //scope for retrieving user email from google API

const githubAuthUrl =  `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${process.env.GITHUB_REDIRECT_URI}&scope=user:email`;

// Generate a secure random state value for preventing cross-origin attacks @callback
const state = crypto.randomBytes(32).toString('hex');

//generate auth url for google api
const googleAuthUrl = googleOauthClient.generateAuthUrl({
  // 'online' (default) or 'offline' (gets refresh_token)
  access_type: 'offline',
  /** Pass in the scopes array defined above.
    * Alternatively, if only one scope is needed, you can pass a scope URL as a string */
  scope: googleScope,
  prompt: 'consent',
  // Enable incremental authorization. Recommended as a best practice.
  include_granted_scopes: true,
  // Include the state parameter to reduce the risk of CSRF attacks.
  state: state
});

const app = express();
const server = http.createServer(app);
const io = new socket.Server(server);

//middleware for detecting if current session is authenticated via github
function isAuthenticated(req, res, next) {
  if (req.session && req.session.accessToken) {
    // User is authenticated
    //console.log('user is authenticated');
    next();
  } else {
    // User is not authenticated
    //console.log('user is not authenticated');
    res.redirect('/'); // Redirect to index
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

//all login routes are here
app.get('/login', (req, res) => { //0auth router
  res.sendFile(__dirname + '/public/login.html');
  //todo: create login page for selecting auth provider to login with
});

app.get('/googleLogin', (req, res) => {
  req.session.state = state;
  res.redirect(googleAuthUrl);
});

app.get('/githubLogin', (req, res) => {
  req.session.state = state;
  res.redirect(githubAuthUrl);
});

app.get('/logout', async (req, res) => { 
  
  if (req.session.authprovider == 'github'){
    try {
      await revokeGithubToken(req.session.accessToken, process.env.GITHUB_CLIENT_ID, process.env.GITHUB_CLIENT_SECRET);
      await req.session.destroy((err) => {
        if (err) {
          console.error('Error destroying session:', err);
          return res.redirect('/error');
        }
      res.redirect('/');
    });
    }catch (error){
      throw new error(error);
    }
  } else if (req.session.authprovider == 'google') {
    try {
      await revokeGoogleToken();
      await req.session.destroy((err) => {
        if (err) {
          console.error('Error destroying session:', err);
          return res.redirect('/error');
        }
      res.redirect('/');
    });
    }catch (error){
      throw new error(error);
    }
  }
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
  res.json(JSON.stringify(req.session.userData));
});

app.get('/api/isAuthenticated', (req, res) => { //checks if user is currently logged in or not 
  res.send(req.session.isAuthenticated);
});

app.get('/api/getAuthServiceProvider', isAuthenticated, async (req, res) => { //gets the name of the auth provider for the current session
  res.send(req.session.authprovider);
})
//functions for logouts here
async function revokeGithubToken(accessToken, clientId, clientSecret) {
  try {
    const encodedCredentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await axios.delete(`https://api.github.com/applications/${clientId}/token`,
      {
        headers: {
          'Authorization' : `Basic ${encodedCredentials}`,
          'access_token': accessToken,
        },
        data: {
          access_token: accessToken,
        },
      }
    );
    if (response.status === 204) {
        console.log('GitHub OAuth token revoked successfully');
        return true; // Token revoked
      } else {
        console.error('Failed to revoke GitHub OAuth token', response.status, response.data);
        return false; // Token revocation failed
      }
    } catch (error) {
      console.error('Error revoking GitHub OAuth token:', error);
      return false; // Token revocation failed due to error
    }
}

async function revokeGoogleToken() {
      // Build the string for the POST request
      let postData = "token=" + googleOauthClient.credentials.access_token;

      // Options for POST request to Google's OAuth 2.0 server to revoke a token
      let postOptions = {
        host: 'oauth2.googleapis.com',
        port: '443',
        path: '/revoke',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        }
      };
  
      // Set up the request
      const postReq = http.request(postOptions, function (res) {
        res.setEncoding('utf8');
        res.on('data', d => {
          console.log('Response: ' + d);
        });
      });
  
      postReq.on('error', error => {
        console.log(error)
      });
  
      // Post the request with data
      await postReq.write(postData);
      return await postReq.end();
}
//create chatbot to manage potenetial group activities (hangman? multi-user drawpad?) 
//consider using rendering template tools such as pug or ejs for reactive ux

//0auth2.0 callback handlers should all go here
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
    req.session.isAuthenticated = true;
    req.session.userData = userData;
    req.session.authprovider = 'github';
    res.redirect('/profile');

  } catch (error) {
    console.error(error);
    res.status(500).send('Authentication failed');
  }
});

app.get('/googleCallback', async (req, res) => {
  let q = url.parse(req.url, true).query;

  if(q.error){
    console.log('Error: ' + q.error);
  } else if (q.state !== req.session.state) { //checks state value
    console.log('State mismatch. Possible CSRF attack.')
    res.end('State mismatch. Possible CSRF attack.')
  }else{ //Get access and refresh tokens (if access_type is offline) 

    let { tokens } = await googleOauthClient.getToken(q.code);
    googleOauthClient.setCredentials(tokens);

    if (tokens.scope.includes('https://www.googleapis.com/auth/userinfo.email') && tokens.scope.includes('https://www.googleapis.com/auth/userinfo.profile')) { //checks if the requested scope was granted
      try {
        const oauth2 = google.oauth2({ version: 'v2', googleOauthClient});
        const response = await oauth2.userinfo.get(tokens);

        req.session.userData = response.data;
        
        console.log(JSON.stringify(response.data));

        req.session.accessToken = tokens;
        req.session.authprovider = 'google';
        req.session.isAuthenticated = true;

        res.redirect('/profile');

      } catch (error) {
        console.error('Error getting user info:', error);
        throw error;
      }
    }
  }
});

//socket handling for real-time chat
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