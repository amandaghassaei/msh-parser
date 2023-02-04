const { MSHParser } = MSHParserLib;

const BUNNY_URL = '../test/msh/stanford_bunny.msh';
const WINGNUT_URL = '../test/msh/wingnut.msh';
const DUCK_URL = '../test/msh/duck.msh';
const COUCH_URL = '../test/msh/couch.msh';
const KNIGHT_URL = '../test/msh/knight.msh';

const PARAMS = {
	factor: 123,
	title: 'hello',
	color1: '#8bc0f0',
	color2: '#36fff5',
	background: '#eeeeee',
	wireframe: '#000000',
	xOffset: 0.25,
	url: BUNNY_URL,
};

// Create a new parser instance,
const parser = new MSHParser();
// Parse the .msh file using the specified file path.
parser.parse(PARAMS.url, initThreeJSGeometry);

let internalMesh, externalMesh, wireframe;

function makeTriHash(a, b, c) {
	// Find the minimum and maximum of the input numbers.
	const min = Math.min(a, b, c);
	const max = Math.max(a, b, c);
  
	// Find the remaining number.
	const remaining = a + b + c - min - max;
  
	// Join the numbers in ascending order into a string with commas.
	return`${min},${remaining},${max}`;
}

const shaderMaterial = new THREE.ShaderMaterial({
	side: THREE.DoubleSide,
	polygonOffset: true,
	polygonOffsetFactor: 1,
	polygonOffsetUnits: 1,
	uniforms: {
		u_color: { value: [1.0, 0, 0] },
		u_xOffset: { value: PARAMS.xOffset },
		u_lightDirection: { value: [1 / Math.sqrt(3), 1 / Math.sqrt(3), 1 / Math.sqrt(3)] },
	},
	extensions: {
		derivatives: true,
	},
	glslVersion: THREE.GLSL3,

	vertexShader: `
		uniform float u_xOffset;
		out float v_visible;
		out vec3 v_viewPosition;
		
		void main() {
			vec4 mvPosition = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
			gl_Position = mvPosition;
			v_visible = position.x > u_xOffset? 0.0 : 1.0;
			v_viewPosition = - mvPosition.xyz; // vector from vertex to camera
		}
	`,

	fragmentShader: `
		uniform vec3 u_color;
		uniform vec3 u_lightDirection; // Direction of the light source.
		in float v_visible;
		in vec3 v_viewPosition;
		out vec4 fragColor;
		void main() {
			// If any vertex in this triangle is not visible.
			// Then don't render the triangle.
			if (v_visible != 1.0) {
				discard;
				return;
			}
			// Calculate the surface normal in world space.
			vec3 normal = normalize( cross( dFdx( v_viewPosition ), dFdy( v_viewPosition ) ) );

			// Calculate the diffuse lighting.
			float diffuse = max(dot(normal, u_lightDirection), 0.0) + 0.1;
			fragColor = vec4(u_color * diffuse, 1.0);
		}
	`,
});

const shaderMaterialWireframe = new THREE.ShaderMaterial({
	uniforms: {
		u_color: { value: [1.0, 0, 0] },
		u_xOffset: { value: PARAMS.xOffset },
	},
	extensions: {
		derivatives: true,
	},
	glslVersion: THREE.GLSL3,

	vertexShader: `
		uniform float u_xOffset;
		out float v_visible;
		void main() {
			vec4 mvPosition = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
			gl_Position = mvPosition;
			v_visible = position.x > u_xOffset? 0.0 : 1.0;
		}
	`,

	fragmentShader: `
		uniform vec3 u_color;
		in float v_visible;
		out vec4 fragColor;
		void main() {
			// If any vertex in this segment is not visible.
			// Then don't render the segment.
			if (v_visible != 1.0) {
				discard;
				return;
			}
			fragColor = vec4(u_color, 1.0);
		}
	`,
});

function removeThreeObject(object) {
	scene.remove(object);
	object.material.dispose();
	object.geometry.dispose();
}

function initExternalMesh(positionsAttribute, exteriorFacesArray) {
	// Remove previous mesh.
	if (externalMesh) removeThreeObject(externalMesh);

	// Create an array of triangle indices for the buffer geometry.
	const numTriangles = exteriorFacesArray.length;
	const indices = new Uint32Array(numTriangles * 3);
	for (let i = 0; i < numTriangles; i++) {
		for (let j = 0; j < 3; j++) {
			indices[3 * i + j] = exteriorFacesArray[i][j];
		}
	}

	// Create a buffer geometry from the position and index arrays.
	const geometry = new THREE.BufferGeometry();
	geometry.setIndex(new THREE.BufferAttribute(indices, 1));
	geometry.setAttribute('position', positionsAttribute);

	// Create a material and mesh and add the geometry to the scene.
	const material = shaderMaterial.clone();
	material.uniforms.u_color.value = new THREE.Color(PARAMS.color1).toArray();
	const mesh = new THREE.Mesh(geometry, material);
	scene.add(mesh);

	return mesh;
}

function initInternalMesh(positionsAttribute, elementsArray, numExteriorNodes) {
	// Remove previous mesh.
	if (internalMesh) removeThreeObject(internalMesh);

	// Init internal mesh.
	const numElements = elementsArray.length;
	const indices = new Uint32Array(numElements * 4 * 3);
	const hash = {};
	// First calc all internal triangles.
	for (let i = 0; i < numElements; i++) {
		const nodeIndices = elementsArray[i];
		for (let j = 0; j < 4; j++) {
			const a = nodeIndices[j];
			const b = nodeIndices[(j + 1) % 4];
			const c = nodeIndices[(j + 2) % 4];
			// Cover each triangle exactly once.
			const key = makeTriHash(a, b, c);
			if (hash[key]) {
				hash[key] += 1;
			} else {
				hash[key] = 1;
			}
		}
	}
	let numTriangles = 0;
	const keys = Object.keys(hash);
	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];
		if (hash[key] !== 2) continue;
		const [a, b, c] = key.split(',');
		indices[3 * numTriangles] = parseInt(a);
		indices[3 * numTriangles + 1] = parseInt(b);
		indices[3 * numTriangles + 2] = parseInt(c);
		numTriangles++;
	}

	const geometry = new THREE.BufferGeometry();
	geometry.setIndex(new THREE.BufferAttribute(indices, 1));
	geometry.setAttribute('position', positionsAttribute);
	geometry.setDrawRange(0, numTriangles * 3);

	// Create a material and mesh and add the geometry to the scene.
	const material = shaderMaterial.clone();
	material.uniforms.u_color.value = new THREE.Color(PARAMS.color2).toArray();
	const mesh = new THREE.Mesh(geometry, material);
	scene.add(mesh);

	return mesh;
}

function initWireframe(positionsAttribute, mshData) {
	// Remove previous wireframe.
	if (wireframe) removeThreeObject(wireframe);

	// Add wireframe.
	const geometry = new THREE.BufferGeometry();
	geometry.setIndex(new THREE.BufferAttribute(MSHParser.calculateEdges(mshData), 1));
	geometry.setAttribute('position', positionsAttribute);
	const material = shaderMaterialWireframe.clone();
	material.uniforms.u_color.value = new THREE.Color(PARAMS.wireframe).toArray();
	const lines = new THREE.LineSegments(geometry, material);
	scene.add(lines);
	return lines;
}

function initThreeJSGeometry(mshData) {
	const {
		nodesArray,
		elementsArray,
		isTetMesh,
		exteriorFacesArray,
		numExteriorNodes,
	} = mshData;

	if (!isTetMesh) {
		alert('This demo can only render tetrahedral meshes.');
		return;
	}

	setInfo(`${(nodesArray.length / 3).toLocaleString()} nodes<br/>
		${numExteriorNodes.toLocaleString()} exterior nodes<br/>
		${elementsArray.length.toLocaleString()} elements<br/>
		${exteriorFacesArray.length.toLocaleString()} exterior faces`);

	// Share positions attribute between meshes.
	const positions = nodesArray.constructor === Float32Array ? nodesArray : new Float32Array(nodesArray);
	const positionsAttribute = new THREE.BufferAttribute(positions, 3);

	externalMesh = initExternalMesh(positionsAttribute, exteriorFacesArray);
	internalMesh = initInternalMesh(positionsAttribute, elementsArray, numExteriorNodes);
	wireframe = initWireframe(positionsAttribute, mshData);

	// Center and scale the positions attribute.
	// Do this on one mesh and it will apply to all.
	// Compute the bounding sphere of the geometry.
	externalMesh.geometry.rotateX(-Math.PI / 2); // Rotate so z is up.
	externalMesh.geometry.computeBoundingSphere();
	externalMesh.geometry.center();
	const scale = 1 / externalMesh.geometry.boundingSphere.radius;
	externalMesh.geometry.scale(scale, scale, scale);

	// Update uniforms.
	updateXOffset(PARAMS.xOffset);
	// Render.
	render();
}

// Create a new Three.js scene and set the background color.
const scene = new THREE.Scene();
scene.background = new THREE.Color(PARAMS.background);

// Create a camera and add it to the scene.
const aspectRatio = window.innerWidth / window.innerHeight;
const viewSize = 2;
const camera = new THREE.OrthographicCamera(
	aspectRatio * viewSize / -2, aspectRatio * viewSize / 2,
	viewSize / 2, viewSize / -2,
	0.01, 10,
);
camera.position.set(2, 2, 2);
scene.add(camera);

// Update on resize.
window.addEventListener('resize', () => {
	renderer.setSize(window.innerWidth, window.innerHeight);
	const aspectRatio = window.innerWidth / window.innerHeight;
	camera.left = aspectRatio * viewSize / -2;
	camera.right = aspectRatio * viewSize / 2;
	camera.top = viewSize / 2;
	camera.bottom = viewSize / -2;
	camera.updateProjectionMatrix();
	render();
});

// Create a renderer and add it to the page.
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Add orbit controls.
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.maxZoom = 100;
controls.minZoom = 0.5;
controls.addEventListener('change', render);

// Render the scene.
function render() {
	renderer.render(scene, camera);
}
render();

// // Uncomment below to make animation.
// const max = 0.6;
// let val = max;
// let incr = 0.005;
// function animate() {
// 	window.requestAnimationFrame(animate);
// 	updateXOffset(val);
// 	val += incr;
// 	if (val > max || val < -max) incr *= -1;
// 	render();
// }
// animate();

// UI
const pane = new Tweakpane.Pane({
	title: PARAMS.url.split('/').pop(),
});
pane.registerPlugin(TweakpaneInfodumpPlugin);
const info = pane.addBlade({
	view: "infodump",
	content: "",
	border: false,
	markdown: false,
});
function setInfo(html) {
	info.controller_.view.element.children[0].innerHTML = html;
}
pane.addInput(PARAMS, 'color1', { label: 'Color 1' }).on('change', () => {
	externalMesh.material.uniforms.u_color.value = new THREE.Color(PARAMS.color1).toArray();
	render();
});
pane.addInput(PARAMS, 'color2', { label: 'Color 2' }).on('change', () => {
	internalMesh.material.uniforms.u_color.value = new THREE.Color(PARAMS.color2).toArray();
	render();
});
pane.addInput(PARAMS, 'background', { label: 'Background' }).on('change', () => {
	scene.background = new THREE.Color(PARAMS.background);
	render();
});
pane.addInput(PARAMS, 'wireframe', { label: 'Wireframe' }).on('change', () => {
	wireframe.material.uniforms.u_color.value = new THREE.Color(PARAMS.wireframe).toArray();
	render();
});

pane.addInput(PARAMS, 'xOffset', {
    min: -1,
    max: 1,
    step: 0.01,
	label: 'Section Plane',
}).on('change', () => {
	updateXOffset(PARAMS.xOffset);
	render();
});
pane.addInput(PARAMS, 'url', {
	label: 'File',
	options: {
	  Bunny: BUNNY_URL,
	  Wingnut: WINGNUT_URL,
	  Duck: DUCK_URL,
	  Couch: COUCH_URL,
	  Knight: KNIGHT_URL,
	},
}).on('change', () => {
	pane.title = PARAMS.url.split('/').pop();
	parser.parse(PARAMS.url, initThreeJSGeometry);
});
pane.addButton({
	title: 'Upload .msh (or Drop/Paste)',
}).on('click', () => {
	fileInput.click();
});
pane.addButton({
	title: 'View Code on GitHub',
}).on('click', () => {
	document.getElementById('githubLink').click();
});

// File import.
const fileInput = document.getElementById('file-input');

function getExtension(filename) {
	const components = filename.split('.');
	return components[components.length - 1].toLowerCase();
}

function loadFile(file) {
	const extension = getExtension(file.name);
	if (extension !== 'msh' && extension !== 'mesh') return;
	pane.title = file.name;
	parser.parse(file, initThreeJSGeometry);
	return true;
}

const badFileAlert = (error = 'Unsupported file') => {
	alert(`${error}: Please upload an .msh file.`);
}

// Paste event.
window.addEventListener('paste', (e) => {
	e.preventDefault();
	// @ts-ignore
	const files = (e.clipboardData || e.originalEvent.clipboardData).items;
	if (!files || files.length === 0) return;
	for (let index in files) {
		const item = files[index];
		if (item.kind === 'file') {
			const file = item.getAsFile();
			if (!file) continue;
			if (loadFile(file)) return;
		}
	}
	badFileAlert();
});

// Drop event.
window.addEventListener("dragover", (e) => {
	e.preventDefault();
}, false);
window.addEventListener('drop', (e) => {
	e.stopPropagation();
	e.preventDefault();
	const files = e.dataTransfer?.files; // Array of all files
	if (!files || files.length === 0) return;
	for (let index in files) {
		const file = files[index];
		if (loadFile(file)) return;
	}
	badFileAlert();
}, false);

// File input.
function fileInputOnChange(e) {
	const { files } = e.target;
	if (!files || files.length === 0) return;
	const file = files[0];
	if(!loadFile(file)) badFileAlert();
}
fileInput.onchange = fileInputOnChange;

function updateXOffset(value) {
	if (internalMesh) internalMesh.material.uniforms.u_xOffset.value = value;
	if (externalMesh) externalMesh.material.uniforms.u_xOffset.value = value;
	if (wireframe) wireframe.material.uniforms.u_xOffset.value = value;
}