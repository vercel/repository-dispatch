import { defineConfig, Options } from 'tsup';

export default defineConfig((options: Options) => ({
  entry: ['src/steps/*.ts'],
  format: ['cjs'],
  clean: true,
  noExternal: ['@actions/core', '@actions/github'],
  minify: true,
  ...options,
}));
