/// <vs SolutionOpened='default' />
// http://andy-carter.com/blog/a-beginners-guide-to-the-task-runner-gulp
// http://www.smashingmagazine.com/2014/06/11/building-with-gulp/

// Configure gulp scripts
var appName = 'csWebApp';

var gulp = require('gulp'),
    // uglify = require('gulp-uglify'),
    useref = require('gulp-useref'),
    concat = require('gulp-concat'),
    plumber = require('gulp-plumber'),
    watch = require('gulp-watch');

gulp.task('copy_csServerComp', function() {
    return gulp.src('../csServerComp/ServerComponents/**/*.js')
        //.pipe(concat('csServerComp.js'))
        .pipe(gulp.dest('./ServerComponents'));
});

gulp.task('built_csServerComp.d.ts', function() {
    gulp.src('../csServerComp/ServerComponents/**/*.d.ts')
        .pipe(plumber())
      //  .pipe(concat('csServerComp.d.ts'))
        .pipe(gulp.dest('./ServerComponents'));
        //.pipe(gulp.dest('./public/cs/js'));
});

gulp.task('copy_csServerComp_scripts', function() {
    return gulp.src('../csServerComp/Scripts/**/*.ts')
        //.pipe(concat('csComp.js'))
        .pipe(gulp.dest('./Scripts'));
});

gulp.task('create_templateCache', function() {
    console.log('Creating templateCache.')
    var options = {
        module: appName,
        filename: 'csTemplates.js'
    }

    gulp.src('../../../csWeb/csComp/**/*.tpl.html')
        // .pipe(debug({
        //     title: 'create_templateCache:'
        // }))
        .pipe(templateCache(options))
        .pipe(gulp.dest('public/cs/js'))
})

gulp.task('create_dist', function() {
    var assets = useref.assets();

    return gulp.src('./public/*.html')
        .pipe(assets)
        .pipe(assets.restore())
        .pipe(useref())
        .pipe(gulp.dest('dist'));
});

gulp.task('create_release_dist', function() {
    var assets = useref.assets();

    return gulp.src('./public/*.html')
        .pipe(assets)
        .pipe(gulpif('*.js', uglify()))
        .pipe(gulpif('*.css', minifyCss()))
        .pipe(assets.restore())
        .pipe(useref())
        .pipe(gulp.dest('dist'));
});

gulp.task('watch', function() {
    gulp.watch('../csServerComp/ServerComponents/**/*.js', ['copy_csServerComp']);
    gulp.watch('../csServerComp/Scripts/**/*.ts', ['copy_csServerComp_scripts']);
    gulp.watch('../csServerComp/ServerComponents/**/*.d.ts', ['built_csServerComp.d.ts']);
});

gulp.task('default', ['copy_csServerComp', 'built_csServerComp.d.ts', 'copy_csServerComp_scripts', 'watch']);
