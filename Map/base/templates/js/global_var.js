var auth ="{% url 'auth' %}";
var leaderboard = "{% url 'leaderboard' %}";
var pledge = "{% url 'pledge' %}";
var find_census_block = "{% url 'find_census_block' %}";
var census_blocks = "{% url 'census_blocks' %}";
var email_entry = "{% url 'email_entry' %}";

var floor_url = "{{STATIC_URL}}img/floor.jpg";
var toner_map = "{{STATIC_URL}}img/1139.gif";
var fb_screenshot_url = "https://s3.amazonaws.com/chicagoEnergy/facebook_screenshot_128.png";
var neighborhood_url = "{% url 'neighborhoods' %}";
//var social_media = "{{social_media}}";
var facebook_app_id = "{{FACEBOOK_APP_ID}}";

var compass_img = "{{STATIC_URL}}main/img/compass.png";
var lake_img = "{{STATIC_URL}}main/img/lakeMichigan.jpg";

var census_latlon = null;



var loadBarJSON = document.getElementById('loadBarInner');
var sourceJSON;

function loadJSON() {
  // make loadBar skinny again
  loadBarJSON.style.width = "1px";
  // fade loadBar in
  TweenLite.to($('#loadBar'), .25, {autoAlpha:1});

  var queueJSON = new createjs.LoadQueue(false);
  queueJSON.addEventListener("progress", handleJSONProgress);
  queueJSON.addEventListener("complete", handleJSONComplete);
  queueJSON.loadManifest([
     { src: sourceJSON }
  ]);

  function handleJSONProgress(event) {
    // use event.loaded to get the percentage of the loading
    loadBarJSON.style.width = Math.ceil(event.progress * 300) + "px";
  }

  function handleJSONComplete() {
    console.log('JSON loaded');
    TweenLite.to($('#loadBar'), .25, {autoAlpha:0, overwrite: false});
  }
}
