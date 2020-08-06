//const fetch = require('node-fetch');
var tag = "";

/**
 * Gets the access token from the url
 * @returns {string} with access token in it
 */

async function getTag(){

  async function getHashParams() {
    var hashParams = {};
    var e, r = /([^&;=]+)=?([^&;]*)/g,
        q = window.location.hash.substring(1);
    while ( e = r.exec(q)) {
       hashParams[e[1]] = decodeURIComponent(e[2]);
    }
    return hashParams;
  };

  var params = await getHashParams();

  var access_token = params.access_token;
  return access_token;
}


/**
 * @param {string} endpoint fetches data at endpoint
 * @returns {string} result as parsed json
 */
async function fetchData(endpoint){
    const url = endpoint;
    const options = {
      headers: {
        Authorization: "Bearer ".concat(tag)
      }
    };

    const result = fetch(url,options)
      .then(result => result.json())
      return result;
}

//
/**
 * Extracts all the playlist ids
 * @param {array} lists a list of playlists
 * @returns {array} temp a list of list ids
 */
async function getPlaylistIdFromUsersPlaylists(lists) {
  var temp = [];
  lists.forEach(async function(list){
    await temp.push(list['id']);
  });
  return temp;
}

/**
 * Gets all tracks from all playlists
 * @param {array} playlist a list of playlist ids
 * @returns {array} temp all tracks in playlists
 */
async function getAllTracks(playlists) {
  var temp = [];
  await Promise.all(playlists.map(async (playlist) => {
      var result = await fetchData("https://api.spotify.com/v1/playlists/"+playlist+"/tracks");
      temp.push(...Object.values(result)[1]);

      while(result['next'] !== null){
        let temp2 = await fetchData(result['next']);
        temp.push(...Object.values(temp2)[1]);
        result = temp2;
      }
  }));
  return temp;
}

async function getAllArtists(tracklist){
  var map = new Map();

  tracklist.forEach(function(track){

    //get all artists
    if(track['track'] != null){

      //for all artists of track
      var trackArtists = track['track']['artists'];
      trackArtists.forEach(function(artist){

        //if artist is in hashMap add +1 to key
        if(map.has(artist['id'])){
          map.set(artist['id'], map.get(artist['id'])+1);

        //else add new artists with value 1
        }else {
          map.set(artist['id'], 1);
        }

      })
    }
  })
  return map;
}

async function createDataFromMap(map){
  var ret = [];
  for (let [id, value] of map) {
    ret.push({id: id, value: value});
  }

  //Sorts
  ret.sort(function(a,b) {
    if (a['value'] > b['value']) {
      return -1;
    }
    if (a['value'] < b['value']) {
      return 1;
    }
    return 0;
  });


  if(ret.length > 30 ){
    return ret.slice(0,30);
  } else {
    return ret;
  }

}

async function getNamesAndImages(ids) {
  var temp = [];
  await Promise.all(ids.map(async (id) => {

      var result = await fetchData("https://api.spotify.com/v1/artists/"+id['id']);
      if(result.hasOwnProperty('images')){
        temp.push({'id': id['id'], 'name': result['name'], 'value': id['value'], 'image': result['images'][0]});
        console.log(result);
      }

  }));

  temp.sort(function(a,b) {
    if (a['value'] > b['value']) {
      return -1;
    }
    if (a['value'] < b['value']) {
      return 1;
    }
    return 0;
  });
  return temp;
}

const main = async () => {
  //get tag from URL
  tag = await getTag();

  //get all user playlists in an array of playlists
  var listsOfPlaylists = [];
  let temp = await fetchData("https://api.spotify.com/v1/me/playlists");
  listsOfPlaylists.push(...Object.values(temp)[1]);
  //keeps getting lists while there is more lists
  while(temp['next'] !== null){
    let temp2 = await fetchData(temp['next']);
    listsOfPlaylists.push(...Object.values(temp2)[1]);
    temp = temp2;
  }

  //get all playlist ids in an array
  var playlists = await getPlaylistIdFromUsersPlaylists(listsOfPlaylists);


  //for all playlists get all tracks in each playlist
  var tracks = await getAllTracks(playlists);

  //get all artitst from tracks and put in hashmap
  var artistsHashmap = await getAllArtists(tracks);

  var ids = await createDataFromMap(artistsHashmap);

  var data = await getNamesAndImages(ids);

  createChart(data);

  return data;

};

async function createChart(data){
  const DATA = data;

  var width = 800;
  var height = 800;

  var maxDomain = data[0]['value'];
  var minDomain = data[data.length-1]['value'];

  var simulation = d3.forceSimulation()
    .force("x", d3.forceX(width / 2).strength(0.05))
    .force("y", d3.forceY(height / 2).strength(0.05))
    .force("collide", d3.forceCollide(function(d) {
      return radiusScale(d.value);
    }));

  var radiusScale = d3.scaleSqrt().domain([minDomain,maxDomain]).range([30,100]);

  const svg = d3.select('svg')
    .classed('container', true);

  var defs = svg.append('defs');

  defs.selectAll('.artist-pattern')
    .data(DATA)
    .enter().append('pattern')
    .attr('class', 'artist-pattern')
    .attr('id', function(d){
      return d.id;
    })
    .attr('height', '100%')
    .attr('width', '100%')
    .attr('patternContentUnits', 'objectBoundingBox')
    .append('image')
    .attr('height', 1)
    .attr('width', 1)
    .attr('preserveAspectRatio', 'none')
    .attr('xlink:href', function(d){
      return d.image.url;
    });


  var circles = svg.selectAll(".bar")
    .data(DATA)
    .enter()
    .append("circle")
    .attr('r', function(d){
      return radiusScale(d.value)
    })
    .attr('fill', function(d){
      return "url(#"+ d.id +")";
    });

  simulation.nodes(DATA)
    .on('tick', ticked);

  function ticked(){
    circles
      .attr('transform', function(d){
        return "translate(" + d.x + "," + d.y + ")";
      })
  }
}
main();
