import babel from 'rollup-plugin-babel';
import bundleSize from 'rollup-plugin-bundle-size';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import visualizer from 'rollup-plugin-visualizer';

export default [
  // production IIFE release
  {
    input: 'src/index.js',
    output: {
      file: 'dist/feed-media-audio-player.min.js',
      format: 'iife',
      name: 'Feed'
    },
    watch: {
      clearScreen: false
    },
    plugins: [
      json({ // so we can get version
        include: 'package.json',
        preferConst: false,
        compact: true,
        namedExports: true
      }),
      resolve(),
      commonjs(),
      babel({
        exclude: 'node_modules/**'
      }),
      terser({
        output: {
          ascii_only: true
        }
      }),
      bundleSize()      
    ]
  },
  // production CJS release
  {
    input: 'src/index.js',
    output: {
      file: 'lib/index.js',
      format: 'cjs',
    },
    watch: {
      clearScreen: false
    },
    external: [ 
      'tiny-cookie'
    ],
    plugins: [
      json({ // so we can get version
        include: 'package.json',
        preferConst: false,
        compact: true,
        namedExports: true
      }),
      babel({
        exclude: 'node_modules/**'
      }),
      bundleSize()
    ]
  },
  // internal development and testing
  {
    input: 'src/index.js',
    output: {
      file: 'build/feed.js',
      format: 'iife',
      name: 'Feed',
      sourcemap: true
    },
    watch: {
      clearScreen: false
    },
    plugins: [
      json({ // so we can get version
        include: 'package.json',
        preferConst: true,
        indent: ' ',
        compact: true,
        namedExports: true
      }),
      resolve(),
      commonjs(),
      babel({
        exclude: 'node_modules/**'
      }),
      visualizer({
        filename: 'build/statistics.html'
      }),
      bundleSize()
    ]
  },
  {
    input: 'test/player.js',
    output: {
      file: 'build/player.js',
      format: 'iife',
      sourcemap: true
    },
    watch: {
      clearScreen: false
    },
    plugins: [
      resolve(),
      commonjs(),
      babel({
        exclude: 'node_modules/**',
        runtimeHelpers: true
      })
    ]
  }
];
