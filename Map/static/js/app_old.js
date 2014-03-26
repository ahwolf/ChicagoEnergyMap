// safari check
var isSafari = /Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor);
if (isSafari && !webgl_detect()) {
  TweenLite.to($('#safariModal'), .25, {autoAlpha:1})
}

// get rid of loadBar
TweenLite.to($('#loadBar'), .25, {autoAlpha:0})
TweenLite.to($('#wrapper'), .25, {autoAlpha:1})

// Clear out extra space in the body, don't let scrollbars show
document.body.style.margin = 0;
document.body.style.padding = 0;
document.body.style.overflow = 'hidden';
document.body.style.background = "#000";

var main = this;

var color_range = colorbrewer.Greys[9];

var albers = d3.geo.albers()
    .scale(80000)
    .origin([-87.63073,41.836084])
    .translate([400,400]);

var path = d3.geo.path().projection(albers);
var data = neighborhood; // census_block
// var data = census_tract;
//console.log("Here is the data:",data);
// three.js & d3 vars
var camera, scene, renderer, geometry, material, mesh;
var mouse = { x: 0, y: 0 }, INTERSECTED;
var plane;
var camYPos = 270;
var geons = {};
var appConstants  = {

    TRANSLATE_0 : 0,
    TRANSLATE_1 : 0,
    SCALE : 80000,
    origin : [-87.63073,41.836084]
}

var neighborhoods = [];
var blocks = [];
var extrudeMultiplier = 1;

var radiusX = 1100;
var radiusZ = 1100;
var radiusHood = 1;

var currentAngle;

// check to see if there's a stored value & set currentAngle accordingly
var storedValue = parseFloat(localStorage.getItem('angle'));
if (storedValue) currentAngle = storedValue;
else currentAngle = Math.PI * .5;

localStorage.setItem('angle', currentAngle);

var angleStep = 0;


// camera position vars
var camPosX;
var camPosY = 10;
var camPosZ;

// lookAt vars
var la = new THREE.Object3D();
var laX;
var laY;
var laZ;

var currentState = "city";
var oldcurrentState = "city";
var currentRollover;
var currentCentroid;
var clickedNeighborhood;
var total_savings = 0;

var overFooter = true;
var overNav = true;
var mouseXPos;
var mouseYPos;
var rotating = false;
var keyAnimationOn = false;
var map;
var bounds;
var blocks;
var vis;


function initStaticGraphics() {
  // compass
  var mapImg = new THREE.MeshBasicMaterial({
      map:THREE.ImageUtils.loadTexture(toner_map)
  });
  mapImg.map.needsUpdate = true;

  
  var mapPlane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mapImg);
  mapPlane.overdraw = true;
  mapPlane.name = "floor";
  mapPlane.rotation.x = -Math.PI/2;
  mapPlane.position.y = 0;
  mapPlane.position.x = -44;
  mapPlane.position.z = 20;
  mapPlane.scale.x = 1456;
  mapPlane.scale.y = 1456;
  mapPlane.receiveShadow = true;  
  scene.add(mapPlane);

  // // lake
  // var lImg = new THREE.MeshBasicMaterial({
  //     map:THREE.ImageUtils.loadTexture('img/lakeMichigan.jpg')
  // });
  // lImg.map.needsUpdate = true;

  
  // var lPlane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), lImg);
  // lPlane.overdraw = true;
  // lPlane.name = "floor";
  // lPlane.rotation.x = -Math.PI/2;
  // lPlane.rotation.z = .33;
  // lPlane.position.y = 10;
  // lPlane.position.x = 100;
  // lPlane.position.z = -80;
  // lPlane.scale.x = 90;
  // lPlane.scale.y = 365;
  // scene.add(lPlane);

}

// this file contains all the geo related objects and functions
geons.geoConfig = function() {
    this.TRANSLATE_0 = appConstants.TRANSLATE_0;
    this.TRANSLATE_1 = appConstants.TRANSLATE_1;
    this.SCALE = appConstants.SCALE;
    this.origin = appConstants.origin;

    this.mercator = d3.geo.mercator();
    var wtf = this;
    this.albers = d3.geo.albers()
    .scale(wtf.SCALE)
    .origin(wtf.origin)
    .translate([wtf.TRANSLATE_0,wtf.TRANSLATE_1]);
    
    this.path = d3.geo.path().projection(this.albers);
}

// geoConfig contains the configuration for the geo functions
var geo = new geons.geoConfig();

// three.js setup
function initScene() {

  scene = new THREE.Scene();
  var WIDTH = window.innerWidth, HEIGHT = window.innerHeight;
  var VIEW_ANGLE = 55, NEAR = 1, FAR = 10000; // VIEW_ANGLE = 45
  projector = new THREE.Projector();

  // create a WebGL renderer, camera, and a scene
  renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.shadowMapEnabled = true;
  renderer.shadowMapSoft = true;

  camera = new THREE.PerspectiveCamera( VIEW_ANGLE, WIDTH / HEIGHT, NEAR, FAR );
  camPosX = Math.cos(currentAngle) * radiusX * .5;
  camPosY = camYPos;
  camPosZ = Math.sin(currentAngle) * radiusZ * .5;
  
  // add and position the camera at a fixed position
  scene.add(camera);
  camera.lookAt( scene.position );
  
  // start the renderer, and white background
  renderer.setSize(WIDTH, HEIGHT);
  renderer.setClearColor( 0x000000, 1 );
  
  // add the render target to the page
  $("#container").append(renderer.domElement);

  var darkness = 0.75;

  // add one light above to cast shadow & 4 periperal lights around scene
  addSpotLightAbove(-40, 1000, 100);
  addPeripheralSpotlight(-500, 0, 0);
  addPeripheralSpotlight(500, 0, 0);
  addPeripheralSpotlight(0, 0, -500);
  addPeripheralSpotlight(0, 0, 500);
  
  // add a base plane on which we'll render our map
  var planeGeo = new THREE.PlaneGeometry(1250, 1250, 10, 10);
  var planeTex = THREE.ImageUtils.loadTexture(floor_url);//floor_url);
  planeTex.wrapS = planeTex.wrapT = THREE.RepeatWrapping;
  planeTex.repeat.set( 10, 10 );
  planeMat = new THREE.MeshBasicMaterial( { map: planeTex } ); // use jpg texture to get shadows we want
  // planeMat.opacity = 0;
  plane = new THREE.Mesh(planeGeo, planeMat);

  // rotate plane to correct position
  plane.rotation.x = -Math.PI/2;
  plane.receiveShadow = true;
  plane.position.y = 0;
  plane.name = "floor";
  // scene.add(plane);
}

function addSpotLightAbove(x, y, z, shadow) {
  var spotLight = new THREE.SpotLight(0xFFFFFF);
  spotLight.position.set( x, y, z );
  spotLight.castShadow = true;
  spotLight.shadowDarkness = .4;
  spotLight.intensity = 1.1;
  // spotLight.shadowCameraVisible = true;
  scene.add(spotLight);
}

function addPeripheralSpotlight(x, y, z) {
  var spotLight = new THREE.SpotLight(0xFFFFFF, .35);
  spotLight.position.set( x, y, z );
  spotLight.intensity = .35;
  //spotLight.castShadow = true;
  //spotLight.shadowDarkness = .5;
  //spotLight.shadowCameraVisible = true;
  scene.add(spotLight);
}

// add the loaded gis object (in geojson format) to the map
function addGeoObject() {

    if (currentState !== "Nothing"){
        NProgress.set(.8);
    }

    // Show the loader at the beginning of this function
    $("#container").addClass("grayscaleAndLighten");
    TweenLite.to($('#overlay'), .5, {autoAlpha: .88, delay: 0});
    TweenLite.to($('#loader_gif'), 0, {autoAlpha: 1, delay: 0});
    
    // calculate the max and min of all the property values
    var gas_eff_min_max = d3.extent(data.features, function(feature){
        return feature.properties.gas_rank;
    });

    var elec_eff_min_max = d3.extent(data.features, function(feature){
        return feature.properties.elect_rank;
    });
  // convert to mesh and calculate values
  _.each(data.features, function (geoFeature) {
    var feature = geo.path(geoFeature);
    var centroid = geo.path.centroid(geoFeature);

    // we only need to convert it to a three.js path
    mesh = transformSVGPathExposed(feature);
    // the two different scales that we use, extrude determines
    // the height and color is obviously color. You can choose
    // from the max_min that we calculated above, ensure this
    // matches with below where you call these functions.

    var color_scale = d3.scale.quantile()
    //var color_scale = d3.scale.ordinal()
      .domain(gas_eff_min_max)
      //.range([ 'red', 'blue', 'purple']);
      .range(color_range);

    var extrude_scale = d3.scale.linear()
      .domain(elec_eff_min_max)
      .range([1, 60]);

    // create material color based on gas efficiency Ensure the
    // property matches with the scale above, we'll add automatic
    // matching functionality later

    // First check if this is the chosen census block
    if (geoFeature.properties.chosen){
       var hexMathColor = parseInt("0x900800");
    }

    else if (geoFeature.properties.gas_rank === 0){
       var hexMathColor = parseInt("0x002200");
       var is_transparent = true;
       var transparency = .65;
       // material.depthWrite = false;
    }	
    else{
       var mathColor = color_scale(geoFeature.properties.gas_rank);
       var hexMathColor = parseInt(mathColor.replace("#", "0x"));
       var is_transparent = true;
       var transparency = .85;
    } 

    material = new THREE.MeshLambertMaterial({
      color: hexMathColor,
      transparent: is_transparent,
      opacity: transparency
    });

    // create extrude based on electricity efficiency
    var extrude = extrude_scale(geoFeature.properties.elect_rank);

    // Add the attributes to the mesh for the height of the polygon
    var shape3d = mesh.extrude({
      amount: Math.round(extrude * extrudeMultiplier),
      bevelEnabled: false
    });

    // create a mesh based on material and extruded shape
    var hoodMesh = new THREE.Mesh(shape3d, material);
    // rotate and position the elements nicely in the center
    hoodMesh.rotation.x = Math.PI / 2;
    hoodMesh.translateY(extrude / 2);

    // zero all y positions of extruded objects
    hoodMesh.position.y = extrude * extrudeMultiplier;
    hoodMesh.properties = geoFeature.properties;
    hoodMesh.properties.shape = geoFeature.geometry.coordinates[0]
    hoodMesh.castShadow = true;
    hoodMesh.receiveShadow = false;
    hoodMesh.properties.centroid = centroid;

    var obj = {}
    obj.shape3d = shape3d;
    obj.material = material;
    obj.extrude = extrude  * extrudeMultiplier;
    obj.mesh = hoodMesh;
    obj.props = hoodMesh.properties;
    neighborhoods.push(obj);
    hoodMesh.name = hoodMesh.properties.name;

    // add to scene
    scene.add(hoodMesh);
  });

  // Remove the loader gif at the end of this function
  TweenLite.to($('#overlay'), .5, {autoAlpha: 0});
  TweenLite.to($('#loader_gif'), .5, {autoAlpha: 0});
  TweenLite.delayedCall(.5, colorizeMap);
  TweenLite.delayedCall(2, turnKeyAnimationOn);
  TweenLite.to($('#key'), .125, {autoAlpha:1});
  TweenLite.to($('#rotateWrapper'), .125, {autoAlpha:1});
  
}

function turnKeyAnimationOn() {
  keyAnimationOn = true;
}



// ***** AARON CODE!!
function drawmap(shape){
  if (google_map !== ""){
    // first remove the overlay from the map
      chicagoOverlay.setMap(null);
      var shape_coords = [];

      // Push the shape to show on the map
      _.each(shape, function(item){
        shape_coords.push(new google.maps.LatLng(item[1],item[0]));
      });
      // var shape_coords = [
      // new google.maps.LatLng(41.836084, -87.63073),
      // new google.maps.LatLng(41.836084, -87.59073),
      // new google.maps.LatLng(41.876084, -87.59073),
      // new google.maps.LatLng(41.876084, -87.63073),
      // new google.maps.LatLng(41.836084, -87.63073)
      // ];

      chicagoOverlay = new google.maps.Polygon({
        paths: shape_coords,
        strokeColor: '#FF0000',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#FF0000',
        fillOpacity: 0.35
    });
      chicagoOverlay.setMap(google_map);
  }
}


function render() {


  if (currentState == 'city') {
    camera.lookAt(scene.position);
  } else {
    la.x = laX;
    la.y = laY;
    la.z = laZ;
    camera.lookAt( la );
  }

  camera.position.x = camPosX;
  camera.position.y = camPosY;
  camera.position.z = camPosZ;


  //////////////////////////////
  ///* BEGIN ROLLOVER LOGIC *///
  //////////////////////////////
  var vector = new THREE.Vector3( mouse.x, mouse.y, 1 );
  projector.unprojectVector( vector, camera );
  var raycaster = new THREE.Raycaster( camera.position, vector.sub( camera.position ).normalize() );
  var intersects = raycaster.intersectObjects( scene.children );

  if (intersects.length > 0 && currentState == "city" && !overFooter || currentState == "neighborhood" && !overFooter) {
    if ( INTERSECTED !== intersects[ 0 ].object ) {
      if ( INTERSECTED && INTERSECTED.name !== "floor" ) {
        INTERSECTED.material.color.setHex( INTERSECTED.currentHex );
        INTERSECTED.material.opacity = .85;
      }
      INTERSECTED = intersects[ 0 ].object;

      // if mouse is intersecting the floor, fade out tooltip
      if (INTERSECTED.name == "floor") {
        TweenLite.to(rolloverTip, .25, {autoAlpha:0});
        return;
      }

      TweenLite.to(rolloverTip, .25, {autoAlpha:1})
      INTERSECTED.currentHex = INTERSECTED.material.color.getHex();
      INTERSECTED.material.color.setHex( 0x00a6e3 );
      INTERSECTED.material.opacity = .95;

      // log which object is beneath the mouse
      currentRollover = INTERSECTED.name;
      currentCentroid = INTERSECTED.properties.centroid;
      drawmap(INTERSECTED.properties.shape);
      var max_rank = data.features.length;
      if (currentState == "neighborhood"){
	  $("#neighborhoodText").html(INTERSECTED.properties.nice.replace(/ [S|N|W|E] /, " Block of "));
	  $("#tipSubHead").html("energy use / sqft");


    if (INTERSECTED.properties.gas_rank === 0){
        $("#detailText").html("(no data -- neighborhood average)");
    }
    else{
      $("#detailText").html("");
    }
    
    $("#tipGasRankText").html(INTERSECTED.properties.gas_efficiency.toFixed(2) + " th");
    $("#tipElectricRankText").html(INTERSECTED.properties.elect_efficiency.toFixed(2) + " kWh");
    
 //    if (INTERSECTED.properties.elect_efficiency === 0){
 //      $("#tipElectricRankText").html("N/A");
 //    }
 //    else{

	// }
 //      $("#detailText").html("");
      }
      else if (currentState == "city"){
	  $("#neighborhoodText").html(INTERSECTED.name);
	  $("#tipSubHead").html("Efficiency Rank");
	  $("#tipGasRankText").html(INTERSECTED.properties.gas_rank + " / " + max_rank);
	  $("#tipElectricRankText").html(INTERSECTED.properties.elect_rank + " / " + max_rank);
	  $("#detailText").html("• CLICK FOR DETAIL •");
      }

    }

  } else {
    

        TweenLite.to(rolloverTip, .25, {autoAlpha:0})

    // change color of object on rollover only if it's not the floor
    if (INTERSECTED && INTERSECTED.name == "floor") {
      INTERSECTED = null;
      return;
    }

    if ( INTERSECTED ) {
      INTERSECTED.material.color.setHex( INTERSECTED.e );
    }

    currentRollover = "";
    INTERSECTED = null;


    // TweenLite.to(rolloverTip, .25, {autoAlpha:0});
    // currentRollover = "";  

    // if ( INTERSECTED && INTERSECTED.name !== "floor" ) {
    //   INTERSECTED.material.emissive.setHex( INTERSECTED.currentHex );
    // }

    // // change color of object on rollover only if it's not the floor
    // if (INTERSECTED && INTERSECTED.name == "floor") {
    //   INTERSECTED = null;
    // }


    // currentRollover = "";
    // INTERSECTED = null;

  }

  // AARON CODE FOR TWEENING THE TOTAL
  $("#total_savings").html(total_savings.toFixed());

  ////////////////////////////
  ///* END ROLLOVER LOGIC *///
  ////////////////////////////

  renderer.render( scene, camera );
}

function disappearCity(clickedHood) {
  //var obj = neighborhoods[59];

  // currentState = "neighborhood";

  TweenLite.to(rolloverTip, .25, {autoAlpha:0});


  var i;
  var totalNeighborhoods = neighborhoods.length;
  var delay = 1/256;
  var time = .5;
  var totalTime = time + totalNeighborhoods * delay + .25;

  for (i = totalNeighborhoods - 1; i >=0; i--)
  {
    var obj = neighborhoods[i];
    TweenLite.to(obj.mesh.scale, time, {z:.01, ease:Expo.easeOut, delay: i * delay})
    TweenLite.to(obj.mesh.position, time, {y:obj.extrude * .01, ease:Expo.easeOut, overwrite:false, delay: i * delay});
    if (clickedNeighborhood !== obj.props.name) TweenLite.to(obj.material, time, {opacity:0, delay:.25 + i * delay, onComplete: cleanUpNeighborhood, onCompleteParams: [obj]});
    else TweenLite.to(obj.material, time, {opacity:0, delay:.25 + i * delay + .75, onComplete: cleanUpNeighborhood, onCompleteParams: [obj]});
    // TweenLite.to(obj.material, time, {opacity:0, delay:.25 + i * delay});
    // TweenLite.delayedCall(25 + i * delay, cleanUpNeighborhood, [obj]);
  }

  TweenLite.delayedCall(totalTime - .5, greyContainer);
  TweenLite.to($("#branding"), .25, {autoAlpha:0, delay:totalTime - 1});
  TweenLite.to($("#addressField"), .25, {autoAlpha:0, delay:totalTime - 1});
  // TweenLite.to($("#key"), .25, {autoAlpha:0, delay:totalTime - 1});
  TweenLite.to($("#footer"), .25, {autoAlpha:0, delay:totalTime - 1});
  TweenLite.to($("#hoodContainer"), .25, {autoAlpha:1, delay:totalTime - 1});
  TweenLite.to($("#container"), .25, {autoAlpha:0, delay:totalTime - .25});
  TweenLite.delayedCall(totalTime - .25, growNeighborhoodDetail);

}

function cleanUpNeighborhood(obj) {
  scene.remove(obj.mesh);
  // clean up
  obj.shape3d.dispose();
  obj.material.dispose();
  delete obj.mesh;
}

function create2Dmap(){
  
    map = new L.Map('mapContainer', {
        center: [data.centroid[1],data.centroid[0]],
        zoom: 14,
        zoomAnimation: false,
        inertia: false,
        keyboard: false,
        attributionControl: true,
    })

    map.dragging.disable();
    map.touchZoom.disable();
    map.doubleClickZoom.disable();
    map.scrollWheelZoom.disable();

    // stamen 'toner' tiles
    var layer = new L.StamenTileLayer('toner');
    map.addLayer(layer);

    var map_svg = d3.select(map.getPanes().overlayPane).append('svg'),

    g = map_svg.append("g").attr("class", "leaflet-zoom-hide");

    bounds = d3.geo.bounds(data);
    var path_2D = d3.geo.path().projection(project);
    
    var gas_eff_min_max = d3.extent(data.features, function(feature){
        return feature.properties.gas_rank;
    });

    var color_scale = d3.scale.quantile()
      .domain(gas_eff_min_max)
      .range(color_range);

    blocks = g.selectAll("path")
      .data(data.features);

    var numBlocks = data.features.length;

    blocks.enter().append("path")
      .attr('fill', function(d){
        //console.log(d.properties)
        // if chosen, return a special color
        if (d.properties.chosen){
            return '#e80619';
        }
        // if zero, just return grey scale
        else if (d.properties.gas_rank === 0){
            return color_scale(gas_eff_min_max[1]/2)
        }
        // else use the typical color scale
        else{

            return color_scale(d.properties.gas_rank);
        }
    })
    .attr('stroke',"white")
    .attr("fill-opacity",.8)
    .attr("d", path_2D)

    .on("mouseover", function(d){

      var chosenCensus = d3.select(this);
      chosenCensus.attr("fill", "#00a6e3")

      TweenLite.to(rolloverTip, 0, {autoAlpha:1})

      // log which object is beneath the mouse
      drawmap(d.geometry.coordinates);

      $("#neighborhoodText").html(d.properties.nice.replace(/ [S|N|W|E] /, " Block of "));
      $("#tipSubHead").html("Energy use / sqft");


      if (d.properties.gas_rank === 0){
        $("#detailText").html("(No data -- neighborhood average)");
      }
      else{
        $("#detailText").html("");
      }
    
      $("#tipGasRankText").html(d.properties.gas_efficiency.toFixed(2) + " th");
      $("#tipElectricRankText").html(d.properties.elect_efficiency.toFixed(2) + " kWh");

      
    })
    .on("mouseout", function(d){
      var chosenCensus = d3.select(this);
      var energy_selector = $(".buttonContainer input[type='radio']:checked").val();
      chosenCensus.attr("fill", function(d){

        // if chosen, return a special color
        if (d.properties.chosen){
            return '#e80619';
        }
        // if zero, just return grey scale
        else if (d.properties.gas_rank === 0){
            return color_scale(gas_eff_min_max[1]/2)
        }
        // else use the typical color scale
        else{
            if (energy_selector == "gas"){
              return color_scale(d.properties.gas_rank);                
            }
            else{
              return color_scale(d.properties.elect_rank);
            }
        }
      })

      TweenLite.to(rolloverTip, 0, {autoAlpha:0})

    })

    map.on("viewreset", reset);
    reset();
    
    TweenLite.to($("#footer"), .25, {autoAlpha:1, delay:0.25});
    
    function reset() {
        var bottomLeft = project(bounds[0]),
        topRight = project(bounds[1]);
      
        map_svg.attr("width", topRight[0] - bottomLeft[0])
          .attr("height", bottomLeft[1] - topRight[1])
          .style("margin-left", bottomLeft[0] + "px")
          .style("margin-top", topRight[1] + "px");

        g.attr("transform", "translate(" + -bottomLeft[0] + "," + -topRight[1] + ")");

        blocks.attr("d", path_2D);
    }
    // Use Leaflet to implement a D3 geographic projection.
    function project(x) {
        var point = map.latLngToLayerPoint(new L.LatLng(x[1], x[0]));
        return [point.x, point.y];
    }

//   vis = d3.select("#wrapper")
//     .append("svg")
// //    .attr("viewbox", "200 200 800 800")//+ window.innerWidth+" "+window.innerHeight)
//     .attr("width", "100%")
//     .attr("height", "100%");

  // // Change the albers projection and path
  // var albers_2D = d3.geo.albers()
  //   .scale(800000)
  //   .origin([data.centroid[0],data.centroid[1]])
  //   .translate([400,400]);

  //var path_2D = d3.geo.path().projection(albers_2D);
  

  // calculate the max and min of all the property values
 
 NProgress.done(); 
}



// Use this function every time they change the gas / elect selector
function changeGasElectricLegend(type){
    // calculate the max and min of all the property values
    var gas_eff_min_max = d3.extent(data.features, function(feature){
        return feature.properties.gas_rank;
    });

    var color_scale = d3.scale.quantile()
      .domain(gas_eff_min_max)
      .range(color_range);

    if (type == 'electric'){
      var d3Blocks = d3.selectAll("path")
          .data(data.features);
      d3Blocks.transition().duration(100)
        .attr("fill", function(d){
            if (d.properties.chosen){
                return '#e80619';
            }
            // if zero, just return grey scale
            else if (d.properties.elect_rank === 0){
                return color_scale(gas_eff_min_max[1]/2)
            }
            // else use the typical color scale
            else{
                return color_scale(d.properties.elect_rank);
            }
        });
      }
    else{
      var d3Blocks = d3.selectAll("path")
        .data(data.features);
      d3Blocks.transition().duration(100)
        .attr("fill", function(d){
            if (d.properties.chosen){
                return '#e80619';
            }
            // if zero, just return grey scale
            else if (d.properties.gas_rank === 0){
                return color_scale(gas_eff_min_max[1]/2)
            }
            // else use the typical color scale
            else{
                return color_scale(d.properties.gas_rank);
            }
        })
    }

}

function growNeighborhoodDetail() {
  // data = census_block;
  extrudeMultiplier = .15;

  TweenLite.to($("#key"), .25, {autoAlpha:0})
  TweenLite.to($("#keyNeighborhood"), .25, {autoAlpha:1, delay:.25})

//  create2Dmap();


  // $("#neighborhoodText").html(d.name);
  // $("#tipGasRankText").html(d.properties.gas_rank + " / " + numBlocks);
  // $("#tipElectricRankText").html(d.properties.elect_rank + " / " + numBlocks);

  TweenLite.to($("#container"), .25, {autoAlpha:0})
}

function greyContainer() {
  $("#container").addClass("grayscaleAndLighten");
}

function colorizeContainer() {
  $("#container").removeClass("grayscaleAndLighten");
}

function removeBlocks() {
  var i;

  var totalNeighborhoods = neighborhoods.length;
  for (i = totalNeighborhoods - 1; i >= 0; i--)
  {
    var obj = neighborhoods[i];
    cleanUpNeighborhood(obj);
  }

  TweenLite.to($("#container"),.25,{autoAlpha:1});
  // tween camera position via camPosX/Y vars
  TweenLite.to(main, 2, {camPosX: cityCamPosX, camPosY:cityCamPosY, camPosZ: cityCamPosZ, ease:Quint.easeInOut});
  // tween lookAt position
  TweenLite.to(main, 1.5, {laX: cityLaX, laY:cityLaY, laZ: cityLaZ, delay:.5, ease:Quint.easeInOut, onComplete: setCurrentState, onCompleteParams: ["city", "resumeFlying"]});

  // kill the city

  TweenLite.delayedCall(1.5, reappearCity); 

  // TweenLite.delayedCall(.5, removeHelperFunction);
  // removeHelperFunction();
}

function removeHelperFunction (){
  TweenLite.to($("#container"),.25,{autoAlpha:1});
  // tween camera position via camPosX/Y vars
  TweenLite.to(main, 2, {camPosX: cityCamPosX, camPosY:cityCamPosY, camPosZ: cityCamPosZ, delay: 1.25, ease:Quint.easeInOut});
  // tween lookAt position
  TweenLite.to(main, 1.5, {laX: cityLaX, laY:cityLaY, laZ: cityLaZ, delay:1.75, ease:Quint.easeInOut, onComplete: setCurrentState, onCompleteParams: ["city", "resumeFlying"]});

  // kill the city

  TweenLite.delayedCall(1, reappearCity); 
}

function transition_neighborhood(){
  // tween camera position via camPosX/Y vars
  TweenLite.to(main, 2, {camPosX: cityCamPosX, camPosY:cityCamPosY, camPosZ: cityCamPosZ, ease:Quint.easeInOut});
  // tween lookAt position
  TweenLite.to(main, 1.5, {laX: cityLaX, laY:cityLaY, laZ: cityLaZ, delay:.5, ease:Quint.easeInOut, onComplete: setCurrentState, onCompleteParams: ["city", "resumeFlying"]});

  // kill the city
  // reappearCity();
  // TweenLite.delayedCall(.75, reappearCity); 

}
function reappearCity(clickedHood) {
  //var obj = neighborhoods[59];

  // TweenLite.to($("#container"), .125, {autoAlpha:0});
  // removeBlocks();
  // TweenLite.to($("#container"), .125, {autoAlpha:1});

  // fix up the google map
  var newCenter = new google.maps.LatLng(41.836084, -87.63073); // chicago
  google_map.setZoom(9);
  google_map.setCenter(newCenter);
  // clear neighborhoods array
  neighborhoods = [];

  // currentState = "neighborhood";
  data = neighborhood;
  extrudeMultiplier = 1;
  addGeoObject();

  // TweenLite.to(rolloverTip, .25, {autoAlpha:1});

  var i;
  var totalNeighborhoods = neighborhoods.length;
  var delay = 1/256;
  var time = .5;
  var totalTime = time + totalNeighborhoods * delay + .25;

  for (i = 0; i < totalNeighborhoods; i++)
  {

    var obj = neighborhoods[i];

    // initialize objects to flattened & invisible positions
    TweenLite.to(obj.mesh.scale, 0, {z:.01, ease:Expo.easeOut})
    TweenLite.to(obj.mesh.position, 0, {y:obj.extrude * .01, ease:Expo.easeOut, overwrite:false});
    TweenLite.to(obj.material, 0, {opacity:0});

    TweenLite.to(obj.mesh.scale, time, {z:1, ease:Expo.easeOut, delay: .25 + i * delay, overwrite:false})
    TweenLite.to(obj.mesh.position, time, {y:obj.extrude, ease:Expo.easeOut, overwrite:false, delay: .25 + i * delay, overwrite:false});
    TweenLite.to(obj.material, time, {opacity:1, delay:i * delay, overwrite:false});
  }

  TweenLite.to($("#hoodContainer"), .25, {autoAlpha:0});
  TweenLite.to($("#branding"), .25, {autoAlpha:1, delay:totalTime - 1});
  TweenLite.to($("#addressField"), .25, {autoAlpha:1, delay:totalTime - 1});
  TweenLite.to($("#key"), .25, {autoAlpha:1, delay:totalTime - 1});
  TweenLite.to($("#footer"), .25, {autoAlpha:1, delay:totalTime - 1});

  TweenLite.delayedCall(totalTime, setCurrentState, ["city"]);
}

function animate() {
  requestAnimationFrame( animate );
  render();
}

initScene();
addGeoObject();
animate();
initStaticGraphics();
//console.log(neighborhoods);
//renderer.render( scene, camera );


function pledge_return(response) {
    if (response.length !== 0) {

        var html = ""
        var total = 0;
        _.each(response, function(item) {
            total += item.savings;
            html += "<li><span class='pledge_name'>" + item.name + "</span> $<span class='pledge_savings'>" + item.savings + "</span><button class='tipButton'>I'LL DO THIS!</button></li>"
        });
        $("#tipsList").html(html);
        TweenLite.to(main, .5, {
                total_savings: 0
            });


        $(".tipButton").click(function() {
            var pledge_amount = parseInt($(this).siblings(".pledge_savings").text());
            if (!$(this).hasClass('tipButtonClicked')) {
                // add this pledge
                var new_savings = total_savings + pledge_amount;
                $(this).addClass("tipButtonClicked").removeClass(".tipButton");
            } else {
                // remove this pledge
                var new_savings = total_savings - pledge_amount;
                $(this).removeClass("tipButtonClicked").addClass(".tipButton");
            }
            // tween to the new value
            TweenLite.to(main, .5, {
                total_savings: new_savings
            });
        });


    } else {
        // nothing to display not sure what to do

    }
}

function check_neighborhood(){

  var address = document.getElementById("neighborhoodEntry").value.toLowerCase();

  if (neighborhood_object[address]){
    // Okay, now we just need to goto the neighborhood call server?
    currentRollover = neighborhood_object[address];

    var pledge_array = _.map($(".tipButtonClicked"), function(node){
        return $(node).siblings('.pledge_name').text();
    });
    var name = $(".tipButtonClicked").siblings('span').text();
    var subtype = $("#subtypeChoices").val();

    $.ajax({url: auth,
           data:{subtype:subtype,
               name: pledge_array,
               neighborhood:neighborhood_object[address]
           }
       })
    .done(return_from_pledge);

  }
  // Not a neighborhood, maybe a valid address?
  else{
    var geocoder = new google.maps.Geocoder();
    geocoder.geocode({'address':address}, function(results, status){
        var point = results[0].geometry.location
        lat_global = point.lat();
        lon_global = point.lng();
        var lat = lat_global;
        var lon = lon_global;
        $.ajax({
            url:find_census_block,
            data:{lat:lat,
              lon: lon},
              success:function(data){

                // If data is valid, then we have a census block otherwise
                // we have a bad search
                if (data !==""){
                    currentRollover = data;
                    var pledge_array = _.map($(".tipButtonClicked"), function(node){
                        return $(node).siblings('.pledge_name').text();
                    });
                    var name = $(".tipButtonClicked").siblings('span').text();
                    var subtype = $("#subtypeChoices").val();
                    $.ajax({url: auth,
                       data:{subtype:subtype,
                         name: pledge_array,
                         neighborhood:data
                     }
                    })
                    .done(return_from_pledge);

                }
                // reset the search value
                else{
                    var input = document.getElementById('neighborhoodEntry');
                    input.value = "";
                }
            }
        })
    });
  }
}

function return_from_pledge(response){
    // facebook twitter no thanks message
    TweenLite.to($('#socialModal'), .5, {autoAlpha: 1, delay: .375});

    // clear up the other stuff, get more things?
    var subtype = $("#subtypeChoices").val();
    $.ajax({url: pledge,
         data:{subtype:subtype}
     })
    .done(pledge_return);
}

function enter_email(){
// console.log("entered email section")
 var email = document.getElementById("emailEntry").value;
 if (validateEmail(email)){
 $.ajax({url: email_entry,
           data:{email:email,
           }
       })
    .done(function(response){
        // We had a success, lets say thanks for the pledge!
        // Make something visible
        $("#validContainer").css({"visibility":"hidden"});   
        $("#validAddress").html("Thank you, we will follow-up with additional information!");   

        TweenLite.to($('#validContainer'), .5, {autoAlpha: 1, delay: .375});
    });
 }
else{
  var input = document.getElementById('emailEntry');
  input.value = "";
  $("#validContainer").css({"visibility":"hidden"});
  $("#validAddress").html("Please enter a valid email address.");   
  TweenLite.to($('#validContainer'), .5, {autoAlpha: 1, delay: .375});

}
}


function validateEmail(email) { 
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}
////////////////// BUTTON ACTIONS //

$('.socialButton').click(function(){
    TweenLite.to($('#socialModal'), .5, {autoAlpha: 0, delay: .25});
});

$('#facebookButton').click(function(){
    window.open("http://www.facebook.com/share.php?u=http://cityofchicago.org/energymap",
                "_blank");
});

$('#twitterButton').click(function(){
    var address = document.getElementById("neighborhoodEntry").value.toLowerCase();
    var twitter_url = 'http://twitter.com/share?url=http://www.cityofchicago.org/energymap&text=';
    twitter_url +='"I just pledged to be more energy efficient on the Chicago Energy Data Map!"';
    twitter_url += "&hashtags=" + neighborhood_object[address].replace(/\s/g, '') + "&via=ChicagosMayor";
    //console.log("url: ", twitter_url);
    window.open(twitter_url,
                "_blank");
});



$("#aboutButton").click(function() {
  oldcurrentState = currentState;
  currentState = "overlay";
  $("#container").addClass("grayscaleAndLighten");
  if (oldcurrentState == "city"){
    TweenLite.to($('#branding'), .5, {autoAlpha: 0, delay: .25});
    TweenLite.to($('#addressField'), .5, {autoAlpha: 0, delay: .25});
  }
  //TweenLite.to($('#map_canvas'), .5, {autoAlpha: 0, delay: .25});
  TweenLite.to($('#overlay'), .5, {autoAlpha: 1, delay: .375});
  TweenLite.to($('#about'), .5, {autoAlpha: 1, delay: .375});
  TweenLite.to($('#keysWrapper'), .5, {autoAlpha: 0, delay: .25});
  TweenLite.to($('#rotateWrapper'), .5, {autoAlpha: 0, delay: .125});
  TweenLite.to($('#leaderboard'), .5, {autoAlpha: 0, delay: .125});
  TweenLite.to($('#moreinfo'), .5, {autoAlpha: 0, delay: .125});
  TweenLite.to($('#efficiencyTips'), .5, {autoAlpha: 0, delay: .125});

});

$("#emailButton").click(function() {
  oldcurrentState = currentState;
    //console.log("clicked!");
  currentState = "overlay";
  $("#container").addClass("grayscaleAndLighten");
  if (oldcurrentState == "city"){
      TweenLite.to($('#branding'), .5, {autoAlpha: 0, delay: .25});
      TweenLite.to($('#addressField'), .5, {autoAlpha: 0, delay: .25});
  }
  //TweenLite.to($('#map_canvas'), .5, {autoAlpha: 0, delay: .25});
  TweenLite.to($('#overlay'), .5, {autoAlpha: 1, delay: .375});
  TweenLite.to($('#moreinfo'), .5, {autoAlpha: 1, delay: .375});
  TweenLite.to($('#keysWrapper'), .5, {autoAlpha: 0, delay: .25});
  TweenLite.to($('#rotateWrapper'), .5, {autoAlpha: 0, delay: .125});
  TweenLite.to($('#leaderboard'), .5, {autoAlpha: 0, delay: .125});
  TweenLite.to($('#about'), .5, {autoAlpha: 0, delay: .125});
  TweenLite.to($('#efficiencyTips'), .5, {autoAlpha: 0, delay: .125});

});

$("#leaderboardButton").click(function() {
  oldcurrentState = currentState;
  currentState = "overlay";
  $("#container").addClass("grayscaleAndLighten");

  if (oldcurrentState == "city"){
      TweenLite.to($('#branding'), .5, {autoAlpha: 0, delay: .25});
      TweenLite.to($('#addressField'), .5, {autoAlpha: 0, delay: .25});
  }
  //TweenLite.to($('#map_canvas'), .5, {autoAlpha: 0, delay: .25});
  TweenLite.to($('#overlay'), .5, {autoAlpha: 1, delay: .375});
  TweenLite.to($('#leaderboard'), .5, {autoAlpha: 1, delay: .375});
  TweenLite.to($('#keysWrapper'), .5, {autoAlpha: 0, delay: .25});
  TweenLite.to($('#rotateWrapper'), .5, {autoAlpha: 0, delay: .125});
  TweenLite.to($('#moreinfo'), .5, {autoAlpha: 0, delay: .125});
  TweenLite.to($('#about'), .5, {autoAlpha: 0, delay: .125});
  TweenLite.to($('#efficiencyTips'), .5, {autoAlpha: 0, delay: .125});

  $.ajax({url: leaderboard})
    .done(function (leaders){
        var html = ""
        _.each(leaders, function(leader, index){
		html +=  "<li>"+leader[0]+' <div class="pledge">'+leader[1]+ ' / $'+ leader[2] + "</div></li>";
        });
        $("#board").html(html);
    });
});

$(".closeButton").click(function() {
  currentState = oldcurrentState;
  if (currentState == "city"){
      TweenLite.to($('#branding'), .5, {autoAlpha: 1, delay: .25});  
      TweenLite.to($('#addressField'), .5, {autoAlpha: 1, delay: .25});
      TweenLite.to($('#keysWrapper'), .5, {autoAlpha: 1, delay: .25});
      TweenLite.to($('#rotateWrapper'), .5, {autoAlpha: 1, delay: .25});
  }
  //TweenLite.to($('#map_canvas'), .5, {autoAlpha: 1, delay: .25});
  TweenLite.to($('#overlay'), .5, {autoAlpha: 0});
  TweenLite.to($('#about'), .5, {autoAlpha: 0});
  TweenLite.to($('#leaderboard'), .5, {autoAlpha: 0});
  TweenLite.to($('#moreinfo'), .5, {autoAlpha: 0});
  TweenLite.to($('#efficiencyTips'), .5, {autoAlpha: 0});
  TweenLite.to($('#neighborhoodEntry'), .5, {autoAlpha: 0});
  TweenLite.to($('#thankYou'), .5, {autoAlpha: 0});
  //TweenLite.to($('#validAddress'), .5, {autoAlpha: 0});
  
  TweenLite.delayedCall(.5, colorizeMap)
});



$("#energyEfficiencyButton").click(function() {
  oldcurrentState = currentState;
  currentState = "overlay";
  $("#container").addClass("grayscaleAndLighten");
  TweenLite.to($('#neighborhoodEntry'), .5, {autoAlpha: 1, delay: .375});
  if (oldcurrentState == "city"){
    TweenLite.to($('#branding'), .5, {autoAlpha: 0, delay: .25});
    TweenLite.to($('#addressField'), .5, {autoAlpha: 0, delay: .25});
  }
  //TweenLite.to($('#map_canvas'), .5, {autoAlpha: 0, delay: .25});
  TweenLite.to($('#keysWrapper'), .5, {autoAlpha: 0, delay: .25});
  TweenLite.to($('#overlay'), .5, {autoAlpha: 1, delay: .375});
  TweenLite.to($('#efficiencyTips'), .5, {autoAlpha: 1, delay: .375});
  TweenLite.to($('#neighborhoodEntry'), .5, {autoAlpha: 1, delay: .375});
  var subtype = $("#subtypeChoices").val();

  $.ajax({url: pledge,
         data:{subtype:subtype}
     })
    .done(pledge_return);
  TweenLite.to($('#rotateWrapper'), .5, {autoAlpha: 0, delay: .125});
  TweenLite.to($('#leaderboard'), .5, {autoAlpha: 0, delay: .125});
  TweenLite.to($('#moreinfo'), .5, {autoAlpha: 0, delay: .125});
  TweenLite.to($('#about'), .5, {autoAlpha: 0, delay: .125});

});

$("#backToCityButton").click(function() {
  // hide 'back to city' button
  TweenLite.to($('#backToCityButton'), .25, {autoAlpha:0});
  TweenLite.to($('#container'), .25, {autoAlpha:0});
  TweenLite.to($('#wrapper'), .25, {autoAlpha:0});
  //TweenLite.to($('#map_canvas'), .25, {autoAlpha: 0});
  TweenLite.to($('#hoodContainer'), .25, {autoAlpha:0, onComplete:cheatRefresh});
  // TweenLite.delayCall(.25,removeBlocks); 
  
  TweenLite.to($('#rotateWrapper'), .5, {autoAlpha: 0, delay: .125});
  TweenLite.to($('#footer'), .25, {autoAlpha: 0});
  TweenLite.to($('#overlay'), .25, {autoAlpha: 0});
  TweenLite.to($('#neighborhoodEntry'), .25, {autoAlpha: 0});
  TweenLite.to($('#thankYou'), .25, {autoAlpha: 0});
  //TweenLite.to($('#validAddress'), .25, {autoAlpha: 0});
  TweenLite.to($('#branding'), .25, {autoAlpha: 0, delay: .25});
  TweenLite.to($('#addressField'), .25, {autoAlpha: 0, delay: .25});
  
//  removeBlocks();
});

$('#show_me_more').click(function(){
    var subtype = $(this).val();
    $.ajax({
        url: pledge,
        data: {
            subtype: subtype
        }
    })
    .done(pledge_return);
});

function cheatRefresh() {

    window.location.reload();
}

$(".socialButton").click(function() {
  TweenLite.to($('#socialLogin'), .25, {autoAlpha: 0});
});
  
// change when they select a different subtype

$("#subtypeChoices").change(function() {

    var subtype = $(this).val();
    TweenLite.to(main, .5, {total_savings:0});
    $.ajax({
        url: pledge,
        data: {
            subtype: subtype
        }
    })
    .done(pledge_return);
})

// May not be required because of the auto complete functionality
$('#neighborhoodEntry').keypress(function(e) {

    if (e.which == 13) {
        check_neighborhood();
    }
});

// May not be required because of the auto complete functionality
$('#emailEntry').keypress(function(e) {
    if (e.which == 13) {
        enter_email();
    }
});


///// AUTO COMPLETE
var neighborhood_names = _.values(neighborhood_object);
$("#neighborhoodEntry").betterAutocomplete('init',neighborhood_names,{},{
    select:function (result, $input){

        $input.val(result.title);
        $input.blur();
        check_neighborhood();
    }
});


function colorizeMap() {
    NProgress.done();
  $("#container").removeClass("grayscaleAndLighten");
}

////////////////// EVENT LISTENERS //

window.onkeydown = function (e) { 
    var code = e.keyCode ? e.keyCode : e.which;
    if (!rotating && currentState == "city") {
      if (code === 37) { // left arrow key
          rotateNinety('cw');
      } else if (code === 39) { // right arrow key
          rotateNinety('ccw');
      }
    }
};

document.addEventListener( 'mousemove', onDocumentMouseMove, false );
window.addEventListener( 'resize', onWindowResize, false );
document.addEventListener( 'click', onDocumentClick, false );

function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );

  // set the d3 map dimensions?


}

function onDocumentMouseMove(event) {

  event.preventDefault();
  mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
  mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

  TweenLite.to($('#rolloverTip'), .1, { css: { left: event.pageX - 28, top: event.pageY - 150 }});

  // detect mouse position
  if ( event.pageY >= window.innerHeight - 61 && currentState == "city")
  {
    overFooter = true;
  } else {
    overFooter = false;
  }
  if ( event.pageX >= window.innerWidth - 90 && event.pageY <= 90 && currentState == "city")
  {
    overNav = true;
  } else {
    overNav = false;
  }

  // if (keyAnimationOn) {
  //   if ( event.pageX < 200 && event.pageY < 297) {
  //     TweenLite.to($('#key'), .75, { css: { left: 10 }, ease:Quint.easeOut});
  //   }
  //   else {
  //     TweenLite.to($('#key'), .75, { css: { left: -181 }, ease:Quint.easeOut});
  //   }
  // }

  mouseXPos = event.pageX;
  mouseYPos = event.pageY;
}

var cityCamPosX, cityCamPosY, cityCamPosZ, cityLaX, cityLaY, cityLaZ; 

function onDocumentClick(event, test) {
  if (currentState === "city"){
  // save city view vars
  cityCamPosX = camPosX;
  cityCamPosY = camPosY;
  cityCamPosZ = camPosZ;
  cityLaX = laX;
  cityLaY = laY;
  cityLaZ = laZ;

  laX = scene.position.x;
  laY = scene.position.y;
  laZ = scene.position.z;


  if (!rotating && overNav && mouseXPos > window.innerWidth - 55) rotateNinety('ccw');
  if (!rotating && overNav && mouseXPos >= window.innerWidth - 90 && mouseXPos < window.innerWidth - 55) rotateNinety('cw');

  if (!overNav){

  // if we've clicked on a neighborhood
  if (test ||(INTERSECTED.name !== "floor" && currentRollover !== "" && currentState == "city" && !overFooter)) {
    if (test){
        $("#hoodOverviewHeader").html(currentRollover);
    }
    else{
        $("#hoodOverviewHeader").html(currentRollover);
    }

    // localStorage.setItem('angle', currentAngle);
    // localStorage.setItem('lax', laX);
    // localStorage.setItem('lay', laY);
    // localStorage.setItem('laz', laZ);

    clickedNeighborhood = currentRollover;
    currentState = "";

    //angleStep = 0;
    var newLaX = currentCentroid[0];
    var newLaY = 30;
    var newLaZ = currentCentroid[1];
    var angle = getAngle(camPosX, camPosZ, newLaX, newLaZ);
    var dist = getDistance(camPosX, camPosZ, newLaX, newLaZ);
    var newDist = dist - radiusHood;
//    var newCamPosX = camPosX + Math.cos(angle) * newDist;
//    var newCamPosZ = camPosZ + Math.sin(angle) * newDist;
    var newCamPosX = currentCentroid[0];
    var newCamPosZ = currentCentroid[1] + 2;

    TweenLite.to($('#compass2D'), .25, {autoAlpha:1, delay: 1.75});
    NProgress.start();
    //console.log(currentCentroid);
    $.ajax({url:census_blocks,
           data:{name:clickedNeighborhood,
            building_subtype: 'All',
            loc: latLong
           }
       })
    .done(function(response){
      NProgress.set(0.4);
      data = response;        
      // Adjust the google map

      google_map.setZoom(12);

      var newCenter = new google.maps.LatLng(data.centroid[1], data.centroid[0]);
      google_map.setCenter(newCenter);    
      

      // tween lookAt position
      TweenLite.to(main, 2, {laX: newLaX, laY:newLaY, laZ: newLaZ, ease:Quint.easeInOut});
      // tween camera position via camPosX/Y vars
      TweenLite.to(main, 2, {camPosX: newCamPosX, camPosY:75, camPosZ: newCamPosZ, delay:0, ease:Quint.easeInOut, onComplete: setCurrentState, onCompleteParams: ["neighborhood"]});

    // show 'back to city' button
    TweenLite.to($('#keysWrapper'), .25, {css: { height: 363 }, delay: 1.5});
    TweenLite.to($('#backToCityButton'), .25, {autoAlpha:1, delay: 1.75});
    
    //TweenLite.to($('#map_canvas'), .25, {autoAlpha:1, delay: 1.75});

    // kill rotate ui
    TweenLite.to($('#rotateWrapper'), .25, {autoAlpha:0});

    // kill the city
    TweenLite.delayedCall(.75, disappearCity);
    });
  }
}
}
}




$( '#cwNav' ).mouseover(function() {
  TweenLite.to($('#rotateTip'), 0, { css: { left: window.innerWidth - 100, top: 90 }});
  TweenLite.to($('#rotateTip'), .25, {autoAlpha:1, delay: .25});
});

$( '#cwNav' ).mouseout(function() {
  TweenLite.to($('#rotateTip'), .25, {autoAlpha:0, delay: .25});
});

$( '#ccwNav' ).mouseover(function() {
  TweenLite.to($('#rotateTip'), 0, { css: { left: window.innerWidth - 100, top: 90 }});
  TweenLite.to($('#rotateTip'), .25, {autoAlpha:1, delay: .25});
});

$( '#ccwNav' ).mouseout(function() {
  TweenLite.to($('#rotateTip'), .25, {autoAlpha:0, delay: .25});
});

function rotateNinety(direction) {
  rotating = true;
  if (direction == 'cw') currentAngle += Math.PI * .5;
  else if (direction == 'ccw') currentAngle -= Math.PI * .5;
  var newCamPosX = Math.cos(currentAngle) * radiusX * .5;
  var newCamPosZ = Math.sin(currentAngle) * radiusZ * .5;
  TweenLite.to(main, 1.75, {camPosX: newCamPosX, camPosZ: newCamPosZ, ease:Quint.easeInOut, onComplete:setRotatingFalse});
}

function setRotatingFalse () {
  rotating = false;
}

function getAngle(x1, y1, x2, y2) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    return Math.atan2(dy,dx);
}

function getDistance(x1, y1, x2, y2) {
  var xs = 0;
  var ys = 0;
  xs = x2 - x1;
  xs = xs * xs;
  ys = y2 - y1;
  ys = ys * ys;
  return Math.sqrt(xs + ys);
}

function setCurrentState(state, fly) {

  currentState = state;
  create2Dmap();
//  if (fly == "resumeFlying") flying = true;
}

// WebGL detect
function webgl_detect(return_context)
{
    if (!!window.WebGLRenderingContext) {
        var canvas = document.createElement("canvas"),
             names = ["webgl", "experimental-webgl", "moz-webgl", "webkit-3d"],
           context = false;
 
        for(var i=0;i<4;i++) {
            try {
                context = canvas.getContext(names[i]);
                if (context && typeof context.getParameter == "function") {
                    // WebGL is enabled
                    if (return_context) {
                        // return WebGL object if the function's argument is present
                        return {name:names[i], gl:context};
                    }
                    // else, return just true
                    return true;
                }
            } catch(e) {}
        }
 
        // WebGL is supported, but disabled
        return false;
    }
 
    // WebGL not supported
    return false;
}