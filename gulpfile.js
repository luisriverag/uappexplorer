var gulp = require('gulp');
var jshint = require('gulp-jshint');
var stylish = require('jshint-stylish');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');
var ngAnnotate = require('gulp-ng-annotate');
var sourcemaps = require('gulp-sourcemaps');
var minifyCSS = require('gulp-minify-css');
var template = require('gulp-template');
var preprocess = require('gulp-preprocess');
var htmlmin = require('gulp-htmlmin');
var del = require('del');

var paths = {
  front_js: ['src/server/static/app/**/*.js', '!src/server/static/app/load.js'],
  load: 'src/server/static/app/load.js',
  back_js: ['gulpfile.js', 'src/**/*.js', '!src/server/static/app/**/*.js'],
  imgs: 'src/server/static/img/*',
  css: 'src/server/static/css/*.css',
  html: ['src/server/static/*.html', 'src/server/static/app/**/*.html'],
  dist: 'src/server/static/dist/**'
};

gulp.task('clean', function() {
  del.sync(paths.dist);
});

gulp.task('lint-front', function() {
  var options = {
    node: true,
    browser: true,
    esnext: true,
    curly: true,
    immed: true,
    indent: 2,
    latedef: true,
    newcap: true,
    noarg: true,
    quotmark: 'single',
    undef: true,
    unused: true,
    strict: false,
    globalstrict: true,
    trailing: true,
    smarttabs: true,
    devel: true,
    bitwise: false,
    globals: {
      angular: false,
      '_': false,
      '$': false,
      LazyLoad: false,
      v: false,
      ga: false
    }
  };

  gulp.src(paths.front_js)
    .pipe(jshint(options))
    .pipe(jshint.reporter(stylish));
});

gulp.task('lint-back', function() {
  gulp.src(paths.back_js)
    .pipe(jshint())
    .pipe(jshint.reporter(stylish));
});

gulp.task('build-html', function() {
  var today = new Date();

  gulp.src(paths.html, {base: 'src/server/static'})
    .pipe(preprocess({
        context: {ENV: 'production'}
    }))
    .pipe(template({
        version: today.getTime()
    }))
    .pipe(htmlmin({collapseWhitespace: true}))
    .pipe(gulp.dest('src/server/static/dist'));
});

gulp.task('build-css', function() {
  gulp.src(paths.css)
    .pipe(concat('main.css'))
    .pipe(minifyCSS())
    .pipe(gulp.dest('src/server/static/dist/css'));
});

gulp.task('build-img', function() {
  gulp.src(paths.imgs)
    .pipe(gulp.dest('src/server/static/dist/img'));
});

gulp.task('build-js', function() {
  gulp.src(paths.load)
    .pipe(preprocess({
      context: {ENV: 'production'}
    }))
    .pipe(uglify())
    .pipe(gulp.dest('src/server/static/dist/app'));

  gulp.src(paths.front_js, {base: 'src/server/static/app'})
    .pipe(sourcemaps.init())
    .pipe(concat('app.js'))
    .pipe(ngAnnotate())
    .pipe(uglify())
    .pipe(sourcemaps.write('maps'))
    .pipe(gulp.dest('src/server/static/dist/app'));
});

gulp.task('lint', ['lint-front', 'lint-back']);
gulp.task('build', ['lint', 'clean', 'build-js', 'build-img', 'build-css', 'build-html']);