//const fetch = require('node-fetch');

//let spotiData = [];
//var tag = "BQAvz-WDLTzD8unRETEqXPezH2omiZXsY83SdUKN_Whjspr9IfmfvnJS0pjH58vkKtcWMs5g5DbbLomyeEazNV_hvVFIqSbdCYHs0-z7bigCEzqN0fs9jeVtZxohMIiqQWts_taPMFRStTbltYBnD6xqty9hHymHvM8";

var tag = "";

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
  console.log(access_token);
  return access_token;
}

async function getUserPlaylists(input){
    const url = input;
    const options = {
      headers: {
        Authorization: "Bearer ".concat(tag)
      }
    };

    const result = fetch(url,options)
      .then(result => result.json())
      return result;
}

async function getPlaylistIdFromUsersPlaylists(item) {
  var temp = [];
  item.forEach(async function(it){
    await temp.push(it['id']);
  });
  return temp;
}

async function getAllTracks(playlists) {
  var temp = [];
  await Promise.all(playlists.map(async (playlist) => {
      var result = await getPlaylistTracks("https://api.spotify.com/v1/playlists/"+playlist+"/tracks");
      temp.push(...Object.values(result)[1]);

      while(result['next'] !== null){
        let temp2 = await getPlaylistTracks(result['next']);
        temp.push(...Object.values(temp2)[1]);
        result = temp2;
      }
  }));
  return temp;
}

async function getPlaylistTracks(link) {
  const url = link;
  const options = {
    headers: {
      Authorization: "Bearer ".concat(tag)
    }
  };

  const result = fetch(url,options)
    .then(result => result.json())
    return result;
}


async function getAllArtists(tracklist){
  var map = new Map();

  tracklist.forEach(function(track){

    //get all artists
    var trackArtists = track['track']['artists'];

    //for all artists
    trackArtists.forEach(function(artist){

      //if artist is in hashMap add +1 to key
      if(map.has(artist['id'])){
        map.set(artist['id'], map.get(artist['id'])+1);

      //else add new artists with value 1
      }else {
        map.set(artist['id'], 1);
      }
    })
  })
  return map;
}

async function createDataFromMap(map){
  var ret = [];
  for (let [id, value] of map) {
    ret.push({id: id, value: value});
  }

  ret.sort(function(a,b) {
    if (a['value'] > b['value']) {
      return -1;
    }
    if (a['value'] < b['value']) {
      return 1;
    }
    return 0;
  });

  return ret.slice(0,30);
}

async function getNamesAndImages(ids) {
  var temp = [];
  await Promise.all(ids.map(async (id) => {

      var result = await getArtist("https://api.spotify.com/v1/artists/"+id['id']);
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

async function getArtist(link) {
  const url = link;
  const options = {
    headers: {
      Authorization: "Bearer ".concat(tag)
    }
  };

  const result = fetch(url,options)
    .then(result => result.json())
    return result;
}



const main = async () => {
  console.log("hej");

  //getTag
  tag = await getTag();

  console.log(tag);
  console.log("hEJ2");

  //get all user playlists in an array of playlists
  var listsOfPlaylists = [];
  let temp = await getUserPlaylists("https://api.spotify.com/v1/users/juliusraphael/playlists");
  listsOfPlaylists.push(...Object.values(temp)[1]);
  console.log("temp" + temp);

  while(temp['next'] !== null){
    let temp2 = await getUserPlaylists(temp['next']);
    listsOfPlaylists.push(...Object.values(temp2)[1]);
    temp = temp2;
  }

  //get all playlist ids in an array
  var playlists = await getPlaylistIdFromUsersPlaylists(listsOfPlaylists);
  console.log("playlists" + playlists);


  //for all playlists get all tracks in each playlist
  var tracks = await getAllTracks(playlists);
  console.log("tracks" + tracks);


  //get all artitst from tracks and put in hashmap
  var artistsHashmap = await getAllArtists(tracks);
  console.log("artistsHashmap" + artistsHashmap);

  var ids = await createDataFromMap(artistsHashmap);
  console.log("ids: " + ids);

  var data = await getNamesAndImages(ids);
  console.log("data" + data);

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

  var radiusScale = d3.scaleSqrt().domain([minDomain,maxDomain]).range([10,100]);

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
