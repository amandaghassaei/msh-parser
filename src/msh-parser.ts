/**
 * Parse .msh file asynchronously (returns Promise).
 */
export function loadMshAsync(urlOrFile: string | File) {
	return new Promise<MSHMesh>((resolve) => {
		loadMsh(urlOrFile, (mesh) => {
			resolve(mesh);
		});
	});
}

/**
 * Load and parse the .msh file at the specified file path or File object.
 */
export function loadMsh(urlOrFile: string | File, callback: (mesh: MSHMesh) => void) {
	if (typeof urlOrFile === 'string') {
		// Made this compatible with Node and the browser, maybe there is a better way?
		if (typeof window !== 'undefined') {
			// Load the file with XMLHttpRequest.
			const request = new XMLHttpRequest();
			request.open('GET', urlOrFile, true);
			request.responseType = 'arraybuffer';
			request.onload = () => {
				const mesh = new _MSHMesh(request.response as ArrayBuffer);
				// Call the callback function with the parsed mesh data.
				callback(mesh);
			};
			request.send();
		} else {
			// Call the callback function with the parsed mesh data.
			import('fs').then((fs) => {
				const buffer = fs.readFileSync(urlOrFile);
				callback(new _MSHMesh(new Uint8Array(buffer).buffer));
			});
		}
	} else {
		// We only ever hit this in the browser.
		// Load the file with FileReader.
		const reader = new FileReader();
		reader.onload = () => {
			const mesh = new _MSHMesh(reader.result as ArrayBuffer);
			// Call the callback function with the parsed mesh data.
			callback(mesh);
		}
		reader.readAsArrayBuffer(urlOrFile);
	}
}

/**
 * Synchronously parse an already loaded .msh file buffer.
 */
export function parseMsh(data: Buffer | ArrayBuffer) {
	data = (data as Buffer).buffer ? new Uint8Array(data as Buffer).buffer : data;
	return new _MSHMesh(data) as MSHMesh;
}

// https://github.com/PyMesh/PyMesh/blob/main/src/IO/MshLoader.cpp
// Define the MSHMesh class.
class _MSHMesh {
	// TextDecoder instance to decode the header as UTF-8.
	static decoder = new TextDecoder();
	// Header offset.
	private _offset = 0;

	private _nodes: Float64Array | Float32Array;
	readonly elements: number[][];
	private _edges?: Uint32Array;
	private _exteriorEdges?: Uint32Array;
	private _elementVolumes?: Float32Array;
	private _nodalVolumes?: Float32Array;
	private _boundingBox?: { min: number[], max: number[] };
	readonly isTetMesh: boolean;
	private readonly _exteriorFaces?: number[][];
	private readonly _numExteriorNodes?: number;

	constructor(arrayBuffer: ArrayBuffer) {
		const dataView = new DataView(arrayBuffer);
		// Create a Uint8Array that references the same underlying memory as the DataView.
		const uint8Array = new Uint8Array(dataView.buffer);

		// Parse header.
		if (this._parseNextLineAsUTF8(uint8Array) !== '$MeshFormat') _MSHMesh._throwInvalidFormatError();
		const [ version, type, dataSize ] = this._parseNextLineAsUTF8(uint8Array).split(' ').map(el => parseFloat(el));
		if (isNaN(version) || isNaN(type) || isNaN(dataSize)) _MSHMesh._throwInvalidFormatError();
		if (dataSize !== 8 && dataSize !== 4) throw new Error(`msh-parser: This library currently parses .msh files with data size === 8 or 4.  Current file has data size = ${dataSize}. Please submit an issue to the GitHub repo if you encounter this error and attach a sample file.`);
		const doublePrecision = dataSize === 8;
		const isBinary = type === 1;
		let isLE = false;
		if (isBinary) {
			// Read in extra info from binary header.
			// TODO: how do we know to read as LE here?
			if (dataView.getInt32(this._offset, true) === 1) {
				// Read as LE.
				isLE = true;
			}
			this._offset += 4;
		}
		if (this._parseNextLineAsUTF8(uint8Array) !== '$EndMeshFormat') _MSHMesh._throwInvalidFormatError();

		// Read the number of nodes.
		if (this._parseNextLineAsUTF8(uint8Array) !== '$Nodes') _MSHMesh._throwInvalidFormatError();
		const numNodes = parseInt(this._parseNextLineAsUTF8(uint8Array));
		// Loop through the nodes.
		const nodesArray = doublePrecision ? new Float64Array(3 * numNodes) : new Float32Array(3 * numNodes);
		if (isBinary) {
			for (let i = 0; i < numNodes; i++) {
				// Read the current node.
				const index = dataView.getInt32(this._offset, isLE) - 1; // The .msh node index is 1-indexed.
				if (doublePrecision) {
					nodesArray[3 * index] = dataView.getFloat64(this._offset + 4, isLE);
					nodesArray[3 * index + 1] = dataView.getFloat64(this._offset + 4 + dataSize, isLE);
					nodesArray[3 * index + 2] = dataView.getFloat64(this._offset + 4 + 2 * dataSize, isLE);
				} else {
					nodesArray[3 * index] = dataView.getFloat32(this._offset + 4, isLE);
					nodesArray[3 * index + 1] = dataView.getFloat32(this._offset + 4 + dataSize, isLE);
					nodesArray[3 * index + 2] = dataView.getFloat32(this._offset + 4 + 2 * dataSize, isLE);
				}
				// Update the current file's byte offset.
				this._offset += 4 + 3 * dataSize;
			}
		} else {
			throw new Error('msh-parser: This library does not currently parse non-binary .msh files.  Please submit an issue to the GitHub repo if you encounter this error and attach a sample file.');
		}
		// Check that all nodes are finite.
		for (let i = 0; i < nodesArray.length; i++) {
			if (!_MSHMesh._isFiniteNumber(nodesArray[i])) throw new Error('msh-parser: NaN or Inf detected in input file.');
		}
		if (this._parseNextLineAsUTF8(uint8Array) !== '$EndNodes') _MSHMesh._throwInvalidFormatError();
		this._nodes = nodesArray;

		if (this._parseNextLineAsUTF8(uint8Array) !== '$Elements') _MSHMesh._throwInvalidFormatError();

		// Read the number of elements.
		const numElements = parseInt(this._parseNextLineAsUTF8(uint8Array));
		const elementsArray: number[][] = [];
		for (let i = 0; i < numElements; i++) {
			elementsArray.push([]);
		}
		this.elements = elementsArray;

		// Check if all elements are tetrahedra.
		let isTetMesh = true;
		// Loop through the elements.
		let elementIndex = 0;
		let tagWarning = false;
		if (isBinary) {
			while (elementIndex < numElements) {
				// Parse element header.
				const elementType = dataView.getInt32(this._offset, isLE);
				const elementNumElements = dataView.getInt32(this._offset + 4, isLE);
				const elementNumTags = dataView.getInt32(this._offset + 8, isLE);
				if (elementType !== 4) isTetMesh = false;
				const numElementNodes = _MSHMesh._numNodesPerElementType(elementType);
				// Update the current file's byte offset.
				this._offset += 12;
				for (let i = 0; i < elementNumElements; i++) {
					const index = dataView.getInt32(this._offset, isLE) - 1; // The .msh index is 1-indexed.
					if (index < 0 || index >= numElements) throw new Error(`msh-parser: Invalid element index ${index} for numElements === ${numElements}.`);
					this._offset += 4;
					for (let j = 0; j < elementNumTags; j++) {
						const tag = dataView.getInt32(this._offset, isLE);
						if (!tagWarning) {
							tagWarning = true;
							console.warn('msh-parser: This library does not currently parse element tags.');
						}
						// Update the current file's byte offset.
						this._offset += 4;
					}
					
					const nodeIndices = elementsArray[index];
					for (let j = 0; j < numElementNodes; j++) {
						const nodeIndex = dataView.getInt32(this._offset, isLE) - 1; // The .msh index is 1-indexed.
						if (!_MSHMesh._isFiniteNumber(nodeIndex)) throw new Error('msh-parser: NaN or Inf detected in input file.');
						if (nodeIndex < 0 || nodeIndex >= numNodes) throw new Error(`msh-parser: Invalid node index ${nodeIndex} for numNodes === ${numNodes}.`);
						nodeIndices.push(nodeIndex);
						// Update the current file's byte offset.
						this._offset += 4;
					}
				}

				elementIndex += elementNumElements;
			}
		} else {
			throw new Error('msh-parser: This library does not currently parse non-binary .msh files.  Please submit an issue to the GitHub repo if you encounter this error and attach a sample file.');
		}
		if (this._parseNextLineAsUTF8(uint8Array) !== '$EndElements') _MSHMesh._throwInvalidFormatError();

		this.isTetMesh = isTetMesh;
		// TODO: make this work for non-tet.
		if (isTetMesh) {
			// For tet meshes, calculate exterior faces.
			// First find all faces that are covered only once, these are on the boundary.
			const hash: { [key: string]: number[] } = {};
			for (let i = 0; i < numElements; i++) {
				const indices = elementsArray[i];
				for (let j = 0; j < indices.length; j++) {
					const key = _MSHMesh._makeTriHash(indices[j], indices[(j + 1) % 4], indices[(j + 2) % 4]);
					if (hash[key]) {
						hash[key].push(indices[(j + 3) % indices.length]);
						if (hash[key].length > 2) {
							throw new Error(`msh-parser: Hit face ${key} more than twice.`);
						}
					} else {
						hash[key] = [indices[(j + 3) % 4]];
					}
				}
			}
			const keys = Object.keys(hash);
			const exteriorFacesArray: number[][] = [];
			const exteriorNodes = new Uint8Array(numNodes);
			for (let i = 0, numKeys = keys.length; i < numKeys; i++) {
				const key = keys[i];
				if (hash[key].length !== 1) continue;
				const indices = keys[i].split(',');
				const a = parseInt(indices[0]);
				const b = parseInt(indices[1]);
				const c = parseInt(indices[2]);
				// d is the internal node of this tet.
				const d = hash[key][0];
				// Use d to calculate the winding order of the triangle.
				const orientation = _MSHMesh._dotProduct(_MSHMesh._crossProduct(
					_MSHMesh._vecFromTo(a, b, nodesArray),
					_MSHMesh._vecFromTo(a, c, nodesArray),
				), _MSHMesh._vecFromTo(a, d, nodesArray));
				exteriorFacesArray.push(orientation < 0 ? [a, b, c] : [a, c, b]);
				// Mark all nodes as exterior.
				exteriorNodes[a] = 1;
				exteriorNodes[b] = 1;
				exteriorNodes[c] = 1;
			}
			
			// Also reorder the nodes so that the exterior nodes are first.
			let currentIndex = 0;
			const newIndices = new Int32Array(numNodes);
			for (let i = 0; i < numNodes; i++) {
				if (exteriorNodes[i]) {
					newIndices[i] = currentIndex;
					currentIndex++;
				}
			}
			this._numExteriorNodes = currentIndex;
			for (let i = 0; i < numNodes; i++) {
				if (!exteriorNodes[i]) {
					newIndices[i] = currentIndex;
					currentIndex++;
				}
			}
			// Now that we have a mapping, update nodesArrays, elementsArray, and exteriorFacesArray.
			const newNodesArray = nodesArray.slice();
			for (let i = 0; i < numNodes; i++) {
				for (let j = 0; j < 3; j++) {
					newNodesArray[3 * newIndices[i] + j] = nodesArray[3 * i + j];
				}
			}
			this._nodes = newNodesArray;
			for (let i = 0; i < numElements; i++) {
				const indices = elementsArray[i];
				for (let j = 0; j < indices.length; j++) {
					indices[j] = newIndices[indices[j]];
				}
			}
			for (let i = 0; i < exteriorFacesArray.length; i++) {
				const indices = exteriorFacesArray[i];
				for (let j = 0; j < indices.length; j++) {
					indices[j] = newIndices[indices[j]];
				}
			}
			this._exteriorFaces = exteriorFacesArray;
		}
	}

	get nodes() {
		return this._nodes;
	}

	set nodes(nodes: Float32Array | Float64Array) {
		throw new Error(`msh-parser: No nodes setter.`);
	}

	private _parseNextLineAsUTF8(uint8Array: Uint8Array) {
		// Find the first newline character in the uint8Array.
		const newlineIndex = uint8Array.indexOf(10, this._offset); // 10 is the ASCII code for the newline character.
		// Decode the uint8Array as a UTF-8 encoded string up until the newline character.
		const text = _MSHMesh.decoder.decode(uint8Array.subarray(this._offset, newlineIndex));
		// Update offset.
		this._offset = newlineIndex + 1;
		// Return the decoded string.
		return text;
	}

	private static _throwInvalidFormatError() {
		throw new Error('msh-parser: Invalid .msh file format.');
	}

	private static _isFiniteNumber(number: number) {
		return !isNaN(number) && number !== Infinity && number !== -Infinity;
	}

	private static _numNodesPerElementType(elementType: number) {
		switch (elementType) {
			case 2:
				return 3; // Triangle
			case 3:
				return 4; // Quad
			case 4:
				return 4; // Tetrahedron
			case 5:
				return 8; // Hexahedron
			default:
				throw new Error(`msh-parser: Element type ${elementType} is not supported yet.`);
		}
	}
	
	// Calculates the dot product of two vectors.
	private static _dotProduct(vector1: number[], vector2: number[]) {
		return vector1[0] * vector2[0] + vector1[1] * vector2[1] + vector1[2] * vector2[2];
	}
	
	// Calculates the cross product of two vectors.
	private static _crossProduct(vector1: number[], vector2: number[]) {
		return [
			vector1[1] * vector2[2] - vector1[2] * vector2[1],
			vector1[2] * vector2[0] - vector1[0] * vector2[2],
			vector1[0] * vector2[1] - vector1[1] * vector2[0]
		];
	}

	private static _vecFromTo(from: number, to: number, nodesArray: Float32Array | Float64Array) {
		return [
			nodesArray[3 * to] - nodesArray[3 * from],
			nodesArray[3 * to + 1] - nodesArray[3 * from + 1],
			nodesArray[3 * to + 2] - nodesArray[3 * from + 2],
		];
	}

	private static _makeTriHash(a: number, b: number, c: number) {
		// Find the minimum and maximum of the input numbers.
		const min = Math.min(a, b, c);
		const max = Math.max(a, b, c);
	  
		// Find the remaining number.
		const remaining = a + b + c - min - max;
	  
		// Join the numbers in ascending order into a string with commas.
		return`${min},${remaining},${max}`;
	}

	get edges() {
		if (!this._edges) {
			const { elements, isTetMesh } = this;
			if (!isTetMesh) throw new Error(`msh-parser: MSHMesh.edges is not defined for non-tet meshes.`);
			// Calc all edges in mesh, use hash table to cover each edge only once.
			const hash: { [key: string]: boolean } = {};
			for (let i = 0, numElements = elements.length; i < numElements; i++) {
				const elementIndices = elements[i];
				// For tetrahedra, create an edge between each pair of nodes in element.
				const numNodes = elementIndices.length;
				for (let j = 0; j < numNodes; j++) {
					for (let k = j + 1; k < numNodes; k++) {
						if (j === k) continue;
						const a = elementIndices[j];
						const b = elementIndices[k];
						const key = `${Math.min(a, b)},${Math.max(a, b)}`;
						hash[key] = true;
					}
				}
			}
			const keys = Object.keys(hash);
			const edgesArray = new Uint32Array(keys.length * 2);
			for (let i = 0, length = keys.length; i < length; i++) {
				const indices = keys[i].split(',');
				edgesArray[2 * i] = parseInt(indices[0]);
				edgesArray[2 * i + 1] = parseInt(indices[1]);
			}
			this._edges = edgesArray;
		}
		return this._edges;
	}

	set edges(edges: Uint32Array) {
		throw new Error(`msh-parser: No edges setter.`);
	}

	get exteriorEdges() {
		if (!this._exteriorEdges) {
			const { isTetMesh, _exteriorFaces } = this; 
			if (!isTetMesh) throw new Error(`msh-parser: MSHMesh.exteriorEdges is not defined for non-tet meshes.`);
			// Calc all exterior edges in mesh, use hash table to cover each edge only once.
			const hash: { [key: string]: boolean } = {};
			for (let i = 0, numFaces = _exteriorFaces!.length; i < numFaces; i++) {
				const faceIndices = _exteriorFaces![i];
				// For triangles, create an edge between each pair of indices in face.
				const numNodes = faceIndices.length;
				for (let j = 0; j < numNodes; j++) {
					for (let k = j + 1; k < numNodes; k++) {
						if (j === k) continue;
						const a = faceIndices[j];
						const b = faceIndices[k];
						const key = `${Math.min(a, b)},${Math.max(a, b)}`;
						hash[key] = true;
					}
				}
			}
			const keys = Object.keys(hash);
			const edgesArray = new Uint32Array(keys.length * 2);
			for (let i = 0, length = keys.length; i < length; i++) {
				const indices = keys[i].split(',');
				edgesArray[2 * i] = parseInt(indices[0]);
				edgesArray[2 * i + 1] = parseInt(indices[1]);
			}
			this._exteriorEdges = edgesArray;
		}
		return this._exteriorEdges;
	}

	set exteriorEdges(exteriorEdges: Uint32Array) {
		throw new Error(`msh-parser: No exteriorEdges setter.`);
	}

	get exteriorFaces() {
		if (!this.isTetMesh || !this._exteriorFaces) throw new Error(`msh-parser: MSHMesh.exteriorFaces is not defined for non-tet meshes.`);
		return this._exteriorFaces;
	}

	set exteriorFaces(exteriorFaces: number[][]) {
		throw new Error(`msh-parser: No exteriorFaces setter.`);
	}

	private static _tetrahedronVolume(indices: number[], nodesArray: Float32Array | Float64Array) {
		const [a, b, c, d] = indices;
		// Calculate the vectors representing the edges of the tetrahedron.
		const v1 = _MSHMesh._vecFromTo(d, a, nodesArray);
		const v2 = _MSHMesh._vecFromTo(d, b, nodesArray);
		const v3 = _MSHMesh._vecFromTo(d, c, nodesArray);
	  
		// Calculate the volume of the tetrahedron using the formula:""
		// (1/6) * |v1 . (v2 x v3)|
		// https://en.wikipedia.org/wiki/Tetrahedron#Volume
		return Math.abs(_MSHMesh._dotProduct(v1, _MSHMesh._crossProduct(v2, v3))) / 6;
	}

	get elementVolumes() {
		if (!this._elementVolumes) {
			const { elements, nodes, isTetMesh } = this;
			if (!isTetMesh) throw new Error(`msh-parser: MSHMesh.elementVolumes is not defined for non-tet meshes.`);
			const numElements = elements.length;
			const volumes = new Float32Array(numElements);
			for (let i = 0; i < numElements; i++) {
				volumes[i] = _MSHMesh._tetrahedronVolume(elements[i], nodes);
			}
			this._elementVolumes = volumes;
		}
		return this._elementVolumes;
	}

	set elementVolumes(elementVolumes: Float32Array) {
		throw new Error(`msh-parser: No elementVolumes setter.`);
	}

	get nodalVolumes() {
		if (!this._nodalVolumes) {
			const { elements, nodes, isTetMesh } = this;
			if (!isTetMesh) throw new Error(`msh-parser: MSHMesh.nodalVolumes is not defined for non-tet meshes.`);
			const { elementVolumes } = this;
			const nodalVolumes = new Float32Array(nodes.length / 3);
			for (let i = 0, numElements = elements.length; i < numElements; i++) {
				const nodeIndices = elements[i];
				const numNodeIndices = nodeIndices.length;
				for (let j = 0; j < numNodeIndices; j++) {
					const nodeIndex = nodeIndices[j];
					// Split element volume evenly across adjacent nodes.
					nodalVolumes[nodeIndex] += elementVolumes[i] / numNodeIndices;
				}
			}
			this._nodalVolumes = nodalVolumes;
		}
		return this._nodalVolumes;
	}

	set nodalVolumes(nodalVolumes: Float32Array) {
		throw new Error(`msh-parser: No nodalVolumes setter.`);
	}

	get numExteriorNodes() {
		if (!this.isTetMesh || !this._numExteriorNodes) throw new Error(`msh-parser: MSHMesh.numExteriorNodes is not defined for non-tet meshes.`);
		return this._numExteriorNodes;
	}

	set numExteriorNodes(numExteriorNodes: number) {
		throw new Error(`msh-parser: No numExteriorNodes setter.`);
	}

	get boundingBox() {
		if (!this._boundingBox) {
			const { nodes } = this;
			const numNodes = nodes.length / 3;
			const min = [Infinity, Infinity, Infinity];
			const max = [-Infinity, -Infinity, -Infinity];
			for (let i = 0; i < numNodes; i++) {
				min[0] = Math.min(min[0], nodes[3 * i]);
				min[1] = Math.min(min[1], nodes[3 * i + 1]);
				min[2] = Math.min(min[2], nodes[3 * i + 2]);
				max[0] = Math.max(max[0], nodes[3 * i]);
				max[1] = Math.max(max[1], nodes[3 * i + 1]);
				max[2] = Math.max(max[2], nodes[3 * i + 2]);
			}
			this._boundingBox = {
				min, max,
			};
		}
		return this._boundingBox;
	}

	set boundingBox(boundingBox: { min: number[], max: number[] }) {
		throw new Error(`msh-parser: No boundingBox setter.`);
	}

	/**
	 * Scales nodes to unit bounding box and centers around origin.
	 */
	scaleNodesToUnitBoundingBox() {
		const { nodes, boundingBox } = this;
		const { min, max } = boundingBox;
		const diff = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
		const center = [(max[0] + min[0]) / 2, (max[1] + min[1]) / 2, (max[2] + min[2]) / 2];
		const scale = Math.max(diff[0], diff[1], diff[2]);
		const numNodes = nodes.length / 3;
		for (let i = 0; i < numNodes; i++) {
			for (let j = 0; j < 3; j++) {
				// Uniform scale.
				nodes[3 * i + j] = (nodes[3 * i + j] - center[j]) / scale;
			}
		}
		delete this._boundingBox;
		delete this._nodalVolumes;
		delete this._elementVolumes;
		return this;
	}
}

// Export just the type, keep the class private.
export type MSHMesh = {
	readonly nodes: Float64Array | Float32Array;
	readonly elements: number[][];
	readonly edges: Uint32Array;
	readonly exteriorEdges: Uint32Array;
	readonly exteriorFaces: number[][];
	readonly elementVolumes: Float32Array;
	readonly nodalVolumes: Float32Array;
	readonly isTetMesh: boolean;
	readonly numExteriorNodes: number;
	readonly boundingBox: { min: number[], max: number[] };
	scaleNodesToUnitBoundingBox: () => MSHMesh;
}
