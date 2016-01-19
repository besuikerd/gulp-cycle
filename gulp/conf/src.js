var main = 'src/main';
var conf = 'src/conf';

module.exports = {
    main:   main,
    conf:   conf,

    scss:   `${main}/styles/**/*.scss`,
    css:    `${main}/dist/styles`,
    js:     `${main}/js`,
    jsMain: `${main}/js/app.js`,
    html:   `${main}/**/*.html`,
    dist:   `${main}/dist`,
    
    bootstrap: {
        conf: `${conf}/bootstrap/bootstrap.config.js`,
        path: `${conf}/bootstrap`
    },

    jquery: {
        conf: `${conf}/jquery/jquery.config.js`
    }
};