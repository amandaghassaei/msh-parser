import { use, expect, assert } from 'chai';
import { MSHParser } from '../';
const chaiAlmost = require('chai-almost');
use(chaiAlmost());

describe('MshParser', () => {
	describe('constructor', () => {
		it('should init without errors', () => {
			const parser = new MSHParser();
		});
	});
	describe('parse', () => {
		const parser = new MSHParser();
		it('parses stanford_bunny.msh', () => {
			parser.parse('./test/msh/stanford_bunny.msh', (mesh) => {
				const {
					nodesArray,
					elementsArray,
					isTetMesh,
					exteriorFacesArray,
					numExteriorNodes,
				} = mesh;
				expect(nodesArray.constructor).to.equal(Float64Array);
				expect(nodesArray.length).to.equal(25476);
				expect(elementsArray.length).to.equal(27232);
				expect(elementsArray[0].length).to.equal(4);
				expect(isTetMesh).to.equal(true);
				expect(exteriorFacesArray!.length).to.equal(14024);
				for (let i = 0; i < exteriorFacesArray!.length; i++) {
					for (let j = 0; j < exteriorFacesArray![i].length; j++) {
						expect(exteriorFacesArray![i][j]).to.be.lessThan(numExteriorNodes!);
					}
				}
				expect(numExteriorNodes).to.equal(7014);
			});
		});
		it('parses wingnut.msh', () => {
			parser.parse('./test/msh/wingnut.msh', (mesh) => {
				const {
					nodesArray,
					elementsArray,
					isTetMesh,
					exteriorFacesArray,
					numExteriorNodes,
				} = mesh;
				expect(nodesArray.constructor).to.equal(Float64Array);
				expect(nodesArray.length).to.equal(15573);
				expect(elementsArray.length).to.equal(16753);
				expect(elementsArray[0].length).to.equal(4);
				expect(isTetMesh).to.equal(true);
				expect(exteriorFacesArray!.length).to.equal(8746);
				for (let i = 0; i < exteriorFacesArray!.length; i++) {
					for (let j = 0; j < exteriorFacesArray![i].length; j++) {
						expect(exteriorFacesArray![i][j]).to.be.lessThan(numExteriorNodes!);
					}
				}
				expect(numExteriorNodes).to.equal(4373);
			});
		});
	});
	describe('parseSync', () => {
		const parser = new MSHParser();
		it('parses stanford_bunny.msh', () => {
			const mesh = parser.parseSync('./test/msh/stanford_bunny.msh');
			const {
				nodesArray,
				elementsArray,
				isTetMesh,
				exteriorFacesArray,
				numExteriorNodes,
			} = mesh;
			expect(nodesArray.constructor).to.equal(Float64Array);
			expect(nodesArray.length).to.equal(25476);
			expect(elementsArray.length).to.equal(27232);
			expect(elementsArray[0].length).to.equal(4);
			expect(isTetMesh).to.equal(true);
			expect(exteriorFacesArray!.length).to.equal(14024);
			for (let i = 0; i < exteriorFacesArray!.length; i++) {
				for (let j = 0; j < exteriorFacesArray![i].length; j++) {
					expect(exteriorFacesArray![i][j]).to.be.lessThan(numExteriorNodes!);
				}
			}
			expect(numExteriorNodes).to.equal(7014);
		});
		it('parses wingnut.msh', () => {
			const mesh = parser.parseSync('./test/msh/wingnut.msh');
			const {
				nodesArray,
				elementsArray,
				isTetMesh,
				exteriorFacesArray,
				numExteriorNodes,
			} = mesh;
			expect(nodesArray.constructor).to.equal(Float64Array);
			expect(nodesArray.length).to.equal(15573);
			expect(elementsArray.length).to.equal(16753);
			expect(elementsArray[0].length).to.equal(4);
			expect(isTetMesh).to.equal(true);
			expect(exteriorFacesArray!.length).to.equal(8746);
			for (let i = 0; i < exteriorFacesArray!.length; i++) {
				for (let j = 0; j < exteriorFacesArray![i].length; j++) {
					expect(exteriorFacesArray![i][j]).to.be.lessThan(numExteriorNodes!);
				}
			}
			expect(numExteriorNodes).to.equal(4373);
		});
	});
	describe('parseAsync', () => {
		const parser = new MSHParser();
		it('parses stanford_bunny.msh', async () => {
			const mesh = await parser.parseAsync('./test/msh/stanford_bunny.msh');
			const {
				nodesArray,
				elementsArray,
				isTetMesh,
				exteriorFacesArray,
				numExteriorNodes,
			} = mesh;
			expect(nodesArray.constructor).to.equal(Float64Array);
			expect(nodesArray.length).to.equal(25476);
			expect(elementsArray.length).to.equal(27232);
			expect(elementsArray[0].length).to.equal(4);
			expect(isTetMesh).to.equal(true);
			expect(exteriorFacesArray!.length).to.equal(14024);
			for (let i = 0; i < exteriorFacesArray!.length; i++) {
				for (let j = 0; j < exteriorFacesArray![i].length; j++) {
					expect(exteriorFacesArray![i][j]).to.be.lessThan(numExteriorNodes!);
				}
			}
			expect(numExteriorNodes).to.equal(7014);
		});
		it('parses wingnut.msh', async () => {
			const mesh = await parser.parseAsync('./test/msh/wingnut.msh');
			const {
				nodesArray,
				elementsArray,
				isTetMesh,
				exteriorFacesArray,
				numExteriorNodes,
			} = mesh;
			expect(nodesArray.constructor).to.equal(Float64Array);
			expect(nodesArray.length).to.equal(15573);
			expect(elementsArray.length).to.equal(16753);
			expect(elementsArray[0].length).to.equal(4);
			expect(isTetMesh).to.equal(true);
			expect(exteriorFacesArray!.length).to.equal(8746);
			for (let i = 0; i < exteriorFacesArray!.length; i++) {
				for (let j = 0; j < exteriorFacesArray![i].length; j++) {
					expect(exteriorFacesArray![i][j]).to.be.lessThan(numExteriorNodes!);
				}
			}
			expect(numExteriorNodes).to.equal(4373);
		});
	});
	describe('helper functions', () => {
		const parser = new MSHParser();
		it('calculates edges', () => {
			parser.parse('./test/msh/stanford_bunny.msh', (mesh) => {
				expect(MSHParser.calculateEdges(mesh).length).to.equal(85470);
			});
			parser.parse('./test/msh/wingnut.msh', (mesh) => {
				expect(MSHParser.calculateEdges(mesh).length).to.equal(52634);
			});
			// Should only work for tet meshes.
			// @ts-ignore
			assert.throws(() => { MSHParser.calculateEdges({}); },
					'MSHParser.calculateEdges() is not defined for non-tet meshes.');
		});
		it('calculates exterior edges', () => {
			parser.parse('./test/msh/stanford_bunny.msh', (mesh) => {
				const { numExteriorNodes } = mesh;
				const exteriorEdges = MSHParser.calculateExteriorEdges(mesh);
				expect(exteriorEdges.length).to.equal(42072);
				for (let i = 0; i < exteriorEdges.length; i++) {
					expect(exteriorEdges[i]).to.be.lessThan(numExteriorNodes!);
				}
			});
			parser.parse('./test/msh/wingnut.msh', (mesh) => {
				const { numExteriorNodes } = mesh;
				const exteriorEdges = MSHParser.calculateExteriorEdges(mesh);
				expect(exteriorEdges.length).to.equal(26238);
				for (let i = 0; i < exteriorEdges.length; i++) {
					expect(exteriorEdges[i]).to.be.lessThan(numExteriorNodes!);
				}
			});
			// Should only work for tet meshes.
			// @ts-ignore
			assert.throws(() => { MSHParser.calculateExteriorEdges({}); },
					'MSHParser.calculateExteriorEdges() is not defined for non-tet meshes.');
		});
		it('calculates element volumes', () => {
			const mesh = {
				nodesArray: new Float64Array([0.0602199663806855, 0.49751450352769044, 0.7131123276070683, 0.9084651625068094, 0.33396125369831187, 0.1380161786110643, 0.4583451764144413, 0.688532817295026, 0.945716645131462, 0.958311285376239, 0.12666668330466857, 0.7977913734552935, 0.41262442150130174, 0.6223354613411913, 0.6370087069878603, 0.12888790515116644, 0.30002067198014215, 0.25742974031567156, 0.7047478823270708, 0.04330587322121615, 0.1895952895088311, 0.5983337921556737, 0.37619755133909805, 0.1294034534420645, 0.6350989211261531, 0.8662484132063868, 0.5100940455487908, 0.9381324870022181, 0.004827791593322139, 0.12137853262497988]),
				isTetMesh: true,
				elementsArray: [[2,4,8,9],[0,7,8,9],[4,2,9,1],[7,1,3,5],[1,2,9,7],[1,7,8,3],[9,8,7,6],[1,4,2,6],[5,3,1,8],[7,8,5,9],[6,0,3,5],[9,8,6,2],[2,8,4,1],[9,2,4,5],[0,4,3,6],[3,7,0,8],[8,9,4,7],[2,8,7,5],[5,0,9,4],[6,4,2,9]],
			};
			const volumes = MSHParser.calculateElementVolumes(mesh);
			const results = [
				0.01468907855451107, 0.027233270928263664,
				0.009243804030120373, 0.003306158585473895,
				0.01351762842386961,  0.02078229933977127,
				0.006563224364072084, 0.010816864669322968,
				0.05617678537964821,  0.01624433882534504,
				0.0017827862175181508, 0.014534148387610912,
				0.010199368931353092, 0.013394961133599281,
				0.02672077901661396, 0.053675826638936996,
				0.014178073033690453, 0.019229570403695107,
				0.015569592826068401,  0.00561224389821291,
			];
			for (let i = 0; i < volumes.length; i++) {
				expect(volumes[i]).to.equal(results[i]);
			}
			
			// Should only work for tet meshes.
			// @ts-ignore
			assert.throws(() => { MSHParser.calculateElementVolumes({}); },
					'MSHParser.calculateElementVolumes() is not defined for non-tet meshes.');
		});
		it('calculates nodal volumes', () => {
			const mesh = {
				nodesArray: new Float64Array([0.0602199663806855, 0.49751450352769044, 0.7131123276070683, 0.9084651625068094, 0.33396125369831187, 0.1380161786110643, 0.4583451764144413, 0.688532817295026, 0.945716645131462, 0.958311285376239, 0.12666668330466857, 0.7977913734552935, 0.41262442150130174, 0.6223354613411913, 0.6370087069878603, 0.12888790515116644, 0.30002067198014215, 0.25742974031567156, 0.7047478823270708, 0.04330587322121615, 0.1895952895088311, 0.5983337921556737, 0.37619755133909805, 0.1294034534420645, 0.6350989211261531, 0.8662484132063868, 0.5100940455487908, 0.9381324870022181, 0.004827791593322139, 0.12137853262497988]),
				isTetMesh: true,
				elementsArray: [[2,4,8,9],[0,7,8,9],[4,2,9,1],[7,1,3,5],[1,2,9,7],[1,7,8,3],[9,8,7,6],[1,4,2,6],[5,3,1,8],[7,8,5,9],[6,0,3,5],[9,8,6,2],[2,8,4,1],[9,2,4,5],[0,4,3,6],[3,7,0,8],[8,9,4,7],[2,8,7,5],[5,0,9,4],[6,4,2,9]],
			};
			const volumes = MSHParser.calculateNodalVolumes(mesh);
			const results = [
				0.031245563179254532, 0.03101072832942009,
				0.027809416875243187, 0.040611159056425095,
				0.030106190592050552, 0.03142604976892471,
				0.01650751195847988, 0.04368259757757187,
				0.06337649375200272, 0.03769508749246597,
			];
			for (let i = 0; i < volumes.length; i++) {
				expect(volumes[i]).to.equal(results[i]);
			}
			const elementVolumes = MSHParser.calculateElementVolumes(mesh);
			expect(volumes.reduce((partialSum, a) => partialSum + a, 0)).to.almost.equal(elementVolumes.reduce((partialSum, a) => partialSum + a, 0));
			
			// Should only work for tet meshes.
			// @ts-ignore
			assert.throws(() => { MSHParser.calculateNodalVolumes({}); },
					'MSHParser.calculateNodalVolumes() is not defined for non-tet meshes.');
		});
		it('calculates bounding box', () => {
			parser.parse('./test/msh/stanford_bunny.msh', (mesh) => {
				const { min, max } = MSHParser.calculateBoundingBox(mesh);
				expect(min).to.deep.equal([-43.133523557360256, -33.408036848762215, -0.0010786724840932279]);
				expect(max).to.deep.equal([43.138475101021584, 33.3942439679999, 83.69444330381762]);
			});
			parser.parse('./test/msh/wingnut.msh', (mesh) => {
				const { min, max } = MSHParser.calculateBoundingBox(mesh);
				expect(min).to.deep.equal([-1.2498986197785313, -0.5488943641668116, -4.5772923088512436e-8]);
				expect(max).to.deep.equal([1.2498814910148646, 0.5488943641071283, 1.2499371421138041]);
			});
		});
		it('scales the node positions to unit bounding box', () => {
			parser.parse('./test/msh/stanford_bunny.msh', (mesh) => {
				mesh.nodesArray = MSHParser.scaleNodesArrayToUnitBoundingBox(mesh);
				const { min, max } = MSHParser.calculateBoundingBox(mesh);
				expect(min).to.deep.equal([-0.5, -0.3871608508879252, -0.485067711875539]);
				expect(max).to.deep.equal([0.5, 0.3871608508879252, 0.4850677118755391]);
			});
			parser.parse('./test/msh/wingnut.msh', (mesh) => {
				mesh.nodesArray = MSHParser.scaleNodesArrayToUnitBoundingBox(mesh);
				const { min, max } = MSHParser.calculateBoundingBox(mesh);
				expect(min).to.deep.equal([-0.5, -0.21957705870487879, -0.25000942732719283]);
				expect(max).to.deep.equal([0.5, 0.21957705870487879, 0.25000942732719283]);
			});
		});
	});
});