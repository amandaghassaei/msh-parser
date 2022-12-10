export type MSHData = {
	nodesArray: Float64Array | Float32Array,
	elementsArray: number[][],
	isTetMesh: boolean,
	exteriorFacesArray?: number[][],
	numExteriorNodes?: number,
};

// https://github.com/PyMesh/PyMesh/blob/main/src/IO/MshLoader.cpp
// Define the MSHParser class
export class MSHParser {
	// FileReader instance to load the msh file.
	static reader?: FileReader;
	// TextDecoder instance to decode the header as UTF-8.
	static decoder = new TextDecoder();
	// Header offset.
	_offset = 0;

	// Constructor function.
	constructor() {
	}

	private _parseNextLineAsUTF8(uint8Array: Uint8Array) {
		// Find the first newline character in the uint8Array.
		const newlineIndex = uint8Array.indexOf(10, this._offset); // 10 is the ASCII code for the newline character.
		// Decode the uint8Array as a UTF-8 encoded string up until the newline character.
		const text = MSHParser.decoder.decode(uint8Array.subarray(this._offset, newlineIndex));
		// Update offset.
		this._offset = newlineIndex + 1;
		// Return the decoded string.
		return text;
	}

	private static _throwInvalidFormatError() {
		throw new Error('Invalid .msh file format.');
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
				throw new Error(`Element type ${elementType} is not supported yet.`);
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
	
	private _parse(arrayBuffer: ArrayBuffer) {
		this._offset = 0; // Reset header offset.
		const dataView = new DataView(arrayBuffer);
		// Create a Uint8Array that references the same underlying memory as the DataView.
		const uint8Array = new Uint8Array(dataView.buffer);

		// Parse header.
		if (this._parseNextLineAsUTF8(uint8Array) !== '$MeshFormat') MSHParser._throwInvalidFormatError();
		const [ version, type, dataSize ] = this._parseNextLineAsUTF8(uint8Array).split(' ').map(el => parseFloat(el));
		if (isNaN(version) || isNaN(type) || isNaN(dataSize)) MSHParser._throwInvalidFormatError();
		if (dataSize !== 8 && dataSize !== 4) throw new Error(`This library currently parses .msh files with data size === 8 or 4.  Current file has data size = ${dataSize}. Please submit an issue to the GitHub repo if you encounter this error and attach a sample file.`);
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
		if (this._parseNextLineAsUTF8(uint8Array) !== '$EndMeshFormat') MSHParser._throwInvalidFormatError();

		// Read the number of nodes.
		if (this._parseNextLineAsUTF8(uint8Array) !== '$Nodes') MSHParser._throwInvalidFormatError();
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
			throw new Error('This library does not currently parse non-binary .msh files.  Please submit an issue to the GitHub repo if you encounter this error and attach a sample file.');
		}
		// Check that all nodes are finite.
		for (let i = 0; i < nodesArray.length; i++) {
			if (!MSHParser._isFiniteNumber(nodesArray[i])) throw new Error('NaN or Inf detected in input file.');
		}
		if (this._parseNextLineAsUTF8(uint8Array) !== '$EndNodes') MSHParser._throwInvalidFormatError();

		if (this._parseNextLineAsUTF8(uint8Array) !== '$Elements') MSHParser._throwInvalidFormatError();
		

		// Read the number of elements.
		const numElements = parseInt(this._parseNextLineAsUTF8(uint8Array));
		const elementsArray: number[][] = [];
		for (let i = 0; i < numElements; i++) {
			elementsArray.push([]);
		}
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
				const numElementNodes = MSHParser._numNodesPerElementType(elementType);
				// Update the current file's byte offset.
				this._offset += 12;
				for (let i = 0; i < elementNumElements; i++) {
					const index = dataView.getInt32(this._offset, isLE) - 1; // The .msh index is 1-indexed.
					if (index < 0 || index >= numElements) throw new Error(`Invalid element index ${index} for numElements === ${numElements}.`);
					this._offset += 4;
					for (let j = 0; j < elementNumTags; j++) {
						const tag = dataView.getInt32(this._offset, isLE);
						if (!tagWarning) {
							tagWarning = true;
							console.warn('This library does not currently parse element tags.');
						}
						// Update the current file's byte offset.
						this._offset += 4;
					}
					
					const nodeIndices = elementsArray[index];
					for (let j = 0; j < numElementNodes; j++) {
						const nodeIndex = dataView.getInt32(this._offset, isLE) - 1; // The .msh index is 1-indexed.
						if (!MSHParser._isFiniteNumber(nodeIndex)) throw new Error('NaN or Inf detected in input file.');
						if (nodeIndex < 0 || nodeIndex >= numNodes) throw new Error(`Invalid node index ${nodeIndex} for numNodes === ${numNodes}.`);
						nodeIndices.push(nodeIndex);
						// Update the current file's byte offset.
						this._offset += 4;
					}
				}

				elementIndex += elementNumElements;
			}
		} else {
			throw new Error('This library does not currently parse non-binary .msh files.  Please submit an issue to the GitHub repo if you encounter this error and attach a sample file.');
		}
		if (this._parseNextLineAsUTF8(uint8Array) !== '$EndElements') MSHParser._throwInvalidFormatError();

		const mesh: MSHData = {
			nodesArray,
			elementsArray,
			isTetMesh,
		};

		// TODO: make this work for non-tet.
		if (isTetMesh) {
			// For tet meshes, calculate exterior faces.
			// First find all faces that are covered only once, these are on the boundary.
			const hash: { [key: string]: number[] } = {};
			for (let i = 0; i < numElements; i++) {
				const indices = elementsArray[i];
				for (let j = 0; j < indices.length; j++) {
					const key = MSHParser._makeTriHash(indices[j], indices[(j + 1) % 4], indices[(j + 2) % 4]);
					if (hash[key]) {
						hash[key].push(indices[(j + 3) % indices.length]);
						if (hash[key].length > 2) {
							throw new Error(`Hit face ${key} more than twice.`);
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
				const orientation = MSHParser._dotProduct(MSHParser._crossProduct(
					MSHParser._vecFromTo(a, b, nodesArray),
					MSHParser._vecFromTo(a, c, nodesArray),
				), MSHParser._vecFromTo(a, d, nodesArray));
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
			mesh.numExteriorNodes = currentIndex;
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
			mesh.nodesArray = newNodesArray;
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
			mesh.exteriorFacesArray = exteriorFacesArray;
		}
		
		return mesh;
	}

	parseSync(url: string) {
		if (typeof window !== 'undefined') {
			throw new Error('Cannot call parser.parseSync() from a browser.');
		}
		// Load the file with fs.
		const fs = require('fs');
		const fileBuffer = fs.readFileSync(url);
		return this._parse(Buffer.from(fileBuffer).buffer);
	}

	parseAsync(urlOrFile: string | File) {
		const self = this;
		return new Promise<MSHData>((resolve) => {
			self.parse(urlOrFile, (mesh) => {
				resolve(mesh);
			});
		});
	}

	// Parse the .msh file at the specified file path of File object.
	// Made this compatible with Node and the browser, maybe there is a better way?
	parse(urlOrFile: string | File, callback: (mesh: MSHData) => void) {
		const self = this;
		if (typeof urlOrFile === 'string') {
			if (typeof window !== 'undefined') {
				// Load the file with XMLHttpRequest.
				const request = new XMLHttpRequest();
				request.open('GET', urlOrFile, true);
				request.responseType = 'arraybuffer';
				request.onload = () => {
					const mesh = self._parse(request.response as ArrayBuffer);
					// Call the callback function with the parsed mesh data.
					callback(mesh);
				};
				request.send();
			} else {
				// Call the callback function with the parsed mesh data.
				callback(this.parseSync(urlOrFile));
			}
		} else {
			// We only ever hit this in the browser.
			// Load the file with FileReader.
			if (!MSHParser.reader) MSHParser.reader = new FileReader();
			MSHParser.reader.onload = () => {
				const mesh = self._parse(MSHParser.reader!.result as ArrayBuffer);
				// Call the callback function with the parsed mesh data.
				callback(mesh);
			}
			MSHParser.reader.readAsArrayBuffer(urlOrFile);
		}
	}

	static calculateEdges(mesh: MSHData) {
		const { elementsArray, isTetMesh } = mesh;
		if (!isTetMesh) throw new Error(`MSHParser.calculateEdges() is not defined for non-tet meshes.`);
		// Calc all edges in mesh, use hash table to cover each edge only once.
		const hash: { [key: string]: boolean } = {};
		for (let i = 0, numElements = elementsArray.length; i < numElements; i++) {
			const elementIndices = elementsArray[i];
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
		return edgesArray;
	}

	private static _tetrahedronVolume(indices: number[], nodesArray: Float32Array | Float64Array) {
		const [a, b, c, d] = indices;
		// Calculate the vectors representing the edges of the tetrahedron.
		const v1 = MSHParser._vecFromTo(d, a, nodesArray);
		const v2 = MSHParser._vecFromTo(d, b, nodesArray);
		const v3 = MSHParser._vecFromTo(d, c, nodesArray);
	  
		// Calculate the volume of the tetrahedron using the formula:""
		// (1/6) * |v1 . (v2 x v3)|
		// https://en.wikipedia.org/wiki/Tetrahedron#Volume
		return Math.abs(MSHParser._dotProduct(v1, MSHParser._crossProduct(v2, v3))) / 6;
	}

	static calculateElementVolumes(mesh: MSHData) {
		const { elementsArray, nodesArray, isTetMesh } = mesh;
		if (!isTetMesh) throw new Error(`MSHParser.calculateElementVolumes() is not defined for non-tet meshes.`);
		const numElements = elementsArray.length;
		const volumes = new Float32Array(numElements);
		for (let i = 0; i < numElements; i++) {
			volumes[i] = MSHParser._tetrahedronVolume(elementsArray[i], nodesArray);
		}
		return volumes;
	}
}