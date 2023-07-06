import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

export default {
  input: 'src/msh-parser.ts',
  output: {
    file: 'bundle/msh-parser.min.js',
    format: 'umd',
    name: 'MSHParserLib',
    sourcemap: true,
	plugins: [
		terser(),
	],
  },
  plugins: [
	resolve({
		browser: true,
	}),
    typescript({
		sourceMap: true,
		inlineSources: true,
		outDir: './bundle',
	}),
  ],
  external: ['fs'],
};