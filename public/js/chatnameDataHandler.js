 // select relevant elements
    const form = document.querySelector("form");
    const input = document.querySelector("input");
    messageList = document.querySelector(".msgList");
   
    // establish socket.io connection
    const socket = io();
    let user;

    fetchUserData();
    fetchAuthProviderData();

    async function fetchUserData() {
        try{
            const response = await fetch('/api/userData'); //Make request to server endpoint.
            if(!response.ok){
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
           const jsonData = await response.json();
           setUsername(jsonData);

        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }

    async function fetchAuthProviderData() {
        try{
            const response = await fetch('/api/getAuthServiceProvider'); //make request to api to get service provider format.
            if(!response.ok){
                throw new Error(`HTTP ERROR! STATUS: ${response.status}`);
            }
            const authProvider = await response.text()
            //console.log(authProvider);
            return await authProvider;
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }

    //set username
    async function setUsername(data) {
      const userData = JSON.parse(data);
      const auth_provider = await fetchAuthProviderData();
      if(auth_provider == "google"){
        user = userData.name;
      }
      else if(auth_provider == "github"){
        user = userData.login;
      }
    }

    //handle room identification and socket connection to different rooms
    function joinRoom() {
        socket.emit("join", roomID);
    }
    // handle sending message to server & input reset
    function sendMessage(e) {
      // prevent form submission refreshing page
      e.preventDefault();
      // send input value to server as type 'message'
      socket.emit("message", user + ": " + input.value);
      // reset input value
      input.value = "";
    }
   
    // add listener to form submission
    form.addEventListener("submit", sendMessage);
   
    // add message to our page
    function addMessageToHTML(message) {
      // create a new li element
      const li = document.createElement("li");
      //define class of li element
      li.className = "msg";
      // add message to the elements text
      li.innerText = message;
      // add to list of messages
      messageList.append(li);
    }
     // watch for socket to emit a 'message'
    socket.on("message", addMessageToHTML);
   
    // display message when a user connects
    function alertUserConnected() {
      addMessageToHTML("User connected");
    }
     // watch for socket to emit a 'user connected' event
    socket.on("user connected", joinRoom);
   