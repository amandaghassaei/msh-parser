msh-parser

# msh-parser

## Table of contents

### Type Aliases

- [MSHMesh](README.md#mshmesh)

### Functions

- [parseMSH](README.md#parsemsh)
- [loadMSHAsync](README.md#loadmshasync)
- [loadMSH](README.md#loadmsh)

## Type Aliases

### MSHMesh

Ƭ **MSHMesh**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `nodes` | `Float64Array` \| `Float32Array` |
| `elementIndices` | `number`[][] |
| `edgeIndices` | `Uint32Array` |
| `exteriorEdgeIndices` | `Uint32Array` |
| `exteriorFaceIndices` | `number`[][] |
| `elementVolumes` | `Float32Array` |
| `nodalVolumes` | `Float32Array` |
| `isTetMesh` | `boolean` |
| `numExteriorNodes` | `number` |
| `boundingBox` | { `min`: `number`[] ; `max`: `number`[]  } |
| `boundingBox.min` | `number`[] |
| `boundingBox.max` | `number`[] |
| `scaleNodesToUnitBoundingBox` | () => [`MSHMesh`](README.md#mshmesh) |

## Functions

### parseMSH

▸ **parseMSH**(`data`): [`MSHMesh`](README.md#mshmesh)

Synchronously parse an already loaded .msh file buffer.

#### Parameters

| Name | Type |
| :------ | :------ |
| `data` | `ArrayBuffer` \| `Buffer` |

#### Returns

[`MSHMesh`](README.md#mshmesh)

___

### loadMSHAsync

▸ **loadMSHAsync**(`urlOrFile`): `Promise`<[`MSHMesh`](README.md#mshmesh)\>

Load and parse .msh asynchronously from the specified url or File object (returns Promise).

#### Parameters

| Name | Type |
| :------ | :------ |
| `urlOrFile` | `string` \| `File` |

#### Returns

`Promise`<[`MSHMesh`](README.md#mshmesh)\>

___

### loadMSH

▸ **loadMSH**(`urlOrFile`, `callback`): `void`

Load and parse .msh from the specified url or File object.

#### Parameters

| Name | Type |
| :------ | :------ |
| `urlOrFile` | `string` \| `File` |
| `callback` | (`mesh`: [`MSHMesh`](README.md#mshmesh)) => `void` |

#### Returns

`void`
