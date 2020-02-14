import resolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import json from 'rollup-plugin-json';
import bundleSize from 'rollup-plugin-bundle-size';
import visualizer from 'rollup-plugin-visualizer';
import { uglify } from 'rollup-plugin-uglify';
import pkg from './package.json';

export default [
  // production IIFE release
  {
    input: 'src/index.js',
    output: {
      file: 'dist/feed-media-audio-player.min.js',
      format: 'iife',
      name: 'Feed'
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
      uglify({
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
    external: [ 
      'tiny-cookie',
      'core-js/modules/es6.object.assign',
      'core-js/modules/es6.promise',
      'core-js/modules/es7.promise.finally',
      'core-js/modules/es6.regexp.split',
      'core-js/modules/es7.symbol.async-iterator',
      'core-js/modules/es6.symbol',
      'core-js/modules/es6.function.name',
      'core-js/modules/es6.array.find',
      'core-js/modules/web.dom.iterable',
      'core-js/modules/es6.array.iterator',
      'core-js/modules/es6.object.keys'
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
      uglify({
        output: {
          ascii_only: true
        }
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
    plugins: [
      resolve(),
      commonjs(),
      babel({
        exclude: 'node_modules/**'
      })
    ]
  }
];
