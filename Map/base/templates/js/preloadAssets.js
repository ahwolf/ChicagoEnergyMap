var loadBar = document.getElementById("loadBarInner");
document.getElementById('loadBar').style.opacity = 1;

var queue = new createjs.LoadQueue(false);
queue.addEventListener("complete", handleComplete);
queue.addEventListener("progress", handleProgress);
queue.loadManifest([
   //{src:"./js/app_preload.js"} // got rid of id: "my_js",

   // img
   {src:"{{STATIC_URL}}img/branding.png"},
   {src:"{{STATIC_URL}}img/checkIcon.png"},
   {src:"{{STATIC_URL}}img/chiStar.png"},
   {src:"{{STATIC_URL}}img/facebook.png"},
   {src:"{{STATIC_URL}}img/floor.jpg"},
   {src:"{{STATIC_URL}}img/fourGreyStars.png"},
   {src:"{{STATIC_URL}}img/google.png"},
   {src:"{{STATIC_URL}}img/key.png"},
   {src:"{{STATIC_URL}}img/locationPin.png"},
   {src:"{{STATIC_URL}}img/searchButton.png"},
   {src:"{{STATIC_URL}}img/searchIcon.png"},
   {src:"{{STATIC_URL}}img/selectArrow.png"},
   {src:"{{STATIC_URL}}img/starsTipsHeader.png"},
   {src:"{{STATIC_URL}}img/tooltipCarrot.png"},
   {src:"{{STATIC_URL}}img/twitter.png"},
   {src:"{{STATIC_URL}}img/1139.gif"},
   // js
   {src:"http://cdnjs.cloudflare.com/ajax/libs/gsap/latest/plugins/CSSPlugin.min.js"},
   {src:"http://cdnjs.cloudflare.com/ajax/libs/gsap/latest/easing/EasePack.min.js"},
   {src:"http://cdnjs.cloudflare.com/ajax/libs/gsap/latest/TweenLite.min.js"},
   {src:"http://cdnjs.cloudflare.com/ajax/libs/stats.js/r11/Stats.min.js"},

   //{src:"{{STATIC_URL}}common/js/lib/threejs/three.min.js"},
   {src:"http://cdnjs.cloudflare.com/ajax/libs/d3/2.10.0/d3.v2.min.js"},
   {src:"{{STATIC_URL}}js/d3-threeD.js"},
   {src:"{{STATIC_URL}}js/colorbrewerChi.js"},
   {src:"http://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.3.3/underscore-min.js"},
   {src:"{{STATIC_URL}}js/jquery.better-autocomplete.js"},
   {src:"{{STATIC_URL}}js/neighborhood_new.js"},
]);

function handleProgress(event) {
  //use event.loaded to get the percentage of the loading
  loadBar.style.width = Math.ceil(event.progress * 300) + "px";
  //console.log("loading");
}

var appQueue;

function handleComplete() {
  // load app js stuff only when other assets are loaded
  appQueue = new createjs.LoadQueue(false);
  appQueue.addEventListener("complete", handleAppQueueComplete);
  //console.log("completed");
  appQueue.loadManifest([
     {src:"{{STATIC_URL}}js/google_api.js"},
     {src:"{{STATIC_URL}}js/app_old.js"},
     {src:"{{STATIC_URL}}js/site.js"},

  ]);
}

function handleAppQueueComplete() {
//  console.log('app js loaded');
}

// i guess this isn't necessary anymore
// var myjs = queue.getResult("my_js");
// var head= document.getElementsByTagName('head')[0];
// var script= document.createElement('script');
// script.type= 'text/javascript';
// script.src= myjs;
// head.appendChild(script);