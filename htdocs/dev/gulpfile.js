'use strict';

var plugins = require('gulp-load-plugins');
var gulp = require('gulp');
var path = require('path');
var yaml = require('js-yaml');
var fs = require('fs');
var pro = false; // 
var cfg;
var s;
const $ = plugins();
const cwd = path.basename(__dirname);

function rcfg(p) {
	fs.readFile('config.yml', 'utf8', (e, data) => {
		cfg = yaml.load(data);
//		console.log(cfg);
		p();
	});
};

let src = gulp.parallel(
	() => gulp.src(cfg.ZURB + 'scss/*.scss').pipe(gulp.dest('src/scss')),
	() => gulp.src(cfg.ZURB + 'bower_components/foundation-sites/scss/**/*.scss').pipe(gulp.dest('src/scss/fs')),
	() => gulp.src(cfg.ZURB + 'bower_components/motion-ui/src/**/*.scss').pipe(gulp.dest('src/scss/mu')),
	() => gulp.src(cfg.ZURB + 'bower_components/what-input/what-input*.js').pipe(gulp.dest('src/js/wi')),
	() => gulp.src(cfg.ZURB + 'bower_components/foundation-sites/js/*.js').pipe(gulp.dest('src/js/fs')),
	() => gulp.src(cfg.ZURB + 'js/*.js').pipe(gulp.dest('src/js'))
);

function sass() {
	return gulp.src('src/scss/app.scss')
		.pipe($.if(!pro, $.sourcemaps.init()))
		.pipe($.sass({ includePaths: ['src/scss/fs','src/scss/mu'] }).on('error', $.sass.logError))
		.pipe($.autoprefixer({ browsers: cfg.COMPATIBILITY }))
//		.pipe($.cssnano())
		.pipe($.if(pro, $.uncss(cfg.UNCSS_OPTIONS)))
		.pipe($.cssnano())
		.pipe($.if(!pro, $.sourcemaps.write({includeContent: false, sourceRoot: '../../'+cwd+'/src/scss'})))
		.pipe(gulp.dest('../assets/css'))
};

function js() {
	s=['src/js/fs/{' + cfg.JS + '}','src/js/!(app).js','src/js/app.js'];
	if (cfg.WI) {s.unshift('src/js/wi/' + cfg.WI)};
	return gulp.src(s)
		.pipe($.if(!pro, $.sourcemaps.init()))
		.pipe($.babel({ presets: ['es2015'] }))
		.pipe($.concat('app.js'))
		.pipe($.if(pro, 
			$.uglify().on('error', e => { console.log(e); }),
			$.sourcemaps.write({includeContent: false, sourceRoot: '../../'+cwd+'/src/js'})))
//		.pipe($.if(!pro, $.sourcemaps.write({includeContent: false, sourceRoot: '../../'+cwd+'/src/js'})))
		.pipe(gulp.dest('../assets/js'))
}

function font() {
	return gulp.src('icons/svg/{' + cfg.FONT + '}')
		.pipe($.iconfontCss({
			fontName: 'fi',
			path: 'icons/font-tpl.scss',
			targetPath: '../../'+cwd+'/src/scss/_icons.scss'
		}))
		.pipe($.iconfont({
			fontName: 'fi', // required 
			formats: ['ttf', 'eot', 'woff', 'woff2'], // default, 'woff2' and 'svg' are available 
		}))
		.pipe(gulp.dest('../assets/css'))
};

function lr() {
	return gulp.src('./')
		.pipe($.livereload())
};

function watch() {
	$.livereload.listen({ quiet: true, start: true });
	gulp.watch(['src/scss/*.scss','!src/scss/_icons.scss'], gulp.series(sass, lr));
	gulp.watch('src/js/*.js', gulp.series(js, lr));
	gulp.watch('src/tpl/font-tpl.scss',gulp.series(font, sass, lr));
	gulp.watch('config.yml',gulp.series(rcfg, font, gulp.parallel(sass, js), lr));
};
function back() {
	return gulp.src(['./**/*','!./node_modules','!./node_modules/**/*'])
		.pipe($.tar(Date.now() + '.tar'))
		.pipe($.gzip())
		.pipe(gulp.dest('../../backup'));
}
gulp.task(back);
gulp.task('init', gulp.series(gulp.parallel(rcfg, back), src));
gulp.task('build', gulp.series(p => {pro = true;p()}, rcfg, font, gulp.parallel(sass, js)));
gulp.task('default', gulp.series(rcfg, font, gulp.parallel(sass, js), watch));
