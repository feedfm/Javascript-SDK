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
      .pipe(gulp.dest('./dist'));
  }

  bundler.on('update', function() {
    rebundle();
    gutil.log('Rebundle...');
  });
  return rebundle();
}

// include some commends in the minified file
function preserveComments(node, comment) {
  return comment.type === 'comment2' && /@preserve|@license|@cc_on|^\!/i.test(comment.value);
}




gulp.task('build', function() {
  return buildScript('feed.js', false);
});

gulp.task('default', ['build'], function() {
  return buildScript('feed.js', true);
});

