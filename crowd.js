
const SIZE = 400;

// function for creating a random position on the XZ plane
function randPos() {
  var max = SIZE / 2 - 1;
  var x = max * (2 * Math.random() - 1);
  var z = max * (2 * Math.random() - 1);
  return new THREE.Vector3(x, 0, z);
}

// gets the difference vector
function differenceVector(v1, v2) {
  var x = v1.x - v2.x;
  var y = v1.y - v2.y;
  var z = v1.z - v2.z;

  return new THREE.Vector3(x, y, z);
}

// creates a new sum vector
function addVector(v1, v2) {
  var x = v1.x + v2.x;
  var y = v1.y + v2.y;
  var z = v1.z + v2.z;

  return new THREE.Vector3(x, y, z);
}
/*We are going to create markers randomly scattered throughout the grid, 
which get used in the space colonization algorithm and gets picked up by 
agents.*/

// MARKER CLASS

class Marker {

  // constructor:
  // should have positions, whether or not it's free, length & width
  constructor(obs, w, l) {
    this.position = randPos();
    this.free = true;
    this.obs = obs;
    this.w = w;
    this.l = l;

    // if there is an obstacle on the marker, then it is not free
    if (obs && (this.position.x < w / 2 && this.position.x > - w / 2) && 
      (this.position.z < l / 2 && this.position.z > - l / 2))
    {
      this.free = false;
    }
    this.geom = this.createMesh();
  }

  createMesh() {
    var geometry = new THREE.CylinderGeometry(0.5, 0.5, 0.5, 4);
    var material = new THREE.MeshLambertMaterial({color: 0x4c4c4c});
    var mesh = new THREE.Mesh(geometry, material);
    return mesh; 
  }
}

// AGENT CLASS

class Agent {

  // constructor:
  // should have position, goal position, markers within range, radius,
  // and corresponding cells
  constructor() {
    this.position = randPos();
    this.goal = randPos();
    this.markers = [];
    this.radius = 30;
    this.color = this.generateColor();
    this.geom = this.createMesh();
    this.cells = {
      x: Infinity,
      z: Infinity
    };
    
    //this.meshColor = new THREE.Color("rgb(" + this.color.x + ", " + this.color.y + ", " + this.color.z = ")");
  }
  
  // creates the mesh
  createMesh() {
    var geometry = new THREE.BoxGeometry(10, 20, 10);
    geometry.applyMatrix(new THREE.Matrix4().makeTranslation(0, 10, 0));
    var material = new THREE.MeshBasicMaterial({
      color: this.color
    });
    var mesh = new THREE.Mesh(geometry, material);
    return mesh;
  }

  // creates the goal mesh
  makeGoalMesh() {
    var geometry = new THREE.CylinderGeometry( 5, 5, 0.25, 8 );
    var material = new THREE.MeshBasicMaterial({color: this.color});
    var mesh = new THREE.Mesh(geometry, material);
    return mesh; 
  }

  // generates a random color
  generateColor() {
    var r = (Math.round(Math.random()* 127) + 127) / 255;
    var g = (Math.round(Math.random()* 127) + 127) / 255;
    var b = (Math.round(Math.random()* 127) + 127) / 255;
    return new THREE.Color(r, g, b);
  }

  // gets the difference vector
  differenceVector(v1, v2) {
    var x = v1.x - v2.x;
    var y = v1.y - v2.y;
    var z = v1.z - v2.z;

    return new THREE.Vector3(x, y, z);
  }

  // gets the marker weight
  getWeight(marker) {
    // get the angle from the marker to the goal
    var x = this.differenceVector(this.goal, this.position);
    var y = this.differenceVector(marker.position, this.position); 
    var angle = x.angleTo(y);

    // using the formula w = (cos(theta) + 1) / (1 + len(y))
    return (Math.cos(angle) + 1) / (y.length() + 1);
  }

  // sums all the marker weights for that agent
  accWeight() {
    var sum = 0;
    for (var i = 0; i < this.markers.length; i++) {
      sum += this.getWeight(this.markers[i]);
    }
    return sum;
  }

  // computes weighted average
  getWtAvg() {
    // gets the total weight
    var total = this.accWeight();

    var mv = new THREE.Vector3();

    for (var i = 0; i < this.markers.length; i++) {
      // gets the influence of each marker
      var influence = this.getWeight(this.markers[i]);
      if (total != 0) {
        influence /= total;
      }

      // gets the difference vector and multiplies by the marker influence
      // then gets added onto the total vector
      var differenceVector = this.differenceVector(this.markers[i].position, this.position);
      mv = mv.add(differenceVector.multiplyScalar(influence));

      // make the marker free again after being used
      this.markers[i].free = true;

    }
    // normalize
    var v = mv.normalize().multiplyScalar(1.0);
    return v;
  }

  // update positions
  updatePos() {
    var v = this.getWtAvg();
    this.position = this.position.add(v);
    this.markers.length = 0;
  }
}

// GRID CLASS (basically the floor of the scene)

class Grid {

  // constructor :
  // should have a size, an array with all the markers & agents, and 
  // 2d array to represent it as a grid
  constructor() {
    this.size = SIZE;
    this.markers = [];
    this.agents = [];
    this.geom = this.createPlane();

    this.numCol = 8;
    this.cells = this.create2DArray(this.numCol);
    this.cellSize = this.size / this.numCol;
  }

  // create a 2D array to represent the grid
  create2DArray(size) {
    var arr = [];
    for (var i = 0; i < size; i++) {
      arr.push([]);
      for (var j = 0; j < size; j++) {
        arr[i].push([]);
      }
    }
    return arr;
  }

  // gets the cells at a certain position
  getCells(pos) {
    var x = this.numCol / 2 + Math.floor(pos.x / this.cellSize);
    var z = Math.floor(pos.z / this.cellSize);

    if (z < 0) {
      z = Math.abs(z) - 1 + this.numCol / 2;
    } else {
      z = this.numCol / 2 - 1 - z;
    }
    return {
      x: x,
      z: z
    };
  }

  // creates the cells
  createCells() {
    for (var i = 0; i < this.markers.length; i++) {
      var cells = this.getCells(this.markers[i].position);
      this.cells[cells.x][cells.z].push(this.markers[i]);
    }
  }

  // update
  updateCells() {
    for (var i = 0; i < this.agents.length; i++) {
      var cells = this.getCells(this.agents[i].position);
      this.agents[i].cells = cells;
    }
  }

  // create the plane geometry
  createPlane() {
    var geometry = new THREE.BoxGeometry(this.size, this.size, 2 * this.size);
    geometry.translate(0, 0, 1 * this.size);
    var material = new THREE.MeshLambertMaterial({
      color: 0x708090,
      side: THREE.DoubleSide
    });
    var mesh = new THREE.Mesh(geometry, material);
    mesh.rotateX(Math.PI / 2);

    return mesh;
  }
  // update the markers
  updateMarkers() {
    for (var i = 0; i < this.agents.length; i++) {
      var dist = this.agents[i].position.distanceTo(this.agents[i].goal);
      if (dist < 10) {
        continue;
      }
      var all = this.getAgentMarkers(this.agents[i]);

      for (var j = 0; j < all.length; j++) {
        if (!all[j].free) {
          continue;
        }
        var distance = all[j].position.distanceTo(this.agents[i].position);
        if (distance > this.agents[i].radius) {
          continue;
        }
        this.agents[i].markers.push(all[j]);
        all[j].free = false;

        var material = new THREE.MeshBasicMaterial({color: this.agents[i].geom.material.color});
        all[j].geom.material = material;
      }
    }
  }

  // gets the markers of the agent
  getAgentMarkers(agent) {
    var cells = agent.cells;
    var c = this.cells[cells.x][cells.z];

    var lx = Math.max(0, cells.x - 1);
    var l = this.cells[lx][cells.z];

    var rx;
    if (cells.x + 1 > this.numCol - 1) {
      rx = 0;
    } else {
      rx = cells.x + 1;
    }
    var r = this.cells[rx][cells.z];

    var bz = Math.max(0, cells.z - 1);
    var b = this.cells[cells.x][bz];

    var tz;
    if (cells.z + 1 > this.numCol - 1) {
      tz = 0;
    } else {
      tz = cells.z + 1;
    }
    var t = this.cells[cells.x][tz];

    return c.concat(l.concat(r.concat(b.concat(t))));

  }

}

function Crowd(scene) {
  this.initialize = function(numAgents, numMarkers, obstacle) {
    this.numAgents = numAgents;
    this.numMarkers = numMarkers;
    this.obs = obstacle;
    this.obsW = 0;
    this.obsL = 0;

    // create the grid
    this.grid = new Grid();
    scene.add(this.grid.geom);

    // if there is an obstacle, then create obstacle
    if (this.obs) {
      this.obsW = Math.random() * 100 + 50;
      this.obsL = Math.random() * 100 + 50;        
      var geometry = new THREE.BoxGeometry(this.obsW, 40, this.obsL);
      geometry.applyMatrix( new THREE.Matrix4().makeTranslation(0, 20, 0));
      var material = new THREE.MeshBasicMaterial({color: 'black'});
      this.obsMesh = new THREE.Mesh( geometry, material );
      scene.add(this.obsMesh);
    }

    // create the markers
    for (var i = 0; i < numMarkers; i++) {
      var m = new Marker(this.obs, this.obsW, this.obsL);
      scene.add(m.geom);
      m.geom.position.set(m.position.x, m.position.y, m.position.z);
      this.grid.markers.push(m);
    }
  
    // create the agents
    for (var i = 0; i < numAgents; i++) {
      var a = new Agent();
      var x = 0.25 * SIZE * Math.cos(2 * i * Math.PI / numAgents);
      var z = 0.25 * SIZE * Math.sin(2 * i * Math.PI / numAgents);
      a.position = new THREE.Vector3(x, 0, z);
      var gx = 0.45 * SIZE * Math.cos(2 * (numAgents - i) * Math.PI / numAgents);
      var gz = 0.45 * SIZE * Math.sin(2 * (numAgents - i) * Math.PI / numAgents);
      a.goal = new THREE.Vector3(gx, 0, gz);

      scene.add(a.geom);
      a.geom.position.set(a.position.x, a.position.y, a.position.z);

      this.grid.agents.push(a);
    }
    this.grid.createCells();
  }
  this.update = function() {
    for (var i = 0; i < this.numAgents; i++) {
      var a = this.grid.agents[i];
      var dist = a.position.distanceTo(a.goal);
      this.grid.updateCells();
      this.grid.updateMarkers();
      if (dist > 10) {
        a.updatePos();
        a.geom.position.set(a.position.x, a.position.y, a.position.z);
      }
      //console.log("Agent " + i + ":" + a.position.x + a.position.y + a.position.z);
    }
  }
  this.reset = function() {
    for (var i = 0; i < this.numAgents; i++) {
      var agent = this.grid.agents[i];
      scene.remove(agent.geom);
    }
    this.grid.agents = [];
    for (var i = 0; i < this.numMarkers; i++) {
      scene.remove(this.grid.markers[i].geom);
    }
    this.grid.markers = [];
    this.grid.cells = [];
    scene.remove(this.obsMesh);
  }
}

// add a third person mode
function TPerson(scene) {
  // movement speed
  var xSpeed = 0.01;
  var zSpeed = 0.01;
  var control = new Agent();
  control.color = new THREE.Vector3(0, 0, 0);

  this.initialize = function(numAgents, numMarkers, obstacle) {
    this.numAgents = numAgents;
    this.numMarkers = numMarkers;

    this.obs = obstacle;
    this.obsW = 0;
    this.obsL = 0;
    // create the grid
    this.grid = new Grid();
    scene.add(this.grid.geom);

    // create the controlled marker
   
    var x = SIZE * 0.5;
    var z = SIZE * 0.5;
    control.position = new THREE.Vector3(x, 0, z);
    scene.add(control.geom);
    control.geom.position.set(control.position.x, control.position.y, control.position.z);
    // this.grid.agents.push(control);
    // create the markers
    for (var i = 0; i < numMarkers; i++) {
      var m = new Marker(this.obs, this.obsW, this.obsL);
      scene.add(m.geom);
      m.geom.position.set(m.position.x, m.position.y, m.position.z);
      this.grid.markers.push(m);
    }
  
    // create the agents
    for (var i = 0; i < numAgents; i++) {

      // outer circle
      var a = new Agent();
      var x = 0.4 * SIZE * Math.cos(2 * i * Math.PI / numAgents);
      var z = 0.4 * SIZE * Math.sin(2 * i * Math.PI / numAgents);
      a.position = new THREE.Vector3(x, 0, z);

      // 2nd outer
      var b = new Agent();
      var bx = 0.3 * SIZE * Math.sin(2 * i * Math.PI / numAgents);
      var bz = 0.3 * SIZE * Math.cos(2 * i * Math.PI / numAgents);
      b.position = new THREE.Vector3(bx, 0, bz);

      // third outer
      var c = new Agent();
      var cx = 0.2 * SIZE * Math.cos(2 * i * Math.PI / numAgents);
      var cz = 0.2 * SIZE * Math.sin(2 * i * Math.PI / numAgents);
      c.position = new THREE.Vector3(cx, 0, cz);

      // innermost
      var d = new Agent();
      var dx = 0.1 * SIZE * Math.sin(2 * i * Math.PI / numAgents);
      var dz = 0.1 * SIZE * Math.cos(2 * i * Math.PI / numAgents);
      d.position = new THREE.Vector3(dx, 0, dz);

      // add everything to the scene
      scene.add(a.geom);
      a.geom.position.set(a.position.x, a.position.y, a.position.z);
      scene.add(b.geom);
      b.geom.position.set(b.position.x, b.position.y, b.position.z);
      scene.add(c.geom);
      c.geom.position.set(c.position.x, c.position.y, c.position.z);
      scene.add(d.geom);
      d.geom.position.set(d.position.x, d.position.y, d.position.z);

      this.grid.agents.push(a);
      this.grid.agents.push(b);
      this.grid.agents.push(c);
      this.grid.agents.push(d);
    }

    this.grid.createCells();
  }
  this.update = function() {
    // event listener for movement
    document.addEventListener("keydown", onDocumentKeyDown, false);
    function onDocumentKeyDown(event) {
      var keyCode = event.which;
      if (keyCode == 87) {
        control.position.z -= zSpeed;
        control.geom.position.set(control.position.x, control.position.y, control.position.z);
      } else if (keyCode == 83) {
        control.position.z += zSpeed;
        control.geom.position.set(control.position.x, control.position.y, control.position.z);
      } else if (keyCode == 65) {
        control.position.x -= xSpeed;
        control.geom.position.set(control.position.x, control.position.y, control.position.z);
      } else if (keyCode == 68) {
        control.position.x += xSpeed;
        control.geom.position.set(control.position.x, control.position.y, control.position.z);
      } else if (keyCode == 32) {
        control.position.set(0, 0, 0);
        control.geom.position.set(control.position.x, control.position.y, control.position.z);
      }
    };  

    // update the agents

    for (var i = 0; i < this.grid.agents.length; i++) {
      var a = this.grid.agents[i];

      // if the control is within 1, then you want it to move out of the way
      if (a.position.distanceTo(control.position) < 40) {

        // i make the new goal of the agent to just be the difference vector added onto
        // current position
        var diff = differenceVector(a.position, control.position);
        var newG = addVector(a.position, diff);
        a.goal = newG;

        var dist = a.position.distanceTo(a.goal);
        this.grid.updateCells();
        this.grid.updateMarkers();

        if (dist > 1) {
          a.updatePos();
          a.geom.position.set(a.position.x, a.position.y, a.position.z);
        }
      }      
    }
  }
  this.reset = function() {
    for (var i = 0; i < this.numAgents; i++) {
      var agent = this.grid.agents[i];
      scene.remove(agent.geom);
    }
    this.grid.agents = [];
    for (var i = 0; i < this.numMarkers; i++) {
      scene.remove(this.grid.markers[i].geom);
    }
    this.grid.markers = [];
    this.grid.cells = [];
    scene.remove(this.obsMesh);
  }

}

var crowd;
var third;
// GUI options
var options = {
  numMarkers: 2000,
  numAgents: 10,
  obstacle: false,
  thirdPerson: false 
}

function create() {
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  var canvas = document.querySelector('#c');
  var renderer = new THREE.WebGLRenderer({
    canvas, antialias: true
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x020202, 0);

  // ORBIT CONTROLS
  var controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enableZoom = true;
  controls.target.set(0, 0, 0);
  controls.rotateSpeed = 0.3;
  controls.zoomSpeed = 1.0;
  controls.panSpeed = 2.0;
  controls.update();

  // STATS GUI
  var statsFPS = new Stats();
  statsFPS.domElement.style.cssText = "position:absolute;top:3px;left:3px;";
  statsFPS.showPanel(0); // 0: fps,

  //memory stats
  var statsMemory = new Stats();
  statsMemory.showPanel(2); //2: mb, 1: ms, 3+: custom
  statsMemory.domElement.style.cssText = "position:absolute;top:3px;left:84px;";

  /* DAT GUI */
  var gui = new dat.GUI();
  // change number of agents
  gui.add(options, 'numAgents', 0, 20).step(2).onChange(function(newVal) {
    crowd.reset();
    crowd.initialize(newVal, options.numMarkers);
  });
  // change number of markers
  gui.add(options, 'numMarkers', 0, 6000).step(500).onChange(function(newVal) {
    crowd.reset();
    crowd.initialize(options.numAgents, newVal);
  });
  // add obstacle
  gui.add(options, 'obstacle').onChange(function(newVal) {
    crowd.reset();
    crowd.initialize(options.numAgents, options.numMarkers, options.obstacle);
  });
  // add third person
  gui.add(options, 'thirdPerson').onChange(function(newVal) {
    options.thirdPerson = true;
    crowd.reset();
    third.initialize(options.numAgents, options.numMarkers);
  });

  // set up the scene
  var directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
  scene.add(directionalLight);
  scene.background = new THREE.Color('skyblue');
  camera.position.set(-200, 280, 300);
  camera.lookAt(new THREE.Vector3(0, 0, 0));
  
  // resize canvas on resize window
  window.addEventListener( 'resize', () => {
    let width = window.innerWidth
    let height = window.innerHeight
    renderer.setSize( width, height )
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  });
  
  crowd = new Crowd(scene);
  third = new TPerson(scene);
  crowd.initialize(options.numAgents, options.numMarkers);
  document.body.appendChild(statsFPS.dom);
  document.body.appendChild(statsMemory.dom);
  (function tick() {
    if (!options.thirdPerson) {
      crowd.update();
    } else {
      third.update();
    }
    
    //update stats
    statsFPS.update();
    statsMemory.update();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  })();
}

create();
