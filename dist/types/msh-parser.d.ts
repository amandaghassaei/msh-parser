/// <reference types="node" />
export declare function loadMshAsync(urlOrFile: string | File): Promise<MSHParser>;
export declare function loadMsh(urlOrFile: string | File, callback: (mesh: MSHParser) => void): void;
export declare function parseMsh(data: Buffer | ArrayBuffer): MSHParser;
export declare class MSHParser {
    static decoder: TextDecoder;
    _offset: number;
    private _nodes;
    readonly elements: number[][];
    private _edges?;
    private _exteriorEdges?;
    private _elementVolumes?;
    private _nodalVolumes?;
    private _boundingBox?;
    readonly isTetMesh: boolean;
    readonly exteriorFaces?: number[][];
    readonly numExteriorNodes?: number;
    constructor(arrayBuffer: ArrayBuffer);
    get nodes(): Float32Array | Float64Array;
    set nodes(nodes: Float32Array | Float64Array);
    private _parseNextLineAsUTF8;
    private static _throwInvalidFormatError;
    private static _isFiniteNumber;
    private static _numNodesPerElementType;
    private static _dotProduct;
    private static _crossProduct;
    private static _vecFromTo;
    private static _makeTriHash;
    get edges(): Uint32Array;
    set edges(edges: Uint32Array);
    get exteriorEdges(): Uint32Array;
    set exteriorEdges(exteriorEdges: Uint32Array);
    private static _tetrahedronVolume;
    get elementVolumes(): Float32Array;
    set elementVolumes(elementVolumes: Float32Array);
    get nodalVolumes(): Float32Array;
    set nodalVolumes(nodalVolumes: Float32Array);
    get boundingBox(): {
        min: number[];
        max: number[];
    };
    set boundingBox(boundingBox: {
        min: number[];
        max: number[];
    });
    /**
     * Scales nodes to unit bounding box and centers around origin.
     */
    scaleNodesToUnitBoundingBox(): this;
}
