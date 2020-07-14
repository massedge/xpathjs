module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        clean: {
            dist: {
                src: [
                    'dist'
                ]
            }
        },

        peg: {
            dist: {
                options: {
                    exportVar: "XPathJS._parser"
                },
                src: 'src/parser.pegjs',
                dest: 'dist/parser.js'
            }
        },

        concat: {
            dist: {
                src: [
                    'src/engine.js',
                    'dist/parser.js'
                ],
                dest: 'dist/xpathjs.js'
            }
        },

        uglify: {
            dist: {
                options: {
                    sourceMap: true,
                },
                src: 'dist/xpathjs.js',
                dest: 'dist/xpathjs.min.js',
            }
        }
    });

    // Load the plugins
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-peg');

    grunt.registerTask('dist', [
        'clean:dist',
        'peg:dist',
        'concat:dist',
        'uglify:dist'
    ]);
};
