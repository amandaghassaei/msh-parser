const { expect } = require('chai');
const { MSHParser } = require('..');

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
				expect(exteriorFacesArray.length).to.equal(14024);
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
				expect(nodesArray.length).to.equal(36252);
				expect(elementsArray.length).to.equal(48419);
				expect(elementsArray[0].length).to.equal(4);
				expect(isTetMesh).to.equal(true);
				expect(exteriorFacesArray.length).to.equal(14404);
				expect(numExteriorNodes).to.equal(7202);
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
			expect(exteriorFacesArray.length).to.equal(14024);
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
			expect(nodesArray.length).to.equal(36252);
			expect(elementsArray.length).to.equal(48419);
			expect(elementsArray[0].length).to.equal(4);
			expect(isTetMesh).to.equal(true);
			expect(exteriorFacesArray.length).to.equal(14404);
			expect(numExteriorNodes).to.equal(7202);
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
			expect(exteriorFacesArray.length).to.equal(14024);
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
			expect(nodesArray.length).to.equal(36252);
			expect(elementsArray.length).to.equal(48419);
			expect(elementsArray[0].length).to.equal(4);
			expect(isTetMesh).to.equal(true);
			expect(exteriorFacesArray.length).to.equal(14404);
			expect(numExteriorNodes).to.equal(7202);
		});
	});
	describe('helper functions', () => {
		const parser = new MSHParser();
		it('calculates edges', () => {
			parser.parse('./test/msh/stanford_bunny.msh', (mesh) => {
				expect(MSHParser.calculateEdges(mesh).length).to.equal(85470);
			});
			parser.parse('./test/msh/wingnut.msh', (mesh) => {
				expect(MSHParser.calculateEdges(mesh).length).to.equal(135410);
			});
		});
	});
});