import Setup from './setup.js'
import Crowd from './biocrowd.js'

var crowd;
var options = {
	numMarkers: 2000,
	numAgents: 10,
}
function onLoad(setup) {
	var scene = setup.scene;
	var camera = setup.camera;
	var renderer = setup.renderer;
	var gui = setup.gui;
	var stats = setup.stats;

	var directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
	scene.add(directionalLight);
	scene.background = new THREE.Color('skyblue');

	camera.position.set(-200, 280, 300);
	camera.lookAt(new THREE.Vector3(0,0,0));
}

function onUpdate(setup) {
	if (crowd) {
		crowd.update();
	} else {
		crowd = new Crowd(setup.scene);
		crowd.initialize(options.numAgents, options.numMarkers);
	}
}

Setup.init(onLoad, onUpdate);