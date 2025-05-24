    async function fetchDataUpdateProfile() {
      try{
        const response = await fetch('/api/userData'); //Make request to server endpoint.
        if(!response.ok){
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        //wait for response to complete, and receive it as a JSON object
        const jsonData = await response.json();

        //make call to the REST API to find out which service provider the client is using
        const serviceProvider = await getAuthServiceProvider();

        //parse json data so that individual values can be rendered by the DOM
        const profileData = JSON.parse(jsonData);
        
        //grab html elements for rendering profile data
        const container = document.getElementById('data-container');
        const user_name = document.getElementById('username');
        const profile_icon = document.getElementById('profile_img');
        
        //message.textContent = "Username : " + data.login; template for further refactoring

        if (serviceProvider == 'github'){ //if the oath2 service provider is GitHub, then the username will be stored under data.login
          user_name.textContent = `Username : ${profileData.login}`;
          profile_icon.setAttribute('src', profileData.avatar_url);
        }
        else if (serviceProvider == 'google') { //if the oauth2 service provider is Google, then the username will be stored under data.name
          user_name.textContent = `Username : ${profileData.name}`;
          profile_icon.setAttribute('src', profileData.picture);
        }
        else {
          console.log('something went wrong, please contact support if problem persists.');
        }

        } catch (error) {
          console.error('Error fetching data:', error);
        }
    }

     async function getAuthServiceProvider() {
        try{
          const response = await fetch('/api/getAuthServiceProvider'); //make request to REST API endpoint
          if(!response.ok){
            throw new error(`HTTP error! Status: ${response.status}`);
          }
          const data = await response.text();
          //console.log(data);
          return data;
        } catch (error) {
          console.error('Error fetching data:', error);
        } 
    } 

    fetchDataUpdateProfile();