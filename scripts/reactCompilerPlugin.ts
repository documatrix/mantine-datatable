import { readFile } from 'node:fs/promises';
import { transformAsync } from '@babel/core';
import type { Plugin } from 'esbuild';

export const reactCompilerPlugin: Plugin = {
  name: 'react-compiler',
  setup(build) {
    build.onLoad({ filter: /[\\/]package[\\/].*\.tsx?$/ }, async ({ path }) => {
      if (path.endsWith('.d.ts')) return undefined;

      const source = await readFile(path, 'utf8');
      const result = await transformAsync(source, {
        filename: path,
        babelrc: false,
        configFile: false,
        sourceMaps: 'inline',
        presets: [['@babel/preset-typescript', { allExtensions: true, isTSX: path.endsWith('x') }]],
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
      });

      return { contents: result?.code ?? source, loader: 'jsx' };
    });
  },
};
