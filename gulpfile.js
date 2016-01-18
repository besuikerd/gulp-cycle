var gulp        = require('gulp');
var sass        = require('gulp-sass');
var gutil       = require('gulp-util');
var concat      = require('gulp-concat');
var eslint      = require('gulp-eslint');
var uglify      = require('gulp-uglify');
var source      = require('vinyl-source-stream');
var babelify    = require('babelify');
var watchify    = require('watchify');
var exorcist    = require('exorcist');
var browserify  = require('browserify');
var browserSync = require('browser-sync').create();
var _ = require('lodash');
var fs = require('fs');
var nodeResolve = require('resolve');
var readline = require('readline');
var spawn = require('child_process').spawn
var runSequence = require('run-sequence');
var Q = require('q');
var packageManifest = require('./package.json');
var production = (process.env.NODE_ENV === 'production');
var rootPath = 'src/main'
var src = {
    scss:   `${rootPath}/styles/**/*.scss`,
    css:    `${rootPath}/dist/styles`,
    js:     `${rootPath}/js`,
    jsMain: `${rootPath}/js/app.js`,
    html:   `${rootPath}/**/*.html`,
    dist:   `${rootPath}/dist`
}

// Input file.
watchify.args.debug = !production;

var bundler = watchify(browserify(`./${src.jsMain}`, watchify.args))
    .transform(babelify.configure({
        sourceMapRelative: src.js
    }));

// On updates recompile
bundler.on('update', function(){
  runSequence('bundle');
});
bundler.on('error', gutil.log.bind(gutil.colors.red, 'Browserify Error'));

gulp.task('compress', function(){
  return gulp.src(`${src.dist}/js/*.js`)
    .pipe(uglify())
    .pipe(gulp.dest(src.dist));
})

/**
 * Gulp task alias
 */
gulp.task('bundle', ['lint', 'build-vendor-js'], function () {
    return bundler.bundle()
      .pipe(exorcist(`${src.dist}/js/bundle.js.map`))
      .pipe(source('js/bundle.js'))
      .pipe(gulp.dest(src.dist))
      .pipe(browserSync.stream({once: true}));
});

/**
 * First bundle, then serve from the ./app directory
 */
gulp.task('default', ['build-vendor-js', 'build-vendor-css', 'sass', 'bundle'], function () {
    gulp.watch(src.scss, ['sass']);
    gulp.watch(src.html).on('change', browserSync.reload);

    browserSync.init({
        server: {
            baseDir: rootPath
        },
        browser: [] //do not open a browser tab
    });
});



gulp.task('sass', function(){
    return gulp.src(src.scss)
        .pipe(sass())
        .pipe(gulp.dest(src.css))
        .pipe(browserSync.reload({stream:true}))
});

function lint(){
  return gulp.src(`${src.js}/**/*.js`)
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
}
gulp.task('lint', lint);


gulp.task('build-vendor-js', function () {

  // this task will go through ./bower.json and
  // uses bower-resolve to resolve its full path.
  // the full path will then be added to the bundle using require()

  var b = browserify({
    // generate source maps in non-production environment
    debug: !production
  });

  // get all bower components ids and use 'bower-resolve' to resolve
  // the ids to their full path, which we need for require()
  getBowerPackageIds().forEach(function (path) {
    
    var exposeId = /([^/]+).js$/.exec(path)[0].stripExtension();
    var fullPath = `./bower_components/${path}`;
    b.require(fullPath, {

      // exposes the package id, so that we can require() from our code.
      // for eg:
      // require('./vendor/angular/angular.js', {expose: 'angular'}) enables require('angular');
      // for more information: https://github.com/substack/node-browserify#brequirefile-opts
      expose: exposeId

    });
  });
  
  (_.keys(packageManifest.dependencies) || []).forEach(function (id) {
    b.require(nodeResolve.sync(id), { expose: id });
  });

  return b
    .bundle()
    .on('error', function(err){
      // print the error (can replace with gulp-util)
      console.log(err.message);
      // end this stream
      this.emit('end');
    })
    // .pipe(exorcist(`${src.dist}/vendor.js.map`))
    .pipe(source('js/vendor.js'))
    .pipe(gulp.dest(src.dist));
});

gulp.task('build-vendor-css', function(){
  return gulp.src((packageManifest.vendorCss || []).concat(['bower_components/**/*.css']))
        .pipe(concat('styles/vendor.css'))
        .pipe(gulp.dest(src.dist))
});

gulp.task('init', ['initConfig'], function(cb){
    //install dependencies after initializing config
    runSequence('bowerInstall', cb);
})

gulp.task('initConfig', function(done){
    var deferred = Q.defer();
    var npmPath = './package.json';
    fs.readFile(npmPath, function(err, data){
        var npmConfig = JSON.parse(data);
        var stdio = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        })
        stdio.question(`Project name (${npmConfig.name}): `, function(projectName){
            stdio.question(`Project description (${npmConfig.description}): `, function(projectDescription){
                npmConfig.name = projectName || npmConfig.name;
                npmConfig.description = projectDescription || npmConfig.description;
                var stringifiedNpmConfig = JSON.stringify(npmConfig, null, '  ');
                gutil.log(npmPath + ' will be saved like this:\n', stringifiedNpmConfig);
                stdio.question('save? [Y/n]', function(answer){
                    if(answer.toLowerCase() !== 'n'){
                        fs.writeFile(npmPath, JSON.stringify(npmConfig, null, '  '), function(err){
                            if(err){
                                gutil.log(err);
                                deferred.reject(err);
                                return;
                            } else{
                                gutil.log('successfully wrote config');
                            }
                            var bowerPath = './bower.json';
                            fs.readFile(bowerPath, function(err, data){
                                var bowerConfig = JSON.parse(data);
                                bowerConfig.name = npmConfig.name;
                                bowerConfig.description = npmConfig.description;
                                var stringifiedBowerConfig = JSON.stringify(bowerConfig, null, '  ');
                                gutil.log(bowerPath + ' will be saved like this:\n', stringifiedBowerConfig);
                                stdio.question('save? [Y/n]', function(answer){
                                    if(answer.toLowerCase() !== 'n'){
                                        fs.writeFile(bowerPath, stringifiedBowerConfig, function(err, data){
                                            stdio.close()
                                            if(err){
                                                gutil.log(err)
                                                deffered.reject(err);
                                            } else{
                                                gutil.log('successfully wrote bower config');
                                                deferred.resolve();
                                            }
                                        })
                                    }
                                })
                            })
                        })
                    }
                })
            })
        })
    })
    return deferred.promise
})

function cmdLine(cmd){
    return function(cb){
        gutil.log(`running "${cmd}"`);
        var split = cmd.split(' ');
        var child = spawn(split[0], split.slice(1));
        child.stdout.on('data', x => gutil.log(x.toString()));
        child.stderr.on('data', x => gutil.log(x.toString()))
        child.on('end', cb);
    }
}

gulp.task('npmInstall', cmdLine('npm install'));
gulp.task('bowerInstall', cmdLine('bower install'));

function getBowerPackageIds() {
  // read bower.json and get dependencies' package ids
  var bowerManifest = {};
  try {
    bowerManifest = require('./bower.json');
    var dependencies = _.keys(bowerManifest.dependencies) || [];
    var subDependencies = dependencies.map(function(dep){
        var modules = [dep];
        try{
            var mainConfig = require(`./bower_components/${dep}/bower.json`).main
            if(typeof(mainConfig) === 'string'){
                modules = [mainConfig];
            } else if(typeof(mainConfig) === 'object'){
                modules = mainConfig;
            }
        } catch(e){
            //no bower.json in module, which should not be possible
        }
        return modules.map(function(module){
            return `${dep}/${module}`
        }).filter(function(module){
            return module.endsWith('.js');
        });
    });
    return _.flatten(subDependencies)
  } catch (e) {
    // does not have a bower.json manifest
  }
}

String.prototype.stripExtension = function(){
    return this.replace(/\.[^/.]+$/, "")
}
