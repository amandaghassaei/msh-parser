import { calcBoundingBox, scaleVerticesToUnitBoundingBox, calcEdgesIndicesFromNestedIndexedFaces, makeEdgeHash, makeTriangleFaceHash, } from '@amandaghassaei/3d-mesh-utils';
/**
 * Synchronously parse an already loaded .msh file buffer.
 */
export function parseMSH(data) {
    return new _MSHMesh(data);
}
/**
 * Load and parse .msh asynchronously from the specified url or File object (returns Promise).
 */
export function loadMSHAsync(urlOrFile) {
    return new Promise((resolve) => {
        loadMSH(urlOrFile, (mesh) => {
            resolve(mesh);
        });
    });
}
/**
 * Load and parse .msh from the specified url or File object.
 */
export function loadMSH(urlOrFile, callback) {
    if (typeof urlOrFile === 'string') {
        // Made this compatible with Node and the browser, maybe there is a better way?
        /* c8 ignore start */
        if (typeof window !== 'undefined') {
            // Browser.
            // Load the file with XMLHttpRequest.
            const request = new XMLHttpRequest();
            request.open('GET', urlOrFile, true);
            request.responseType = 'arraybuffer';
            request.onload = () => {
                const mesh = parseMSH(request.response);
                // Call the callback function with the parsed mesh data.
                callback(mesh);
            };
            request.send();
            /* c8 ignore stop */
        }
        else {
            // Call the callback function with the parsed mesh data.
            import('fs').then((fs) => {
                const buffer = fs.readFileSync(urlOrFile);
                callback(parseMSH(buffer));
            });
        }
        /* c8 ignore start */
    }
    else {
        // We only ever hit this in the browser.
        // Load the file with FileReader.
        const reader = new FileReader();
        reader.onload = () => {
            const mesh = parseMSH(reader.result);
            // Call the callback function with the parsed mesh data.
            callback(mesh);
        };
        reader.readAsArrayBuffer(urlOrFile);
    }
    /* c8 ignore stop */
}
// Based on: https://github.com/PyMesh/PyMesh/blob/main/src/IO/MshLoader.cpp
// Define the MSHMesh class.
class _MSHMesh {
    constructor(data) {
        // Header offset.
        this._offset = 0;
        const arrayBuffer = data.buffer ? new Uint8Array(data).buffer : data;
        const dataView = new DataView(arrayBuffer);
        // Create a Uint8Array that references the same underlying memory as the DataView.
        const uint8Array = new Uint8Array(dataView.buffer);
        // Parse header.
        /* c8 ignore next */
        if (this._parseNextLineAsUTF8(uint8Array) !== '$MeshFormat')
            _MSHMesh._throwInvalidFormatError();
        const [version, type, dataSize] = this._parseNextLineAsUTF8(uint8Array).split(' ').map(el => parseFloat(el));
        /* c8 ignore next */
        if (isNaN(version) || isNaN(type) || isNaN(dataSize))
            _MSHMesh._throwInvalidFormatError();
        /* c8 ignore next */
        if (dataSize !== 8 && dataSize !== 4)
            throw new Error(`msh-parser: This library currently parses .msh files with data size === 8 or 4.  Current file has data size = ${dataSize}. Please submit an issue to the GitHub repo if you encounter this error and attach a sample file.`);
        const doublePrecision = dataSize === 8;
        const isAscii = type === 0;
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
        /* c8 ignore next */
        if (this._parseNextLineAsUTF8(uint8Array) !== '$EndMeshFormat')
            _MSHMesh._throwInvalidFormatError();
        // Read the number of nodes.
        /* c8 ignore next */
        if (this._parseNextLineAsUTF8(uint8Array) !== '$Nodes')
            _MSHMesh._throwInvalidFormatError();
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
                }
                else {
                    nodesArray[3 * index] = dataView.getFloat32(this._offset + 4, isLE);
                    nodesArray[3 * index + 1] = dataView.getFloat32(this._offset + 4 + dataSize, isLE);
                    nodesArray[3 * index + 2] = dataView.getFloat32(this._offset + 4 + 2 * dataSize, isLE);
                }
                // Update the current file's byte offset.
                this._offset += 4 + 3 * dataSize;
            }
        }
        else if (isAscii) {
            for (let i = 0; i < numNodes; i++) {
                // Read the current node.
                const nodeString = this._parseNextLineAsUTF8(uint8Array);
                const nodeValues = nodeString.trim().split(/\s+/);
                if (nodeValues.length !== 4)
                    _MSHMesh._throwInvalidFormatError();
                const index = parseInt(nodeValues[0]) - 1; // The .msh node index is 1-indexed.
                nodesArray[3 * index] = parseFloat(nodeValues[1]);
                nodesArray[3 * index + 1] = parseFloat(nodeValues[2]);
                nodesArray[3 * index + 2] = parseFloat(nodeValues[3]);
            }
            /* c8 ignore next 3 */
        }
        else {
            throw new Error('msh-parser: This library currently only parses binary and ascii .msh files.  Please submit an issue to the GitHub repo if you encounter this error and attach a sample file.');
        }
        // Check that all nodes are finite.
        for (let i = 0; i < nodesArray.length; i++) {
            /* c8 ignore next */
            if (!_MSHMesh._isFiniteNumber(nodesArray[i]))
                throw new Error('msh-parser: NaN or Inf detected in input file.');
        }
        /* c8 ignore next */
        if (this._parseNextLineAsUTF8(uint8Array) !== '$EndNodes')
            _MSHMesh._throwInvalidFormatError();
        this._nodes = nodesArray;
        /* c8 ignore next */
        if (this._parseNextLineAsUTF8(uint8Array) !== '$Elements')
            _MSHMesh._throwInvalidFormatError();
        // Read the number of elementIndices.
        const numElements = parseInt(this._parseNextLineAsUTF8(uint8Array));
        const elementIndices = [];
        for (let i = 0; i < numElements; i++) {
            elementIndices.push([]);
        }
        this._elementIndices = elementIndices;
        // Check if all elementIndices are tetrahedra.
        let isTetMesh = true;
        // Loop through the elementIndices.
        let elementIndex = 0;
        let tagWarning = false;
        if (isBinary) {
            while (elementIndex < numElements) {
                // Parse element header.
                const elementType = dataView.getInt32(this._offset, isLE);
                const elementNumElements = dataView.getInt32(this._offset + 4, isLE);
                const elementNumTags = dataView.getInt32(this._offset + 8, isLE);
                /* c8 ignore next */
                if (elementType !== 4)
                    isTetMesh = false;
                const numElementNodes = _MSHMesh._numNodesPerElementType(elementType);
                // Update the current file's byte offset.
                this._offset += 12;
                for (let i = 0; i < elementNumElements; i++) {
                    const index = dataView.getInt32(this._offset, isLE) - 1; // The .msh index is 1-indexed.
                    /* c8 ignore next */
                    if (index < 0 || index >= numElements)
                        throw new Error(`msh-parser: Invalid element index ${index} for numElements === ${numElements}.`);
                    this._offset += 4;
                    /* c8 ignore start */
                    for (let j = 0; j < elementNumTags; j++) {
                        // const tag = dataView.getInt32(this._offset, isLE);
                        if (!tagWarning) {
                            tagWarning = true;
                            console.warn('msh-parser: This library does not currently parse element tags.');
                        }
                        // Update the current file's byte offset.
                        this._offset += 4;
                    }
                    /* c8 ignore stop */
                    const nodeIndices = elementIndices[index];
                    for (let j = 0; j < numElementNodes; j++) {
                        const nodeIndex = dataView.getInt32(this._offset, isLE) - 1; // The .msh index is 1-indexed.
                        /* c8 ignore next */
                        if (!_MSHMesh._isFiniteNumber(nodeIndex))
                            throw new Error('msh-parser: NaN or Inf detected in input file.');
                        /* c8 ignore next */
                        if (nodeIndex < 0 || nodeIndex >= numNodes)
                            throw new Error(`msh-parser: Invalid node index ${nodeIndex} for numNodes === ${numNodes}.`);
                        nodeIndices.push(nodeIndex);
                        // Update the current file's byte offset.
                        this._offset += 4;
                    }
                }
                elementIndex += elementNumElements;
            }
        }
        else if (isAscii) {
            while (elementIndex < numElements) {
                // Parse element header.
                const elementString = this._parseNextLineAsUTF8(uint8Array);
                const elementValues = elementString.trim().split(/\s+/);
                const elementType = parseInt(elementValues[1]);
                const elementNumTags = parseInt(elementValues[2]);
                /* c8 ignore next */
                if (elementType !== 4)
                    isTetMesh = false;
                const numElementNodes = _MSHMesh._numNodesPerElementType(elementType);
                const elementNumElements = 1;
                for (let i = 0; i < elementNumElements; i++) {
                    const index = parseInt(elementValues[0]) - 1; // The .msh index is 1-indexed.
                    /* c8 ignore next */
                    if (index < 0 || index >= numElements)
                        throw new Error(`msh-parser: Invalid element index ${index} for numElements === ${numElements}.`);
                    /* c8 ignore start */
                    for (let j = 0; j < elementNumTags; j++) {
                        // const tag = parseFloat(elementValues[3 + j]);
                        if (!tagWarning) {
                            tagWarning = true;
                            console.warn('msh-parser: This library does not currently parse element tags.');
                        }
                    }
                    /* c8 ignore stop */
                    const nodeIndices = elementIndices[index];
                    for (let j = 0; j < numElementNodes; j++) {
                        const nodeIndex = parseInt(elementValues[3 + elementNumTags + j]) - 1; // The .msh index is 1-indexed.
                        /* c8 ignore next */
                        if (!_MSHMesh._isFiniteNumber(nodeIndex))
                            throw new Error('msh-parser: NaN or Inf detected in input file.');
                        /* c8 ignore next */
                        if (nodeIndex < 0 || nodeIndex >= numNodes)
                            throw new Error(`msh-parser: Invalid node index ${nodeIndex} for numNodes === ${numNodes}.`);
                        nodeIndices.push(nodeIndex);
                    }
                }
                elementIndex += elementNumElements;
            }
            /* c8 ignore next 3 */
        }
        else {
            throw new Error('msh-parser: This library currently only parses binary and ascii .msh files.  Please submit an issue to the GitHub repo if you encounter this error and attach a sample file.');
        }
        /* c8 ignore next */
        if (this._parseNextLineAsUTF8(uint8Array) !== '$EndElements')
            _MSHMesh._throwInvalidFormatError();
        this._isTetMesh = isTetMesh;
        this._calcExteriorFacesIndices();
    }
    _calcExteriorFacesIndices() {
        const { nodes, elementIndices, isTetMesh } = this;
        const numNodes = nodes.length / 3;
        const numElements = elementIndices.length;
        // TODO: make this work for non-tet.
        if (isTetMesh) {
            // For tet meshes, calculate exterior faces.
            // First find all faces that are covered only once, these are on the boundary.
            const hash = {};
            for (let i = 0; i < numElements; i++) {
                const indices = elementIndices[i];
                for (let j = 0; j < indices.length; j++) {
                    const key = makeTriangleFaceHash(indices[j], indices[(j + 1) % 4], indices[(j + 2) % 4]);
                    if (hash[key]) {
                        hash[key].push(indices[(j + 3) % indices.length]);
                        /* c8 ignore next 3 */
                        if (hash[key].length > 2) {
                            throw new Error(`msh-parser: Hit face ${key} more than twice.`);
                        }
                    }
                    else {
                        hash[key] = [indices[(j + 3) % 4]];
                    }
                }
            }
            const keys = Object.keys(hash);
            const exteriorFacesArray = [];
            const exteriorNodes = new Uint8Array(numNodes);
            for (let i = 0, numKeys = keys.length; i < numKeys; i++) {
                const key = keys[i];
                if (hash[key].length !== 1)
                    continue;
                const indices = keys[i].split(',');
                const a = parseInt(indices[0]);
                const b = parseInt(indices[1]);
                const c = parseInt(indices[2]);
                // d is the internal node of this tet.
                const d = hash[key][0];
                // Use d to calculate the winding order of the triangle.
                const orientation = _MSHMesh._dotProduct(_MSHMesh._crossProduct(_MSHMesh._vecFromTo(a, b, nodes), _MSHMesh._vecFromTo(a, c, nodes)), _MSHMesh._vecFromTo(a, d, nodes));
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
            const newNodesArray = nodes.slice();
            for (let i = 0; i < numNodes; i++) {
                for (let j = 0; j < 3; j++) {
                    newNodesArray[3 * newIndices[i] + j] = nodes[3 * i + j];
                }
            }
            this._nodes = newNodesArray;
            for (let i = 0; i < numElements; i++) {
                const indices = elementIndices[i];
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
            this._exteriorFacesIndices = exteriorFacesArray;
        }
    }
    get nodes() {
        return this._nodes;
    }
    set nodes(nodes) {
        throw new Error(`msh-parser: No nodes setter.`);
    }
    get elementIndices() {
        return this._elementIndices;
    }
    set elementIndices(elementIndices) {
        throw new Error(`msh-parser: No elementIndices setter.`);
    }
    get isTetMesh() {
        return this._isTetMesh;
    }
    set isTetMesh(isTetMesh) {
        throw new Error(`msh-parser: No isTetMesh setter.`);
    }
    _parseNextLineAsUTF8(uint8Array) {
        // Find the first newline character in the uint8Array.
        const newlineIndex = uint8Array.indexOf(10, this._offset); // 10 is the ASCII code for the newline character.
        // Decode the uint8Array as a UTF-8 encoded string up until the newline character.
        const text = _MSHMesh.decoder.decode(uint8Array.subarray(this._offset, newlineIndex));
        // Update offset.
        this._offset = newlineIndex + 1;
        // Return the decoded string.
        return text;
    }
    /* c8 ignore next 3 */
    static _throwInvalidFormatError() {
        throw new Error('msh-parser: Invalid .msh file format.');
    }
    static _isFiniteNumber(number) {
        return !isNaN(number) && number !== Infinity && number !== -Infinity;
    }
    static _numNodesPerElementType(elementType) {
        switch (elementType) {
            case 2:
                return 3; // Triangle
            case 3:
                return 4; // Quad
            case 4:
                return 4; // Tetrahedron
            case 5:
                return 8; // Hexahedron
            /* c8 ignore next 2 */
            default:
                throw new Error(`msh-parser: Element type ${elementType} is not supported yet.`);
        }
    }
    // Calculates the dot product of two vectors.
    static _dotProduct(vector1, vector2) {
        return vector1[0] * vector2[0] + vector1[1] * vector2[1] + vector1[2] * vector2[2];
    }
    // Calculates the cross product of two vectors.
    static _crossProduct(vector1, vector2) {
        return [
            vector1[1] * vector2[2] - vector1[2] * vector2[1],
            vector1[2] * vector2[0] - vector1[0] * vector2[2],
            vector1[0] * vector2[1] - vector1[1] * vector2[0]
        ];
    }
    static _vecFromTo(from, to, nodesArray) {
        return [
            nodesArray[3 * to] - nodesArray[3 * from],
            nodesArray[3 * to + 1] - nodesArray[3 * from + 1],
            nodesArray[3 * to + 2] - nodesArray[3 * from + 2],
        ];
    }
    get edgesIndices() {
        if (!this._edgesIndices) {
            const { elementIndices, isTetMesh } = this;
            /* c8 ignore next */
            if (!isTetMesh)
                throw new Error(`msh-parser: MSHMesh.edgesIndices is not defined for non-tet meshes.`);
            // Calc all edgesIndices in mesh, use hash table to cover each edge only once.
            const edgesIndicesHash = {};
            const edgesIndices = [];
            for (let i = 0, numElements = elementIndices.length; i < numElements; i++) {
                const element = elementIndices[i];
                // For tetrahedra, create an edge between each pair of nodes in element.
                const numNodes = element.length;
                for (let j = 0; j < numNodes; j++) {
                    for (let k = j + 1; k < numNodes; k++) {
                        const a = element[j];
                        const b = element[k];
                        const key = makeEdgeHash(a, b);
                        // Only add each edge once.
                        if (edgesIndicesHash[key] === undefined) {
                            edgesIndicesHash[key] = true;
                            edgesIndices.push(a, b);
                        }
                    }
                }
            }
            this._edgesIndices = new Uint32Array(edgesIndices);
            ;
        }
        return this._edgesIndices;
    }
    set edgesIndices(edgesIndices) {
        throw new Error(`msh-parser: No edgesIndices setter.`);
    }
    get exteriorEdgesIndices() {
        if (!this._exteriorEdgesIndices) {
            const { isTetMesh, _exteriorFacesIndices } = this;
            /* c8 ignore next */
            if (!isTetMesh)
                throw new Error(`msh-parser: MSHMesh.exteriorEdgesIndices is not defined for non-tet meshes.`);
            const edgesIndices = calcEdgesIndicesFromNestedIndexedFaces({ facesIndices: _exteriorFacesIndices });
            this._exteriorEdgesIndices = new Uint32Array(edgesIndices);
        }
        return this._exteriorEdgesIndices;
    }
    set exteriorEdgesIndices(exteriorEdgesIndices) {
        throw new Error(`msh-parser: No exteriorEdgesIndices setter.`);
    }
    get exteriorFacesIndices() {
        /* c8 ignore next */
        if (!this.isTetMesh || !this._exteriorFacesIndices)
            throw new Error(`msh-parser: MSHMesh.exteriorFacesIndices is not defined for non-tet meshes.`);
        return this._exteriorFacesIndices;
    }
    set exteriorFacesIndices(exteriorFacesIndices) {
        throw new Error(`msh-parser: No exteriorFacesIndices setter.`);
    }
    static _tetrahedronVolume(indices, nodesArray) {
        const [a, b, c, d] = indices;
        // Calculate the vectors representing the edgesIndices of the tetrahedron.
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
            const { elementIndices, nodes, isTetMesh } = this;
            /* c8 ignore next */
            if (!isTetMesh)
                throw new Error(`msh-parser: MSHMesh.elementVolumes is not defined for non-tet meshes.`);
            const numElements = elementIndices.length;
            const volumes = new Float32Array(numElements);
            for (let i = 0; i < numElements; i++) {
                volumes[i] = _MSHMesh._tetrahedronVolume(elementIndices[i], nodes);
            }
            this._elementVolumes = volumes;
        }
        return this._elementVolumes;
    }
    set elementVolumes(elementVolumes) {
        throw new Error(`msh-parser: No elementVolumes setter.`);
    }
    get nodalVolumes() {
        if (!this._nodalVolumes) {
            const { elementIndices, nodes, isTetMesh } = this;
            /* c8 ignore next */
            if (!isTetMesh)
                throw new Error(`msh-parser: MSHMesh.nodalVolumes is not defined for non-tet meshes.`);
            const { elementVolumes } = this;
            const nodalVolumes = new Float32Array(nodes.length / 3);
            for (let i = 0, numElements = elementIndices.length; i < numElements; i++) {
                const nodeIndices = elementIndices[i];
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
    set nodalVolumes(nodalVolumes) {
        throw new Error(`msh-parser: No nodalVolumes setter.`);
    }
    get numExteriorNodes() {
        /* c8 ignore next */
        if (!this.isTetMesh || !this._numExteriorNodes)
            throw new Error(`msh-parser: MSHMesh.numExteriorNodes is not defined for non-tet meshes.`);
        return this._numExteriorNodes;
    }
    set numExteriorNodes(numExteriorNodes) {
        throw new Error(`msh-parser: No numExteriorNodes setter.`);
    }
    get boundingBox() {
        if (!this._boundingBox) {
            this._boundingBox = calcBoundingBox({
                vertices: this.nodes,
            });
        }
        return this._boundingBox;
    }
    set boundingBox(boundingBox) {
        throw new Error(`msh-parser: No boundingBox setter.`);
    }
    /**
     * Removes non-tetrahedron elements from the mesh.
     * @returns this
     */
    removeNonTetElements() {
        const { elementIndices, isTetMesh } = this;
        if (isTetMesh)
            return this;
        const tetElementIndices = [];
        for (let i = elementIndices.length - 1; i >= 0; i--) {
            const element = elementIndices[i];
            if (element.length === 4) {
                tetElementIndices.push(element);
            }
        }
        this._elementIndices = tetElementIndices;
        this._isTetMesh = true;
        delete this._edgesIndices;
        delete this._exteriorEdgesIndices;
        delete this._elementVolumes;
        delete this._nodalVolumes;
        delete this._boundingBox;
        this._calcExteriorFacesIndices();
        return this;
    }
    /**
     * Scales nodes to unit bounding box and centers around origin.
     * @returns this
     */
    scaleNodesToUnitBoundingBox() {
        scaleVerticesToUnitBoundingBox({
            vertices: this.nodes,
            boundingBox: this.boundingBox,
        });
        delete this._boundingBox;
        delete this._nodalVolumes;
        delete this._elementVolumes;
        return this;
    }
}
// TextDecoder instance to decode the header as UTF-8.
_MSHMesh.decoder = new TextDecoder();
//# sourceMappingURL=msh-parser.js.map