import { defineConfig } from 'tsup';
import { reactCompilerPlugin } from './reactCompilerPlugin';

export default defineConfig({
  entry: ['package/index.ts'],
  format: 'esm',
  tsconfig: 'scripts/tsconfig.tsup.json',
  target: 'esnext',
  minify: true,
  sourcemap: true,
  clean: false,
  esbuildPlugins: [reactCompilerPlugin],
});
