(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.MSHParserLib = {}));
})(this, (function (exports) { 'use strict';

    /**
     * Synchronously parse an already loaded .msh file buffer.
     */
    function parseMsh(data) {
        data = data.buffer ? new Uint8Array(data).buffer : data;
        return new _MSHMesh(data);
    }
    /**
     * Load and parse .msh asynchronously from the specified url or File object (returns Promise).
     */
    function loadMshAsync(urlOrFile) {
        return new Promise(function (resolve) {
            loadMsh(urlOrFile, function (mesh) {
                resolve(mesh);
            });
        });
    }
    /**
     * Load and parse .msh from the specified url or File object.
     */
    function loadMsh(urlOrFile, callback) {
        if (typeof urlOrFile === 'string') {
            // Made this compatible with Node and the browser, maybe there is a better way?
            if (typeof window !== 'undefined') {
                // Load the file with XMLHttpRequest.
                var request_1 = new XMLHttpRequest();
                request_1.open('GET', urlOrFile, true);
                request_1.responseType = 'arraybuffer';
                request_1.onload = function () {
                    var mesh = new _MSHMesh(request_1.response);
                    // Call the callback function with the parsed mesh data.
                    callback(mesh);
                };
                request_1.send();
            }
            else {
                // Call the callback function with the parsed mesh data.
                import('fs').then(function (fs) {
                    var buffer = fs.readFileSync(urlOrFile);
                    callback(new _MSHMesh(new Uint8Array(buffer).buffer));
                });
            }
        }
        else {
            // We only ever hit this in the browser.
            // Load the file with FileReader.
            var reader_1 = new FileReader();
            reader_1.onload = function () {
                var mesh = new _MSHMesh(reader_1.result);
                // Call the callback function with the parsed mesh data.
                callback(mesh);
            };
            reader_1.readAsArrayBuffer(urlOrFile);
        }
    }
    // Based on: https://github.com/PyMesh/PyMesh/blob/main/src/IO/MshLoader.cpp
    // Define the MSHMesh class.
    var _MSHMesh = /** @class */ (function () {
        function _MSHMesh(arrayBuffer) {
            // Header offset.
            this._offset = 0;
            var dataView = new DataView(arrayBuffer);
            // Create a Uint8Array that references the same underlying memory as the DataView.
            var uint8Array = new Uint8Array(dataView.buffer);
            // Parse header.
            if (this._parseNextLineAsUTF8(uint8Array) !== '$MeshFormat')
                _MSHMesh._throwInvalidFormatError();
            var _a = this._parseNextLineAsUTF8(uint8Array).split(' ').map(function (el) { return parseFloat(el); }), version = _a[0], type = _a[1], dataSize = _a[2];
            if (isNaN(version) || isNaN(type) || isNaN(dataSize))
                _MSHMesh._throwInvalidFormatError();
            if (dataSize !== 8 && dataSize !== 4)
                throw new Error("msh-parser: This library currently parses .msh files with data size === 8 or 4.  Current file has data size = ".concat(dataSize, ". Please submit an issue to the GitHub repo if you encounter this error and attach a sample file."));
            var doublePrecision = dataSize === 8;
            var isBinary = type === 1;
            var isLE = false;
            if (isBinary) {
                // Read in extra info from binary header.
                // TODO: how do we know to read as LE here?
                if (dataView.getInt32(this._offset, true) === 1) {
                    // Read as LE.
                    isLE = true;
                }
                this._offset += 4;
            }
            if (this._parseNextLineAsUTF8(uint8Array) !== '$EndMeshFormat')
                _MSHMesh._throwInvalidFormatError();
            // Read the number of nodes.
            if (this._parseNextLineAsUTF8(uint8Array) !== '$Nodes')
                _MSHMesh._throwInvalidFormatError();
            var numNodes = parseInt(this._parseNextLineAsUTF8(uint8Array));
            // Loop through the nodes.
            var nodesArray = doublePrecision ? new Float64Array(3 * numNodes) : new Float32Array(3 * numNodes);
            if (isBinary) {
                for (var i = 0; i < numNodes; i++) {
                    // Read the current node.
                    var index = dataView.getInt32(this._offset, isLE) - 1; // The .msh node index is 1-indexed.
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
            else {
                throw new Error('msh-parser: This library does not currently parse non-binary .msh files.  Please submit an issue to the GitHub repo if you encounter this error and attach a sample file.');
            }
            // Check that all nodes are finite.
            for (var i = 0; i < nodesArray.length; i++) {
                if (!_MSHMesh._isFiniteNumber(nodesArray[i]))
                    throw new Error('msh-parser: NaN or Inf detected in input file.');
            }
            if (this._parseNextLineAsUTF8(uint8Array) !== '$EndNodes')
                _MSHMesh._throwInvalidFormatError();
            this._nodes = nodesArray;
            if (this._parseNextLineAsUTF8(uint8Array) !== '$Elements')
                _MSHMesh._throwInvalidFormatError();
            // Read the number of elements.
            var numElements = parseInt(this._parseNextLineAsUTF8(uint8Array));
            var elementsArray = [];
            for (var i = 0; i < numElements; i++) {
                elementsArray.push([]);
            }
            this.elements = elementsArray;
            // Check if all elements are tetrahedra.
            var isTetMesh = true;
            // Loop through the elements.
            var elementIndex = 0;
            var tagWarning = false;
            if (isBinary) {
                while (elementIndex < numElements) {
                    // Parse element header.
                    var elementType = dataView.getInt32(this._offset, isLE);
                    var elementNumElements = dataView.getInt32(this._offset + 4, isLE);
                    var elementNumTags = dataView.getInt32(this._offset + 8, isLE);
                    if (elementType !== 4)
                        isTetMesh = false;
                    var numElementNodes = _MSHMesh._numNodesPerElementType(elementType);
                    // Update the current file's byte offset.
                    this._offset += 12;
                    for (var i = 0; i < elementNumElements; i++) {
                        var index = dataView.getInt32(this._offset, isLE) - 1; // The .msh index is 1-indexed.
                        if (index < 0 || index >= numElements)
                            throw new Error("msh-parser: Invalid element index ".concat(index, " for numElements === ").concat(numElements, "."));
                        this._offset += 4;
                        for (var j = 0; j < elementNumTags; j++) {
                            dataView.getInt32(this._offset, isLE);
                            if (!tagWarning) {
                                tagWarning = true;
                                console.warn('msh-parser: This library does not currently parse element tags.');
                            }
                            // Update the current file's byte offset.
                            this._offset += 4;
                        }
                        var nodeIndices = elementsArray[index];
                        for (var j = 0; j < numElementNodes; j++) {
                            var nodeIndex = dataView.getInt32(this._offset, isLE) - 1; // The .msh index is 1-indexed.
                            if (!_MSHMesh._isFiniteNumber(nodeIndex))
                                throw new Error('msh-parser: NaN or Inf detected in input file.');
                            if (nodeIndex < 0 || nodeIndex >= numNodes)
                                throw new Error("msh-parser: Invalid node index ".concat(nodeIndex, " for numNodes === ").concat(numNodes, "."));
                            nodeIndices.push(nodeIndex);
                            // Update the current file's byte offset.
                            this._offset += 4;
                        }
                    }
                    elementIndex += elementNumElements;
                }
            }
            else {
                throw new Error('msh-parser: This library does not currently parse non-binary .msh files.  Please submit an issue to the GitHub repo if you encounter this error and attach a sample file.');
            }
            if (this._parseNextLineAsUTF8(uint8Array) !== '$EndElements')
                _MSHMesh._throwInvalidFormatError();
            this.isTetMesh = isTetMesh;
            // TODO: make this work for non-tet.
            if (isTetMesh) {
                // For tet meshes, calculate exterior faces.
                // First find all faces that are covered only once, these are on the boundary.
                var hash = {};
                for (var i = 0; i < numElements; i++) {
                    var indices = elementsArray[i];
                    for (var j = 0; j < indices.length; j++) {
                        var key = _MSHMesh._makeTriHash(indices[j], indices[(j + 1) % 4], indices[(j + 2) % 4]);
                        if (hash[key]) {
                            hash[key].push(indices[(j + 3) % indices.length]);
                            if (hash[key].length > 2) {
                                throw new Error("msh-parser: Hit face ".concat(key, " more than twice."));
                            }
                        }
                        else {
                            hash[key] = [indices[(j + 3) % 4]];
                        }
                    }
                }
                var keys = Object.keys(hash);
                var exteriorFacesArray = [];
                var exteriorNodes = new Uint8Array(numNodes);
                for (var i = 0, numKeys = keys.length; i < numKeys; i++) {
                    var key = keys[i];
                    if (hash[key].length !== 1)
                        continue;
                    var indices = keys[i].split(',');
                    var a = parseInt(indices[0]);
                    var b = parseInt(indices[1]);
                    var c = parseInt(indices[2]);
                    // d is the internal node of this tet.
                    var d = hash[key][0];
                    // Use d to calculate the winding order of the triangle.
                    var orientation_1 = _MSHMesh._dotProduct(_MSHMesh._crossProduct(_MSHMesh._vecFromTo(a, b, nodesArray), _MSHMesh._vecFromTo(a, c, nodesArray)), _MSHMesh._vecFromTo(a, d, nodesArray));
                    exteriorFacesArray.push(orientation_1 < 0 ? [a, b, c] : [a, c, b]);
                    // Mark all nodes as exterior.
                    exteriorNodes[a] = 1;
                    exteriorNodes[b] = 1;
                    exteriorNodes[c] = 1;
                }
                // Also reorder the nodes so that the exterior nodes are first.
                var currentIndex = 0;
                var newIndices = new Int32Array(numNodes);
                for (var i = 0; i < numNodes; i++) {
                    if (exteriorNodes[i]) {
                        newIndices[i] = currentIndex;
                        currentIndex++;
                    }
                }
                this._numExteriorNodes = currentIndex;
                for (var i = 0; i < numNodes; i++) {
                    if (!exteriorNodes[i]) {
                        newIndices[i] = currentIndex;
                        currentIndex++;
                    }
                }
                // Now that we have a mapping, update nodesArrays, elementsArray, and exteriorFacesArray.
                var newNodesArray = nodesArray.slice();
                for (var i = 0; i < numNodes; i++) {
                    for (var j = 0; j < 3; j++) {
                        newNodesArray[3 * newIndices[i] + j] = nodesArray[3 * i + j];
                    }
                }
                this._nodes = newNodesArray;
                for (var i = 0; i < numElements; i++) {
                    var indices = elementsArray[i];
                    for (var j = 0; j < indices.length; j++) {
                        indices[j] = newIndices[indices[j]];
                    }
                }
                for (var i = 0; i < exteriorFacesArray.length; i++) {
                    var indices = exteriorFacesArray[i];
                    for (var j = 0; j < indices.length; j++) {
                        indices[j] = newIndices[indices[j]];
                    }
                }
                this._exteriorFaces = exteriorFacesArray;
            }
        }
        Object.defineProperty(_MSHMesh.prototype, "nodes", {
            get: function () {
                return this._nodes;
            },
            set: function (nodes) {
                throw new Error("msh-parser: No nodes setter.");
            },
            enumerable: false,
            configurable: true
        });
        _MSHMesh.prototype._parseNextLineAsUTF8 = function (uint8Array) {
            // Find the first newline character in the uint8Array.
            var newlineIndex = uint8Array.indexOf(10, this._offset); // 10 is the ASCII code for the newline character.
            // Decode the uint8Array as a UTF-8 encoded string up until the newline character.
            var text = _MSHMesh.decoder.decode(uint8Array.subarray(this._offset, newlineIndex));
            // Update offset.
            this._offset = newlineIndex + 1;
            // Return the decoded string.
            return text;
        };
        _MSHMesh._throwInvalidFormatError = function () {
            throw new Error('msh-parser: Invalid .msh file format.');
        };
        _MSHMesh._isFiniteNumber = function (number) {
            return !isNaN(number) && number !== Infinity && number !== -Infinity;
        };
        _MSHMesh._numNodesPerElementType = function (elementType) {
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
                    throw new Error("msh-parser: Element type ".concat(elementType, " is not supported yet."));
            }
        };
        // Calculates the dot product of two vectors.
        _MSHMesh._dotProduct = function (vector1, vector2) {
            return vector1[0] * vector2[0] + vector1[1] * vector2[1] + vector1[2] * vector2[2];
        };
        // Calculates the cross product of two vectors.
        _MSHMesh._crossProduct = function (vector1, vector2) {
            return [
                vector1[1] * vector2[2] - vector1[2] * vector2[1],
                vector1[2] * vector2[0] - vector1[0] * vector2[2],
                vector1[0] * vector2[1] - vector1[1] * vector2[0]
            ];
        };
        _MSHMesh._vecFromTo = function (from, to, nodesArray) {
            return [
                nodesArray[3 * to] - nodesArray[3 * from],
                nodesArray[3 * to + 1] - nodesArray[3 * from + 1],
                nodesArray[3 * to + 2] - nodesArray[3 * from + 2],
            ];
        };
        _MSHMesh._makeTriHash = function (a, b, c) {
            // Find the minimum and maximum of the input numbers.
            var min = Math.min(a, b, c);
            var max = Math.max(a, b, c);
            // Find the remaining number.
            var remaining = a + b + c - min - max;
            // Join the numbers in ascending order into a string with commas.
            return "".concat(min, ",").concat(remaining, ",").concat(max);
        };
        Object.defineProperty(_MSHMesh.prototype, "edges", {
            get: function () {
                if (!this._edges) {
                    var _a = this, elements = _a.elements, isTetMesh = _a.isTetMesh;
                    if (!isTetMesh)
                        throw new Error("msh-parser: MSHMesh.edges is not defined for non-tet meshes.");
                    // Calc all edges in mesh, use hash table to cover each edge only once.
                    var hash = {};
                    for (var i = 0, numElements = elements.length; i < numElements; i++) {
                        var elementIndices = elements[i];
                        // For tetrahedra, create an edge between each pair of nodes in element.
                        var numNodes = elementIndices.length;
                        for (var j = 0; j < numNodes; j++) {
                            for (var k = j + 1; k < numNodes; k++) {
                                if (j === k)
                                    continue;
                                var a = elementIndices[j];
                                var b = elementIndices[k];
                                var key = "".concat(Math.min(a, b), ",").concat(Math.max(a, b));
                                hash[key] = true;
                            }
                        }
                    }
                    var keys = Object.keys(hash);
                    var edgesArray = new Uint32Array(keys.length * 2);
                    for (var i = 0, length_1 = keys.length; i < length_1; i++) {
                        var indices = keys[i].split(',');
                        edgesArray[2 * i] = parseInt(indices[0]);
                        edgesArray[2 * i + 1] = parseInt(indices[1]);
                    }
                    this._edges = edgesArray;
                }
                return this._edges;
            },
            set: function (edges) {
                throw new Error("msh-parser: No edges setter.");
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(_MSHMesh.prototype, "exteriorEdges", {
            get: function () {
                if (!this._exteriorEdges) {
                    var _a = this, isTetMesh = _a.isTetMesh, _exteriorFaces = _a._exteriorFaces;
                    if (!isTetMesh)
                        throw new Error("msh-parser: MSHMesh.exteriorEdges is not defined for non-tet meshes.");
                    // Calc all exterior edges in mesh, use hash table to cover each edge only once.
                    var hash = {};
                    for (var i = 0, numFaces = _exteriorFaces.length; i < numFaces; i++) {
                        var faceIndices = _exteriorFaces[i];
                        // For triangles, create an edge between each pair of indices in face.
                        var numNodes = faceIndices.length;
                        for (var j = 0; j < numNodes; j++) {
                            for (var k = j + 1; k < numNodes; k++) {
                                if (j === k)
                                    continue;
                                var a = faceIndices[j];
                                var b = faceIndices[k];
                                var key = "".concat(Math.min(a, b), ",").concat(Math.max(a, b));
                                hash[key] = true;
                            }
                        }
                    }
                    var keys = Object.keys(hash);
                    var edgesArray = new Uint32Array(keys.length * 2);
                    for (var i = 0, length_2 = keys.length; i < length_2; i++) {
                        var indices = keys[i].split(',');
                        edgesArray[2 * i] = parseInt(indices[0]);
                        edgesArray[2 * i + 1] = parseInt(indices[1]);
                    }
                    this._exteriorEdges = edgesArray;
                }
                return this._exteriorEdges;
            },
            set: function (exteriorEdges) {
                throw new Error("msh-parser: No exteriorEdges setter.");
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(_MSHMesh.prototype, "exteriorFaces", {
            get: function () {
                if (!this.isTetMesh || !this._exteriorFaces)
                    throw new Error("msh-parser: MSHMesh.exteriorFaces is not defined for non-tet meshes.");
                return this._exteriorFaces;
            },
            set: function (exteriorFaces) {
                throw new Error("msh-parser: No exteriorFaces setter.");
            },
            enumerable: false,
            configurable: true
        });
        _MSHMesh._tetrahedronVolume = function (indices, nodesArray) {
            var a = indices[0], b = indices[1], c = indices[2], d = indices[3];
            // Calculate the vectors representing the edges of the tetrahedron.
            var v1 = _MSHMesh._vecFromTo(d, a, nodesArray);
            var v2 = _MSHMesh._vecFromTo(d, b, nodesArray);
            var v3 = _MSHMesh._vecFromTo(d, c, nodesArray);
            // Calculate the volume of the tetrahedron using the formula:""
            // (1/6) * |v1 . (v2 x v3)|
            // https://en.wikipedia.org/wiki/Tetrahedron#Volume
            return Math.abs(_MSHMesh._dotProduct(v1, _MSHMesh._crossProduct(v2, v3))) / 6;
        };
        Object.defineProperty(_MSHMesh.prototype, "elementVolumes", {
            get: function () {
                if (!this._elementVolumes) {
                    var _a = this, elements = _a.elements, nodes = _a.nodes, isTetMesh = _a.isTetMesh;
                    if (!isTetMesh)
                        throw new Error("msh-parser: MSHMesh.elementVolumes is not defined for non-tet meshes.");
                    var numElements = elements.length;
                    var volumes = new Float32Array(numElements);
                    for (var i = 0; i < numElements; i++) {
                        volumes[i] = _MSHMesh._tetrahedronVolume(elements[i], nodes);
                    }
                    this._elementVolumes = volumes;
                }
                return this._elementVolumes;
            },
            set: function (elementVolumes) {
                throw new Error("msh-parser: No elementVolumes setter.");
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(_MSHMesh.prototype, "nodalVolumes", {
            get: function () {
                if (!this._nodalVolumes) {
                    var _a = this, elements = _a.elements, nodes = _a.nodes, isTetMesh = _a.isTetMesh;
                    if (!isTetMesh)
                        throw new Error("msh-parser: MSHMesh.nodalVolumes is not defined for non-tet meshes.");
                    var elementVolumes = this.elementVolumes;
                    var nodalVolumes = new Float32Array(nodes.length / 3);
                    for (var i = 0, numElements = elements.length; i < numElements; i++) {
                        var nodeIndices = elements[i];
                        var numNodeIndices = nodeIndices.length;
                        for (var j = 0; j < numNodeIndices; j++) {
                            var nodeIndex = nodeIndices[j];
                            // Split element volume evenly across adjacent nodes.
                            nodalVolumes[nodeIndex] += elementVolumes[i] / numNodeIndices;
                        }
                    }
                    this._nodalVolumes = nodalVolumes;
                }
                return this._nodalVolumes;
            },
            set: function (nodalVolumes) {
                throw new Error("msh-parser: No nodalVolumes setter.");
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(_MSHMesh.prototype, "numExteriorNodes", {
            get: function () {
                if (!this.isTetMesh || !this._numExteriorNodes)
                    throw new Error("msh-parser: MSHMesh.numExteriorNodes is not defined for non-tet meshes.");
                return this._numExteriorNodes;
            },
            set: function (numExteriorNodes) {
                throw new Error("msh-parser: No numExteriorNodes setter.");
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(_MSHMesh.prototype, "boundingBox", {
            get: function () {
                if (!this._boundingBox) {
                    var nodes = this.nodes;
                    var numNodes = nodes.length / 3;
                    var min = [Infinity, Infinity, Infinity];
                    var max = [-Infinity, -Infinity, -Infinity];
                    for (var i = 0; i < numNodes; i++) {
                        min[0] = Math.min(min[0], nodes[3 * i]);
                        min[1] = Math.min(min[1], nodes[3 * i + 1]);
                        min[2] = Math.min(min[2], nodes[3 * i + 2]);
                        max[0] = Math.max(max[0], nodes[3 * i]);
                        max[1] = Math.max(max[1], nodes[3 * i + 1]);
                        max[2] = Math.max(max[2], nodes[3 * i + 2]);
                    }
                    this._boundingBox = {
                        min: min,
                        max: max,
                    };
                }
                return this._boundingBox;
            },
            set: function (boundingBox) {
                throw new Error("msh-parser: No boundingBox setter.");
            },
            enumerable: false,
            configurable: true
        });
        /**
         * Scales nodes to unit bounding box and centers around origin.
         */
        _MSHMesh.prototype.scaleNodesToUnitBoundingBox = function () {
            var _a = this, nodes = _a.nodes, boundingBox = _a.boundingBox;
            var min = boundingBox.min, max = boundingBox.max;
            var diff = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
            var center = [(max[0] + min[0]) / 2, (max[1] + min[1]) / 2, (max[2] + min[2]) / 2];
            var scale = Math.max(diff[0], diff[1], diff[2]);
            var numNodes = nodes.length / 3;
            for (var i = 0; i < numNodes; i++) {
                for (var j = 0; j < 3; j++) {
                    // Uniform scale.
                    nodes[3 * i + j] = (nodes[3 * i + j] - center[j]) / scale;
                }
            }
            delete this._boundingBox;
            delete this._nodalVolumes;
            delete this._elementVolumes;
            return this;
        };
        // TextDecoder instance to decode the header as UTF-8.
        _MSHMesh.decoder = new TextDecoder();
        return _MSHMesh;
    }());

    exports.loadMsh = loadMsh;
    exports.loadMshAsync = loadMshAsync;
    exports.parseMsh = parseMsh;

}));
//# sourceMappingURL=msh-parser.js.map
