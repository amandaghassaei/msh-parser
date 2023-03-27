/// <reference types="node" />
/**
 * Synchronously parse an already loaded .msh file buffer.
 */
export declare function parseMsh(data: Buffer | ArrayBuffer): MSHMesh;
/**
 * Load and parse .msh asynchronously from the specified url or File object (returns Promise).
 */
export declare function loadMshAsync(urlOrFile: string | File): Promise<MSHMesh>;
/**
 * Load and parse .msh from the specified url or File object.
 */
export declare function loadMsh(urlOrFile: string | File, callback: (mesh: MSHMesh) => void): void;
export type MSHMesh = {
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
    scaleNodesToUnitBoundingBox: () => MSHMesh;
};
