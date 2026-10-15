import babel from '@rolldown/plugin-babel';
import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['package/index.ts'],
  format: ['esm', 'cjs'],
  platform: 'neutral',
  tsconfig: 'scripts/tsconfig.build.json',
  target: 'esnext',
  minify: true,
  sourcemap: true,
  dts: { sourcemap: false },
  clean: false,
  deps: { neverBundle: ['@hello-pangea/dnd'] },
  plugins: [
    babel({
      plugins: [
        [
          'babel-plugin-react-compiler',
          {
            logger: {
              logEvent(
                filename: string | null,
                event: { kind: string; fnLoc?: { start: { line: number } } | null; detail?: { reason?: string } }
              ) {
                if (event.kind === 'CompileError' || event.kind === 'CompileDiagnostic') {
                  // biome-ignore lint/suspicious/noConsole: surfaces functions the compiler could not optimize
                  console.warn(
                    `[react-compiler] skipped ${filename}:${event.fnLoc?.start.line ?? '?'}: ${event.detail?.reason ?? event.kind}`
                  );
                }
              },
            },
          },
        ],
      ],
    }),
  ],
});
