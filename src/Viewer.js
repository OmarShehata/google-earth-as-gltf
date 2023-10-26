import * as THREE from 'three';
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

const THREE_PATH = `https://unpkg.com/three@0.${THREE.REVISION}.x`
const DRACO_LOADER = new DRACOLoader( ).setDecoderPath( `${THREE_PATH}/examples/jsm/libs/draco/gltf/` );

// Set up a ThreeJS scene to render arbitrary glTF's as a preview
export class Viewer {
	constructor() {
		// https://github.com/OmarShehata/web-boilerplate/blob/threejs/src/index.js
		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
		this.scene = scene 
		this.camera = camera 

		const renderer = new THREE.WebGLRenderer({ antialias: true });
		renderer.setSize( window.innerWidth, window.innerHeight );
		this.renderer = renderer
		document.body.appendChild( renderer.domElement );
		const controls = new OrbitControls(camera, renderer.domElement);
		controls.update();
		this.controls = controls

		this.render();

		// const directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
		// scene.add( directionalLight );
		// const light = new THREE.AmbientLight( 0x404040 ); // soft white light
		// scene.add( light );

		this.resizeCanvas();
		window.addEventListener('resize', this.resizeCanvas.bind(this));
	}

	render() {
		const { renderer, camera, scene } = this
	  requestAnimationFrame( this.render.bind(this) );
	  renderer.render( scene, camera );
	}

	resizeCanvas(){
		const { camera, renderer } = this
		camera.aspect = window.innerWidth / window.innerHeight;
		  camera.updateProjectionMatrix();

		  renderer.setSize( window.innerWidth, window.innerHeight );
	}

	loadGLTF(url) {
		// Inspired by gltf-viewer
		// https://github.com/donmccurdy/three-gltf-viewer/blob/de78a07180e4141b0b87a0ff4572bc4f7aafec56/src/viewer.js#L246
		const { scene, controls, camera } = this 
		const loader = new GLTFLoader();
		loader.setDRACOLoader( DRACO_LOADER );

		// Load a glTF resource
		loader.load(
			// resource URL
			url,
			// called when the resource is loaded
			(gltf) => {
				const object = gltf.scene 
				// console.log(object.children, object.children[0].children)
				window.camera = camera

				if (this.computedCenter == undefined) {

					const box = new THREE.Box3().setFromObject(object);
				    const size = box.getSize(new THREE.Vector3()).length();
				    const center = box.getCenter(new THREE.Vector3());

				    controls.maxDistance = size * 10;
				    camera.near = size / 200;
				    camera.far = size * 200;
				    camera.updateProjectionMatrix();

				    camera.position.copy(center);
				    camera.position.x += size / 2.0;
				    camera.position.y += size / 5.0;
				    camera.position.z += size / 2.0;
				    camera.lookAt(center);

				    this.computedCenter = center;
				}
				
				scene.add( object );

				const center = this.computedCenter
				object.position.x += (object.position.x - center.x);
			    object.position.y += (object.position.y - center.y);
			    object.position.z += (object.position.z - center.z);


			    controls.update()
			},
			// called while loading is progressing
			function ( xhr ) {

			},
			// called when loading has errors
			function ( error ) {
				console.log( 'Error while loading glTF:', error );
			}
		);
	}

	generateCombineGltf() {
		console.log("Download!")
		exportGLTF(this.scene, {
			maxTextureSize: 4096
		})
	}
}

function exportGLTF( input, params ) {

	const gltfExporter = new GLTFExporter();

	const options = {
		trs: params.trs,
		onlyVisible: params.onlyVisible,
		binary: params.binary,
		maxTextureSize: params.maxTextureSize
	};
	gltfExporter.parse(
		input,
		function ( result ) {

			if ( result instanceof ArrayBuffer ) {

				saveArrayBuffer( result, 'scene.glb' );

			} else {

				const output = JSON.stringify( result, null, 2 );
				console.log( output );
				saveString( output, 'scene.gltf' );

			}

		},
		function ( error ) {

			console.log( 'An error happened during parsing', error );

		},
		options
	);

}

const link = document.createElement( 'a' );
link.style.display = 'none';
document.body.appendChild( link ); // Firefox workaround, see #6594

function save( blob, filename ) {

	link.href = URL.createObjectURL( blob );
	link.download = filename;
	link.click();

	// URL.revokeObjectURL( url ); breaks Firefox...

}

function saveString( text, filename ) {

	save( new Blob( [ text ], { type: 'text/plain' } ), filename );

}


function saveArrayBuffer( buffer, filename ) {

	save( new Blob( [ buffer ], { type: 'application/octet-stream' } ), filename );

}
