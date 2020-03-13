
module.exports = function(grunt) {

	var snippetsURL = 'http://www.york.ac.uk/homepage-snippets/';
	var currentDate = new Date();
	var dateStamp =  currentDate.getFullYear() + '_' +
	                 ('0' + (currentDate.getMonth()+1)).slice(-2) + '_' +
	                 ('0' + currentDate.getDate()).slice(-2) + '_' +
	                 ('0' + currentDate.getHours()).slice(-2) +
	                 ('0' + currentDate.getMinutes()).slice(-2) +
	                 ('0' + currentDate.getSeconds()).slice(-2);

	var credentials = grunt.file.readJSON('.ftppass');
	
	// Project configuration.

	grunt.initConfig({

		credentials: credentials,

		pkg: grunt.file.readJSON('package.json'),

		alert: {
			slack: {
				type: 'slack',
				webhookUrl: credentials.notifications.url,
				message: '💥😬 Oops - the homepage build failed:\n\n```%s```',
			},
		},
		
		clean: ['download','upload'],

		bake: {
			build: {
				files: {
					"upload/index.shtml": "layouts/homepage.html"
				}
			}
		},

		http: {
			published: {
				options: {
					url: '<%= credentials.notifications.url %>',
					method: 'POST',
					json: true,
					body: {
						text: '✔😎 A new version of the homepage has been published: https://www.york.ac.uk',
					},
				},
			},
			test: {
				options: {
					url: '<%= credentials.notifications.url %>',
					method: 'POST',
					json: true,
					body: {
						text: '👀🤔 Homepage ready to preview: https://www.york.ac.uk/static/data/homepage/',
					},
				},
			},
		},

		sftp: {

			test: {
				files : { './': 'upload/index.shtml' },
				options: {
					path: '/usr/yorkweb/web/static/data/homepage/',
					host: 'sftp.york.ac.uk',
					username: '<%= credentials.static.username %>',
					password: '<%= credentials.static.password %>',
					srcBasePath: 'upload/',
					showProgress: true
				}
			},

			preview: {
				files : { './': 'upload/index.shtml' },
				options: {
					path: '/usr/yorkweb/web/preview/',
					host: 'sftp.york.ac.uk',
					username: '<%= credentials.preview.username %>',
					password: '<%= credentials.preview.password %>',
					srcBasePath: 'upload/',
					showProgress: true
				}
			},

			live: {
				files : { './': 'upload/index.shtml' },
				options: {
					path: '.',
					host: 'sftp.york.ac.uk',
					username: '<%= credentials.live.username %>',
					password: '<%= credentials.live.password %>',
					srcBasePath: 'upload/',
					showProgress: true
				}
			},

			images: {
				files : { './': 'upload/images/**' },
				options: {
					path: '/usr/yorkweb/web/static/data/homepage/images/',
					host: 'sftp.york.ac.uk',
					username: '<%= credentials.static.username %>',
					password: '<%= credentials.static.password %>',
					srcBasePath: 'upload/images/',
					showProgress: true
				}
			},

			screenshot: {
				files : { './': 'upload/screenshots/**' },
				options: {
					path: 'screenshots',
					host: 'sftp.york.ac.uk',
					username: '<%= credentials.live.username %>',
					password: '<%= credentials.live.password %>',
					srcBasePath: 'upload/screenshots',
					showProgress: true
				}
			}
		},

		screenshot: {
			live: {
				options: {
					src:'https://www.york.ac.uk',
					dest:'upload/screenshots/homepage_' + dateStamp +'.jpg',
					delay:1000,
					viewport: '1024x1000'
				}
			}
		},

		get: {
			api: {
				layoutDir: 'layouts',
				targetDir: 'download',
				uploadDir: 'upload'
			}
		}

	});

	// Load the plugins
	require('load-grunt-tasks')(grunt);
	grunt.loadTasks('tasks');

	// Tasks

	grunt.registerTask('default',[
		'alert.hook',
		'clean',
		'get',
		// 'bake' // Now triggered by the `get` task
	]);
	
	grunt.registerTask('preview',[
		'alert.hook',
		// 'default',
		'sftp:images',
		'sftp:test',
		'http:test'
	]);
	
	grunt.registerTask('deploy',[
		'alert.hook',
		// 'default',
		'sftp:live',
		'screenshot',
		'sftp:screenshot',
		'http:published'
	]);
};
