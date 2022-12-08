export type MSHData = {
    nodesArray: Float64Array | Float32Array;
    elementsNodesArray: number[][];
    isTetMesh: boolean;
    exteriorFacesArray?: number[][];
    numExteriorNodes?: number;
};
export declare class MSHParser {
    static reader?: FileReader;
    static decoder: TextDecoder;
    _offset: number;
    constructor();
    /**
     * @private
     */
    _parseNextLineAsUTF8(uint8Array: Uint8Array): string;
    /**
     * @private
     */
    static _throwInvalidFormatError(): void;
    /**
     * @private
     */
    static _isFiniteNumber(number: number): boolean;
    /**
     * @private
     */
    static _numNodesPerElementType(elementType: number): 3 | 4 | 8;
    /**
     * @private
     */
    static _crossProduct(a: number[], b: number[]): number[];
    /**
     * @private
     */
    static _dotProduct(a: number[], b: number[]): number;
    /**
     * @private
     */
    static _vecFromTo(index1: number, index2: number, nodesArray: Float32Array | Float64Array): number[];
    /**
     * @private
     */
    static makeTriHash(a: number, b: number, c: number): string;
    _parse(arrayBuffer: ArrayBuffer): MSHData;
    parseSync(url: string): MSHData;
    parse(urlOrFile: string | File, callback: (mesh: MSHData) => void): void;
    static calculateEdges(mesh: MSHData): Uint32Array;
}
