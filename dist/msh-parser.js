(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.MSHParserLib = {}));
})(this, (function (exports) { 'use strict';

    // https://github.com/PyMesh/PyMesh/blob/main/src/IO/MshLoader.cpp
    // Define the MSHParser class
    var MSHParser = /** @class */ (function () {
        // Constructor function.
        function MSHParser() {
            // Header offset.
            this._offset = 0;
        }
        /**
         * @private
         */
        MSHParser.prototype._parseNextLineAsUTF8 = function (uint8Array) {
            // Find the first newline character in the uint8Array.
            var newlineIndex = uint8Array.indexOf(10, this._offset); // 10 is the ASCII code for the newline character.
            // Decode the uint8Array as a UTF-8 encoded string up until the newline character.
            var text = MSHParser.decoder.decode(uint8Array.subarray(this._offset, newlineIndex));
            // Update offset.
            this._offset = newlineIndex + 1;
            // Return the decoded string.
            return text;
        };
        /**
         * @private
         */
        MSHParser._throwInvalidFormatError = function () {
            throw new Error('Invalid .msh file format.');
        };
        /**
         * @private
         */
        MSHParser._isFiniteNumber = function (number) {
            return !isNaN(number) && number !== Infinity && number !== -Infinity;
        };
        /**
         * @private
         */
        MSHParser._numNodesPerElementType = function (elementType) {
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
                    throw new Error("Element type ".concat(elementType, " is not supported yet."));
            }
        };
        /**
         * @private
         */
        MSHParser._crossProduct = function (a, b) {
            return [
                a[1] * b[2] - a[2] * b[1],
                a[2] * b[0] - a[0] * b[2],
                a[0] * b[1] - a[1] * b[0],
            ];
        };
        /**
         * @private
         */
        MSHParser._dotProduct = function (a, b) {
            return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
        };
        /**
         * @private
         */
        MSHParser._vecFromTo = function (index1, index2, nodesArray) {
            return [
                nodesArray[3 * index2] - nodesArray[3 * index1],
                nodesArray[3 * index2 + 1] - nodesArray[3 * index1 + 1],
                nodesArray[3 * index2 + 2] - nodesArray[3 * index1 + 2],
            ];
        };
        /**
         * @private
         */
        MSHParser.makeTriHash = function (a, b, c) {
            // Find the minimum and maximum of the input numbers.
            var min = Math.min(a, b, c);
            var max = Math.max(a, b, c);
            // Find the remaining number.
            var remaining = a + b + c - min - max;
            // Join the numbers in ascending order into a string with commas.
            return "".concat(min, ",").concat(remaining, ",").concat(max);
        };
        MSHParser.prototype._parse = function (arrayBuffer, callback) {
            var dataView = new DataView(arrayBuffer);
            // Create a Uint8Array that references the same underlying memory as the DataView.
            var uint8Array = new Uint8Array(dataView.buffer);
            // Parse header.
            if (this._parseNextLineAsUTF8(uint8Array) !== '$MeshFormat')
                MSHParser._throwInvalidFormatError();
            var _a = this._parseNextLineAsUTF8(uint8Array).split(' ').map(function (el) { return parseFloat(el); }), version = _a[0], type = _a[1], dataSize = _a[2];
            if (isNaN(version) || isNaN(type) || isNaN(dataSize))
                MSHParser._throwInvalidFormatError();
            if (dataSize !== 8 && dataSize !== 4)
                throw new Error("This library currently parses .msh files with data size === 8 or 4.  Current file has data size = ".concat(dataSize, ". Please submit an issue to the GitHub repo if you encounter this error and attach a sample file."));
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
                MSHParser._throwInvalidFormatError();
            // Read the number of nodes.
            if (this._parseNextLineAsUTF8(uint8Array) !== '$Nodes')
                MSHParser._throwInvalidFormatError();
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
                throw new Error('This library does not currently parse non-binary .msh files.  Please submit an issue to the GitHub repo if you encounter this error and attach a sample file.');
            }
            // Check that all nodes are finite.
            for (var i = 0; i < nodesArray.length; i++) {
                if (!MSHParser._isFiniteNumber(nodesArray[i]))
                    throw new Error('NaN or Inf detected in input file.');
            }
            if (this._parseNextLineAsUTF8(uint8Array) !== '$EndNodes')
                MSHParser._throwInvalidFormatError();
            if (this._parseNextLineAsUTF8(uint8Array) !== '$Elements')
                MSHParser._throwInvalidFormatError();
            // Read the number of elements.
            var numElements = parseInt(this._parseNextLineAsUTF8(uint8Array));
            var elementsNodesArray = [];
            for (var i = 0; i < numElements; i++) {
                elementsNodesArray.push([]);
            }
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
                    var numElementNodes = MSHParser._numNodesPerElementType(elementType);
                    // Update the current file's byte offset.
                    this._offset += 12;
                    for (var i = 0; i < elementNumElements; i++) {
                        var index = dataView.getInt32(this._offset, isLE) - 1; // The .msh index is 1-indexed.
                        if (index < 0 || index >= numElements)
                            throw new Error("Invalid element index ".concat(index, " for numElements === ").concat(numElements, "."));
                        this._offset += 4;
                        for (var j = 0; j < elementNumTags; j++) {
                            dataView.getInt32(this._offset, isLE);
                            if (!tagWarning) {
                                tagWarning = true;
                                console.warn('This library does not currently parse element tags.');
                            }
                            // Update the current file's byte offset.
                            this._offset += 4;
                        }
                        var nodeIndices = elementsNodesArray[index];
                        for (var j = 0; j < numElementNodes; j++) {
                            var nodeIndex = dataView.getInt32(this._offset, isLE) - 1; // The .msh index is 1-indexed.
                            if (!MSHParser._isFiniteNumber(nodeIndex))
                                throw new Error('NaN or Inf detected in input file.');
                            if (nodeIndex < 0 || nodeIndex >= numNodes)
                                throw new Error("Invalid node index ".concat(nodeIndex, " for numNodes === ").concat(numNodes, "."));
                            nodeIndices.push(nodeIndex);
                            // Update the current file's byte offset.
                            this._offset += 4;
                        }
                    }
                    elementIndex += elementNumElements;
                }
            }
            else {
                throw new Error('This library does not currently parse non-binary .msh files.  Please submit an issue to the GitHub repo if you encounter this error and attach a sample file.');
            }
            if (this._parseNextLineAsUTF8(uint8Array) !== '$EndElements')
                MSHParser._throwInvalidFormatError();
            var mesh = {
                nodesArray: nodesArray,
                elementsNodesArray: elementsNodesArray,
                isTetMesh: isTetMesh,
            };
            // TODO: make this work for non-tet.
            if (isTetMesh) {
                // For tet meshes, calculate exterior faces.
                // First find all faces that are covered only once, these are on the boundary.
                var hash = {};
                for (var i = 0; i < numElements; i++) {
                    var indices = elementsNodesArray[i];
                    for (var j = 0; j < indices.length; j++) {
                        var key = MSHParser.makeTriHash(indices[j], indices[(j + 1) % 4], indices[(j + 2) % 4]);
                        if (hash[key]) {
                            hash[key].push(indices[(j + 3) % indices.length]);
                            if (hash[key].length > 2) {
                                throw new Error("Hit face ".concat(key, " more than twice."));
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
                    var orientation_1 = MSHParser._dotProduct(MSHParser._crossProduct(MSHParser._vecFromTo(a, b, nodesArray), MSHParser._vecFromTo(a, c, nodesArray)), MSHParser._vecFromTo(a, d, nodesArray));
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
                mesh.numExteriorNodes = currentIndex;
                for (var i = 0; i < numNodes; i++) {
                    if (!exteriorNodes[i]) {
                        newIndices[i] = currentIndex;
                        currentIndex++;
                    }
                }
                // Now that we have a mapping, update nodesArrays, elementsNodesArray, and exteriorFacesArray.
                var newNodesArray = nodesArray.slice();
                for (var i = 0; i < numNodes; i++) {
                    for (var j = 0; j < 3; j++) {
                        newNodesArray[3 * newIndices[i] + j] = nodesArray[3 * i + j];
                    }
                }
                mesh.nodesArray = newNodesArray;
                for (var i = 0; i < numElements; i++) {
                    var indices = elementsNodesArray[i];
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
                mesh.exteriorFacesArray = exteriorFacesArray;
            }
            // Call the callback function with the parsed mesh data.
            callback(mesh);
        };
        // Parse the .msh file at the specified file path of File object.
        MSHParser.prototype.parse = function (urlOrFile, callback) {
            this._offset = 0; // Reset header offset.
            var self = this;
            if (typeof urlOrFile === 'string') {
                if (typeof window !== 'undefined') {
                    // Load the file.
                    var request_1 = new XMLHttpRequest();
                    request_1.open('GET', urlOrFile, true);
                    request_1.responseType = 'arraybuffer';
                    request_1.onload = function () {
                        self._parse(request_1.response, callback);
                    };
                    request_1.send();
                }
                else {
                    var fs = require('fs');
                    var fileBuffer = fs.readFileSync(urlOrFile);
                    self._parse(Buffer.from(fileBuffer).buffer, callback);
                }
            }
            else {
                // We only ever hit this in the browser.
                if (!MSHParser.reader)
                    MSHParser.reader = new FileReader();
                MSHParser.reader.onload = function () {
                    self._parse(MSHParser.reader.result, callback);
                };
                MSHParser.reader.readAsArrayBuffer(urlOrFile);
            }
        };
        MSHParser.calculateEdges = function (mesh) {
            var elementsNodesArray = mesh.elementsNodesArray, isTetMesh = mesh.isTetMesh;
            if (!isTetMesh)
                throw new Error("MSHParser.calculateEdges() is not defined for non-tet meshes.");
            // Calc all edges in mesh, use hash table to cover each edge only once.
            var hash = {};
            for (var i = 0, numElements = elementsNodesArray.length; i < numElements; i++) {
                var elementIndices = elementsNodesArray[i];
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
            return edgesArray;
        };
        // TextDecoder instance to decode the header as UTF-8.
        MSHParser.decoder = new TextDecoder();
        return MSHParser;
    }());

    exports.MSHParser = MSHParser;

}));
//# sourceMappingURL=msh-parser.js.map
