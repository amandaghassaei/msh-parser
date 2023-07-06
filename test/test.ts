import { use, expect } from 'chai';
import { readFileSync } from 'fs';
import { loadMSH, loadMSHAsync, parseMSH } from '../src/msh-parser';
import chaiAlmost from 'chai-almost';
use(chaiAlmost(0.1));

const stanfordBunny = readFileSync('./test/msh/stanford_bunny.msh');
const wingnut = readFileSync('./test/msh/wingnut.msh');

describe('mesh-parser', () => {
	describe('loadMSH', () => {
		it('loads stanford_bunny.msh', () => {
			loadMSH('./test/msh/stanford_bunny.msh', (mesh) => {
				const {
					nodes,
					elements,
					isTetMesh,
					exteriorFaces,
					numExteriorNodes,
				} = mesh;
				expect(nodes.constructor).to.equal(Float64Array);
				expect(nodes.length).to.equal(25476);
				expect(elements.length).to.equal(27232);
				expect(elements[0].length).to.equal(4);
				expect(isTetMesh).to.equal(true);
				expect(exteriorFaces!.length).to.equal(14024);
				for (let i = 0; i < exteriorFaces!.length; i++) {
					for (let j = 0; j < exteriorFaces![i].length; j++) {
						expect(exteriorFaces![i][j]).to.be.lessThan(numExteriorNodes!);
					}
				}
				expect(numExteriorNodes).to.equal(7014);
			});
		});
		it('loads wingnut.msh', () => {
			loadMSH('./test/msh/wingnut.msh', (mesh) => {
				const {
					nodes,
					elements,
					isTetMesh,
					exteriorFaces,
					numExteriorNodes,
				} = mesh;
				expect(nodes.constructor).to.equal(Float64Array);
				expect(nodes.length).to.equal(15573);
				expect(elements.length).to.equal(16753);
				expect(elements[0].length).to.equal(4);
				expect(isTetMesh).to.equal(true);
				expect(exteriorFaces!.length).to.equal(8746);
				for (let i = 0; i < exteriorFaces!.length; i++) {
					for (let j = 0; j < exteriorFaces![i].length; j++) {
						expect(exteriorFaces![i][j]).to.be.lessThan(numExteriorNodes!);
					}
				}
				expect(numExteriorNodes).to.equal(4373);
			});
		});
	});
	describe('loadMSHAsync', () => {
		it('loads stanford_bunny.msh', async () => {
			const mesh = await loadMSHAsync('./test/msh/stanford_bunny.msh');
			const {
				nodes,
				elements,
				isTetMesh,
				exteriorFaces,
				numExteriorNodes,
			} = mesh;
			expect(nodes.constructor).to.equal(Float64Array);
			expect(nodes.length).to.equal(25476);
			expect(elements.length).to.equal(27232);
			expect(elements[0].length).to.equal(4);
			expect(isTetMesh).to.equal(true);
			expect(exteriorFaces!.length).to.equal(14024);
			for (let i = 0; i < exteriorFaces!.length; i++) {
				for (let j = 0; j < exteriorFaces![i].length; j++) {
					expect(exteriorFaces![i][j]).to.be.lessThan(numExteriorNodes!);
				}
			}
			expect(numExteriorNodes).to.equal(7014);
		});
		it('loads wingnut.msh', async () => {
			const mesh = await loadMSHAsync('./test/msh/wingnut.msh');
			const {
				nodes,
				elements,
				isTetMesh,
				exteriorFaces,
				numExteriorNodes,
			} = mesh;
			expect(nodes.constructor).to.equal(Float64Array);
			expect(nodes.length).to.equal(15573);
			expect(elements.length).to.equal(16753);
			expect(elements[0].length).to.equal(4);
			expect(isTetMesh).to.equal(true);
			expect(exteriorFaces!.length).to.equal(8746);
			for (let i = 0; i < exteriorFaces!.length; i++) {
				for (let j = 0; j < exteriorFaces![i].length; j++) {
					expect(exteriorFaces![i][j]).to.be.lessThan(numExteriorNodes!);
				}
			}
			expect(numExteriorNodes).to.equal(4373);
		});
	});
	describe('parseMSH', () => {
		it('parses stanford_bunny.msh', () => {
			const mesh = parseMSH(stanfordBunny);
			const {
				nodes,
				elements,
				isTetMesh,
				exteriorFaces,
				numExteriorNodes,
			} = mesh;
			expect(nodes.constructor).to.equal(Float64Array);
			expect(nodes.length).to.equal(25476);
			expect(elements.length).to.equal(27232);
			expect(elements[0].length).to.equal(4);
			expect(isTetMesh).to.equal(true);
			expect(exteriorFaces!.length).to.equal(14024);
			for (let i = 0; i < exteriorFaces!.length; i++) {
				for (let j = 0; j < exteriorFaces![i].length; j++) {
					expect(exteriorFaces![i][j]).to.be.lessThan(numExteriorNodes!);
				}
			}
			expect(numExteriorNodes).to.equal(7014);
		});
		it('parses wingnut.msh', () => {
			const mesh = parseMSH(wingnut);
			const {
				nodes,
				elements,
				isTetMesh,
				exteriorFaces,
				numExteriorNodes,
			} = mesh;
			expect(nodes.constructor).to.equal(Float64Array);
			expect(nodes.length).to.equal(15573);
			expect(elements.length).to.equal(16753);
			expect(elements[0].length).to.equal(4);
			expect(isTetMesh).to.equal(true);
			expect(exteriorFaces!.length).to.equal(8746);
			for (let i = 0; i < exteriorFaces!.length; i++) {
				for (let j = 0; j < exteriorFaces![i].length; j++) {
					expect(exteriorFaces![i][j]).to.be.lessThan(numExteriorNodes!);
				}
			}
			expect(numExteriorNodes).to.equal(4373);
		});
	});
	describe('helper functions', () => {
		it('calculates edges', () => {
			expect(parseMSH(stanfordBunny).edges.length).to.equal(85470);
			expect(parseMSH(wingnut).edges.length).to.equal(52634);
			// // Should only work for tet meshes.
			// // @ts-ignore
			// assert.throws(() => { MSHParser.calculateEdges({}); },
			// 		'MSHParser.calculateEdges() is not defined for non-tet meshes.');
		});
		it('calculates exterior edges', () => {
			{
				const mesh = parseMSH(stanfordBunny);
				const { numExteriorNodes, exteriorEdges } = mesh;
				expect(exteriorEdges.length).to.equal(42072);
				for (let i = 0; i < exteriorEdges.length; i++) {
					expect(exteriorEdges[i]).to.be.lessThan(numExteriorNodes!);
				}
			}
			{
				const mesh = parseMSH(wingnut);
				const { numExteriorNodes, exteriorEdges } = mesh;
				expect(exteriorEdges.length).to.equal(26238);
				for (let i = 0; i < exteriorEdges.length; i++) {
					expect(exteriorEdges[i]).to.be.lessThan(numExteriorNodes!);
				}
			}
			// // Should only work for tet meshes.
			// // @ts-ignore
			// assert.throws(() => { MSHParser.calculateExteriorEdges({}); },
			// 		'MSHParser.calculateExteriorEdges() is not defined for non-tet meshes.');
		});
		it('calculates element volumes', () => {
			const mesh = parseMSH(stanfordBunny);
			const { elementVolumes } = mesh;
			const results = [
				0.8946202993392944,
				0.40149927139282227,
				0.47812920808792114,
				0.8394981026649475,
				129.67111206054688,
				0.48769786953926086,
				0.8108745217323303,
				545.7216796875,
				289.6062927246094,
				113.19168090820312
			];
			for (let i = 0; i < results.length; i++) {
				expect(elementVolumes[i]).to.equal(results[i]);
			}
			
			// // Should only work for tet meshes.
			// // @ts-ignore
			// assert.throws(() => { MSHParser.calculateElementVolumes({}); },
			// 		'MSHParser.calculateElementVolumes() is not defined for non-tet meshes.');
		});
		it('calculates nodal volumes', () => {
			const mesh = parseMSH(stanfordBunny);
			const { elementVolumes, nodalVolumes } = mesh;
			const results = [
				4.465956211090088,
				2.1849000453948975,
				0.6463223695755005,
				1.0203194618225098,
				1.5545240640640259,
				1.2625080347061157,
				1.9324926137924194,
				2.1156301498413086,
				1.4328465461730957,
				1.1107745170593262
			];
			for (let i = 0; i < results.length; i++) {
				expect(nodalVolumes[i]).to.equal(results[i]);
			}

			expect(elementVolumes.reduce((partialSum, a) => partialSum + a, 0)).to.almost.equal(nodalVolumes.reduce((partialSum, a) => partialSum + a, 0));
			
			// // Should only work for tet meshes.
			// // @ts-ignore
			// assert.throws(() => { MSHParser.calculateNodalVolumes({}); },
			// 		'MSHParser.calculateNodalVolumes() is not defined for non-tet meshes.');
		});
		it('calculates bounding box', () => {
			{
				const { boundingBox } = parseMSH(stanfordBunny);
				const { min, max } = boundingBox;
				expect(min).to.deep.equal([-43.133523557360256, -33.408036848762215, -0.0010786724840932279]);
				expect(max).to.deep.equal([43.138475101021584, 33.3942439679999, 83.69444330381762]);
			}
			{
				const { boundingBox } = parseMSH(wingnut);
				const { min, max } = boundingBox;
				expect(min).to.deep.equal([-1.2498986197785313, -0.5488943641668116, -4.5772923088512436e-8]);
				expect(max).to.deep.equal([1.2498814910148646, 0.5488943641071283, 1.2499371421138041]);
			}
		});
		it('scales the node positions to unit bounding box', () => {
			{
				const { boundingBox } = parseMSH(stanfordBunny).scaleNodesToUnitBoundingBox();
				const { min, max } = boundingBox;
				expect(min).to.deep.equal([-0.5, -0.3871608508879252, -0.485067711875539]);
				expect(max).to.deep.equal([0.5, 0.3871608508879252, 0.4850677118755391]);
			}
			{
				const { boundingBox } = parseMSH(wingnut).scaleNodesToUnitBoundingBox();
				const { min, max } = boundingBox;
				expect(min).to.deep.equal([-0.5, -0.21957705870487879, -0.25000942732719283]);
				expect(max).to.deep.equal([0.5, 0.21957705870487879, 0.25000942732719283]);
			}
		});
		it('throws errors for invalid setters', () => {
			const msh = parseMSH(stanfordBunny);
			// @ts-ignore
			expect(() => {msh.nodes = new Float32Array(10)}).to.throw(Error, 'msh-parser: No nodes setter.');
			// @ts-ignore
			expect(() => {msh.edges = new Uint32Array(10)}).to.throw(Error, 'msh-parser: No edges setter.');
			// @ts-ignore
			expect(() => {msh.exteriorEdges = new Uint32Array(10)}).to.throw(Error, 'msh-parser: No exteriorEdges setter.');
			// @ts-ignore
			expect(() => {msh.exteriorFaces = [0, 0, 0, 0, 0, 0, 0, 0, 0]}).to.throw(Error, 'msh-parser: No exteriorFaces setter.');
			// @ts-ignore
			expect(() => {msh.elementVolumes = new Float32Array(10)}).to.throw(Error, 'msh-parser: No elementVolumes setter.');
			// @ts-ignore
			expect(() => {msh.nodalVolumes = new Float32Array(10)}).to.throw(Error, 'msh-parser: No nodalVolumes setter.');
			// @ts-ignore
			expect(() => {msh.numExteriorNodes = 20}).to.throw(Error, 'msh-parser: No numExteriorNodes setter.');
			// @ts-ignore
			expect(() => {msh.boundingBox = { min: [0, 0, 0], max: [24, 24, 24] }}).to.throw(Error, 'msh-parser: No boundingBox setter.')
		});
	});
});