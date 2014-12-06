    // "autoprefixer-core": "^4.0.0",
    // "gulp-postcss": "^3.0.0",
    // "gulp-sass": "^1.1.0",
    // "postcss-assets": "^0.9.0"

var gulp = require('gulp');

var uglify = require('gulp-uglify');
var svgo = require('gulp-svgo');
/*
var postcss = require('gulp-postcss');
var sass = require('gulp-sass');

gulp.task ('sass', function () {
  gulp.src (['sass/*.scss', '!sass/_*.scss'])
    .pipe (sass ({
      outputStyle: 'compressed',
    }))
    .pipe (postcss ([
      require ('autoprefixer-core')({
        browsers: ['last 1 version', 'last 2 Explorer versions']
      }),
      require ('postcss-assets')({
        basePath: 'images/',
        baseUrl: '/system/theme/',
        inline: { maxSize: '52K' }
      })
    ]))
    .pipe(gulp.dest('styles/'))
});
*/

gulp.task ('uglify', function () {
  gulp.src (['emerge.js'])
    .pipe (uglify ())
    .pipe(gulp.dest('../release/'))
})

/*
gulp.task ('svgo', function () {
  gulp.src (['ring.svg'])
    .pipe (svgo ())
    .pipe(gulp.dest('../release/'))
})
*/

gulp.task ('default', ['uglify'])
