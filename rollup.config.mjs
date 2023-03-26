import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/msh-parser.ts',
  output: {
    file: 'dist/msh-parser.js',
    format: 'umd',
    name: 'MSHParserLib',
    sourcemap: true,
  },
  plugins: [
    typescript(),
  ],
  external: ['fs'],
};