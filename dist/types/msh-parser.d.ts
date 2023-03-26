/// <reference types="node" />
export declare function loadMshAsync(urlOrFile: string | File): Promise<MSHParser>;
export declare function loadMsh(urlOrFile: string | File, callback: (mesh: MSHParser) => void): void;
export declare function parseMsh(data: Buffer | ArrayBuffer): MSHParser;
export type MSHParser = {
    readonly nodes: Float64Array | Float32Array;
    readonly elements: number[][];
    readonly edges: Uint32Array;
    readonly exteriorEdges: Uint32Array;
    readonly exteriorFaces: number[][];
    readonly elementVolumes: Float32Array;
    readonly nodalVolumes: Float32Array;
    readonly isTetMesh: boolean;
    readonly numExteriorNodes: number;
    readonly boundingBox: {
        min: number[];
        max: number[];
    };
    scaleNodesToUnitBoundingBox: () => MSHParser;
};
