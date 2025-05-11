fetchData();

async function fetchData() {
  try{
      const response = await fetch('/api/isAuthenticated'); //Make request to server endpoint.
      if(!response.ok){
          throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const isAuthenticated = await response.text();
      console.log(isAuthenticated);
      checkAuthStatus(isAuthenticated);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
}

function checkAuthStatus(status){
  if(status == 'true'){
    drawLoginButton(true);
  }
  else{
    drawLoginButton(false);
  }
} 

function drawLoginButton(isAuthenticated) {
  const loginh1 = document.getElementById('login-logouth2');
  const logina = document.getElementById('login-logouta');
  const body = document.getElementById('body');

  if(isAuthenticated){
    loginh1.innerText = 'Logout';
    logina.setAttribute('href', '/logout');
  }
  else if (!isAuthenticated){
    loginh1.innerText = 'Login';
    logina.setAttribute('href', '/login');
  }
  
}