'use strict';

var Fs = require('fs');
var Path = require('path');
var Request = require('request-promise');
var Bluebird = require('bluebird');
var Handlebars = require('handlebars');

module.exports = function(grunt) {

  grunt.registerMultiTask('get', 'Get data from (Contentful) API', function() {

    var done = this.async();
    // Contentful CDN:
    // https://cdn.contentful.com/spaces/spaceId/entries?access_token=accessToken&content_type=newsStory
    var spaceId = 'al45u4mzjr2y';
    var accessToken = '7d52070d1ba9e2117797f6fc434e3274667c98f5186b546a19345f5757f63565';
    var apiUrl = 'https://cdn.contentful.com/spaces/'+spaceId+'/entries?access_token='+accessToken;

    // Precompile Handlebars templates
    var layoutsDir = this.data.layoutsDir;
    function compileTemplate(templateName) {
      return new Promise(function(resolve) {
        var templatePath = Path.resolve(layoutsDir, templateName);
        Fs.readFile(templatePath, 'utf-8', function(err, data) {
          if (err) throw err;
          var template = Handlebars.compile(data);
          resolve(template);
        });
      });
    }

    // Pass in the content_type needed, i.e. 'mastheadItem', 'researchStory' or 'newsStory'
    function makeUrl(contentType) {
      var now = new Date().toISOString();
      var url = apiUrl;
      // Add content type
      url+= '&content_type='+contentType;
      // start date is before now
      url+= '&fields.startDate[lt]='+now;
      // and expiry date is after now
      url+= '&fields.expiryDate[gt]='+now;
      // and live is true
      url+= '&fields.live=true';
      // order by time added
      url+= '&order=sys.updatedAt';
      return encodeURI(url);
    }

    // Get masthead item
    var mastheadUrl = makeUrl('mastheadItem');
    var mastheadRequest = Request(mastheadUrl);
    // Get research stories
    var researchUrl = makeUrl('researchStory');
    var researchRequest = Request(researchUrl);
    // Get news stories
    var newsUrl = makeUrl('newsStory');
    var newsRequest = Request(newsUrl);

    // Precompile templates
    var bannerTemplate = compileTemplate('banner.hbs');
    var researchTemplate = compileTemplate('research.hbs');
    var newsTemplate = compileTemplate('news.hbs');

    // Run all requests simultaneously
    Bluebird.all([mastheadRequest, researchRequest, newsRequest])
    .spread(function (mastheadResponse, researchResponse, newsResponse) {
      // All requests succeeded.
      var mJSON = JSON.parse(mastheadResponse);
      mJSON.items.forEach(function(item, i) {
        // TODO Need to do banner image asset
        var bannerContext = {
          bannerImage: 'https://unsplash.it/1200/800/?random',
          title: item.fields.title,
          excerpt: item.fields.excerpt,
          buttonLink: item.fields.buttonLink,
          buttonText: item.fields.buttonText
        };
        // var bannerHtml = bannerTemplate(bannerContext);
        grunt.log.writeln(bannerTemplate);
      });
      // grunt.log.writeln(Path.resolve(this.data.targetDir, 'banner/index.html'));
      var rJSON = JSON.parse(researchResponse);
      rJSON.items.forEach(function(item, i) {
        grunt.log.writeln('Make research item with "'+item.fields.title+'"');
      });
      // grunt.log.writeln(Path.resolve(this.data.targetDir, 'research/index.html'));
      var nJSON = JSON.parse(newsResponse);
      nJSON.items.forEach(function(item, i) {
        grunt.log.writeln('Make news item with "'+item.fields.title+'"');
      });
      // grunt.log.writeln(Path.resolve(this.data.targetDir, 'news/index.html'));
    })
    .catch(function (err) {
      // At least one request failed.
      grunt.log.writeln('Error happened');
    }).finally(function() {
      done();
    });

  });

};