export type MSHData = {
    nodesArray: Float64Array | Float32Array;
    elementsArray: number[][];
    isTetMesh: boolean;
    exteriorFacesArray?: number[][];
    numExteriorNodes?: number;
};
export declare class MSHParser {
    static reader?: FileReader;
    static decoder: TextDecoder;
    _offset: number;
    constructor();
    private _parseNextLineAsUTF8;
    private static _throwInvalidFormatError;
    private static _isFiniteNumber;
    private static _numNodesPerElementType;
    private static _dotProduct;
    private static _crossProduct;
    private static _vecFromTo;
    private static _makeTriHash;
    private _parse;
    parseSync(url: string): MSHData;
    parseAsync(urlOrFile: string | File): Promise<MSHData>;
    parse(urlOrFile: string | File, callback: (mesh: MSHData) => void): void;
    static calculateEdges(mesh: MSHData): Uint32Array;
    static calculateExteriorEdges(mesh: MSHData): Uint32Array;
    private static _tetrahedronVolume;
    static calculateElementVolumes(mesh: MSHData): Float32Array;
    static calculateNodalVolumes(mesh: MSHData): Float32Array;
    static calculateBoundingBox(mesh: MSHData): {
        min: number[];
        max: number[];
    };
    /**
     * Scales nodes to unit bounding box and centers around origin.
     */
    static scaleNodesArrayToUnitBoundingBox(mesh: MSHData): Float64Array | Float32Array;
}
