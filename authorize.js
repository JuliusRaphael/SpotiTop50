async function goToAuth(){
  // Your client id
  var client_id = "client_id=1cb62d180d404900adc7f4b5f5d8ce12";
  var redirect_uri = "&redirect_uri=https://juliusraphael.github.io/SpotiTop50/redirected.html&scope=user-read-private%20user-read-email&response_type=token&state=123&show_dialog=true"; // Your redirect uri
  var scope = 'playlist-read-private';
  var url = "https://accounts.spotify.com/authorize?"
  url = url + client_id + redirect_uri;
  window.location = url;

}

goToAuth();
