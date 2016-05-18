/*jshint node:true */
'use strict';

// should be updated to automatically deal with releases:
// https://github.com/gulpjs/gulp/blob/master/docs/recipes/automate-release-workflow.md

var watchify = require('watchify');
var browserify = require('browserify');
var gulp = require('gulp');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var gutil = require('gulp-util');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var assign = require('lodash.assign');
var jsdoc = require('gulp-jsdoc3');

// browserify, minify, gen source maps
function buildScript(file, watch) {
  var opts = assign({}, watchify.args, {
    basedir: './src',
    standalone: 'Feed',
    transform: [ 'browserify-shim' ],
    debug: true
  });

  var bundler = browserify(file, opts);
  if (watch) {
    bundler = watchify(bundler);
  }

  var start;

  function rebundle() {
    return bundler.bundle()
      // log errors if they happen
      .on('log', gutil.log) // output build logs to terminal
      .on('error', gutil.log.bind(gutil, 'Browserify Error'))
      .pipe(source(file))
      .pipe(buffer())
      .pipe(sourcemaps.init({loadMaps: true})) // loads map from browserify file
        .pipe(uglify({ output: { ascii_only: true, comments: preserveComments } }))
        .on('error', gutil.log)
      .pipe(sourcemaps.write('./'))
      .pipe(gulp.dest('./dist'))
      .on('finish', function() {
        gutil.log('Finished build after ' + (Date.now() - start) + 'ms');
      });
  }

  bundler.on('update', function() {
    start = Date.now();
    gutil.log('Starting build...');
    rebundle();
  });

  start = Date.now();
  gutil.log('Starting build...');
  return rebundle();
}

// include some commends in the minified file
function preserveComments(node, comment) {
  return comment.type === 'comment2' && /@preserve|@license|@cc_on|^\!/i.test(comment.value);
}


gulp.task('docs', function(cb) {
  var config = {
    plugins: [ 'plugins/markdown' ],
    opts: {
      destination: './html/docs'
    }
  };

  gulp.src([
  'README.md', './src/feed.js', './src/session.js', './src/events.js', './src/play.js',
  './src/station.js', './src/speaker.js', './src/player.js', './src/client.js' 
  ], {read: false})
      .pipe(jsdoc(config, cb));
});

gulp.task('build', function() {
  return buildScript('feed.js', false);
});

gulp.task('default', [ 'docs' ], function() {
  gulp.watch('src/*.js', [ 'docs' ]);

  return buildScript('feed.js', true);
});

