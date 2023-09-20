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
    readonly nodalVolumes: Float32Array;
    readonly elementIndices: number[][];
    readonly elementVolumes: Float32Array;
    readonly edgesIndices: Uint32Array;
    readonly exteriorEdgesIndices: Uint32Array;
    readonly exteriorFacesIndices: number[][];
    readonly isTetMesh: boolean;
    readonly numExteriorNodes: number;
    readonly boundingBox: {
        min: number[];
        max: number[];
    };
    removeNonTetElements: () => MSHMesh;
    scaleNodesToUnitBoundingBox: () => MSHMesh;
};
