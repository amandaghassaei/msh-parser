/// <reference types="node" />
/**
 * Synchronously parse an already loaded .msh file buffer.
 */
export declare function parseMSH(data: Buffer | ArrayBuffer): MSHMesh;
/**
 * Load and parse .msh asynchronously from the specified url or File object (returns Promise).
 */
export declare function loadMSHAsync(urlOrFile: string | File): Promise<MSHMesh>;
/**
 * Load and parse .msh from the specified url or File object.
 */
export declare function loadMSH(urlOrFile: string | File, callback: (mesh: MSHMesh) => void): void;
export type MSHMesh = {
    readonly nodes: Float64Array | Float32Array;
    readonly elementIndices: number[][];
    readonly edgeIndices: Uint32Array;
    readonly exteriorEdgeIndices: Uint32Array;
    readonly exteriorFaceIndices: number[][];
    readonly elementVolumes: Float32Array;
    readonly nodalVolumes: Float32Array;
    readonly isTetMesh: boolean;
    readonly numExteriorNodes: number;
    readonly boundingBox: {
        min: number[];
        max: number[];
    };
    scaleNodesToUnitBoundingBox: () => MSHMesh;
};
