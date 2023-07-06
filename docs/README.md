msh-parser

# msh-parser

## Table of contents

### Type Aliases

- [MSHMesh](README.md#mshmesh)

### Functions

- [parseMsh](README.md#parsemsh)
- [loadMshAsync](README.md#loadmshasync)
- [loadMsh](README.md#loadmsh)

## Type Aliases

### MSHMesh

Ƭ **MSHMesh**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `nodes` | `Float64Array` \| `Float32Array` |
| `elements` | `number`[][] |
| `edges` | `Uint32Array` |
| `exteriorEdges` | `Uint32Array` |
| `exteriorFaces` | `number`[][] |
| `elementVolumes` | `Float32Array` |
| `nodalVolumes` | `Float32Array` |
| `isTetMesh` | `boolean` |
| `numExteriorNodes` | `number` |
| `boundingBox` | { `min`: `number`[] ; `max`: `number`[]  } |
| `boundingBox.min` | `number`[] |
| `boundingBox.max` | `number`[] |
| `scaleNodesToUnitBoundingBox` | () => [`MSHMesh`](README.md#mshmesh) |

## Functions

### parseMsh

▸ **parseMsh**(`data`): [`MSHMesh`](README.md#mshmesh)

Synchronously parse an already loaded .msh file buffer.

#### Parameters

| Name | Type |
| :------ | :------ |
| `data` | `ArrayBuffer` \| `Buffer` |

#### Returns

[`MSHMesh`](README.md#mshmesh)

___

### loadMshAsync

▸ **loadMshAsync**(`urlOrFile`): `Promise`<[`MSHMesh`](README.md#mshmesh)\>

Load and parse .msh asynchronously from the specified url or File object (returns Promise).

#### Parameters

| Name | Type |
| :------ | :------ |
| `urlOrFile` | `string` \| `File` |

#### Returns

`Promise`<[`MSHMesh`](README.md#mshmesh)\>

___

### loadMsh

▸ **loadMsh**(`urlOrFile`, `callback`): `void`

Load and parse .msh from the specified url or File object.

#### Parameters

| Name | Type |
| :------ | :------ |
| `urlOrFile` | `string` \| `File` |
| `callback` | (`mesh`: [`MSHMesh`](README.md#mshmesh)) => `void` |

#### Returns

`void`
