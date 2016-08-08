'use strict';

var Fs = require('fs');
var Path = require('path');
var Mkdirp = require('mkdirp');
var Marked = require('marked');
var Request = require('request-promise');
var Bluebird = require('bluebird');
var Handlebars = require('handlebars');

module.exports = function(grunt) {

  grunt.registerMultiTask('get', 'Get data from (Contentful) API', function() {

    var done = this.async();
    // Contentful CDN:
    // https://cdn.contentful.com/spaces/spaceId/entries?access_token=accessToken&content_type=newsStory
    var credentials = grunt.file.readJSON('.ftppass');
    var spaceId = credentials.contentful.spaceId;
    var accessToken = credentials.contentful.accessToken;
    var apiUrl = 'https://cdn.contentful.com/spaces/'+spaceId+'/entries?access_token='+accessToken;

    // Write 'html' to 'path' - create if it doesn't exist yet
    var targetDir = this.data.targetDir || 'targets';
    function writeFile(path, html) {
      return new Bluebird(function(resolve, reject) {
        var thisDir = Path.dirname(path);
        Mkdirp(thisDir, function (err) {
          if (err) {
            reject('Directory '+thisDir+' could not be created');
          }
          Fs.writeFile(path, html, function(err) {
            if (err) {
              reject('File '+path+' could not be created');
            }
            resolve();
          });
        });
      });
    }

    // Precompile Handlebars templates
    var layoutsDir = this.data.layoutsDir;
    function compileTemplate(templateName) {
      return new Bluebird(function(resolve, reject) {
        var templatePath = Path.resolve(layoutsDir, templateName);
        Fs.readFile(templatePath, 'utf-8', function(err, data) {
          if (err) {
            reject(templatePath+' could not be read');
          }
          var template = Handlebars.compile(data);
          resolve(template);
        });
      });
    }

    // Pass in the content_type needed, i.e. 'bannerItem', 'researchStory' or 'newsStory'
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

    // Get banner item (it's called mastheadItem in Contentful)
    var bannerCompile = compileTemplate('banner.hbs');
    var bannerUrl = makeUrl('mastheadItem');
    var bannerRequest = Request(bannerUrl);

    // Banner creation
    function createBanner() {
      return Bluebird
      .all([bannerCompile, bannerRequest])
      .spread(function (bannerTemplate, bannerResponse) {
        // All requests succeeded.
        var bannerJSON = JSON.parse(bannerResponse);
        var bannerItem = bannerJSON.items[0];
        // TODO Need to do banner image asset
        var bannerContext = {
          bannerImage: 'https://unsplash.it/1200/800/?random',
          title: bannerItem.fields.title,
          excerpt: Marked(bannerItem.fields.excerpt),
          buttonLink: bannerItem.fields.buttonLink,
          buttonText: bannerItem.fields.buttonText
        };
        var bannerHtml = bannerTemplate(bannerContext);
        return bannerHtml;
      }).catch(function (err) {
        grunt.log.error(err);
      }).then(function(bannerHtml) {
        var bannerPath = Path.resolve(targetDir, 'banner/index.html');
        return writeFile(bannerPath, bannerHtml);
      }).then(function() {
        grunt.log.ok('Banner items completed');
        return Bluebird.resolve(true);
      }).catch(function (err) {
        grunt.log.error(err);
      });
    }

    // Get research stories
    var researchCompile = compileTemplate('research.hbs');
    var researchUrl = makeUrl('researchStory');
    var researchRequest = Request(researchUrl);

    // Research items creation
    function createResearch() {
      return Bluebird
      .all([researchCompile, researchRequest])
      .spread(function (researchTemplate, researchResponse) {
        // All requests succeeded.
        var researchJSON = JSON.parse(researchResponse);
        function makeResearchItem(researchItem, i) {
          var researchHtml = '<!-- no story -->';
          if (researchItem !== false) {
            // TODO Need to do research image asset
            var researchContext = {
              image: 'https://unsplash.it/1200/800/?random',
              title: researchItem.fields.title,
              excerpt: Marked(researchItem.fields.excerpt),
              link: researchItem.fields.link
            };
            researchHtml = researchTemplate(researchContext);
          }
          var researchPath = Path.resolve(targetDir, 'research/item'+i+'.html');
          return writeFile(researchPath, researchHtml);
        }
        return Bluebird.all([
          makeResearchItem(researchJSON.items[0] || false, 1),
          makeResearchItem(researchJSON.items[1] || false, 2),
          makeResearchItem(researchJSON.items[2] || false, 3),
          makeResearchItem(researchJSON.items[3] || false, 4)
        ]);
      }).then(function() {
        grunt.log.ok('Research items completed');
        return Bluebird.resolve(true);
      }).catch(function (err) {
        grunt.log.error(err);
      });
    }

    // Get news stories
    var newsCompile = compileTemplate('news.hbs');
    var newsUrl = makeUrl('newsStory');
    grunt.log.ok(newsUrl);
    var newsRequest = Request(newsUrl);

    // News items creation
    function createNews() {
      return Bluebird
      .all([newsCompile, newsRequest])
      .spread(function (newsTemplate, newsResponse) {
        // All requests succeeded.
        var newsJSON = JSON.parse(newsResponse);
        function makeNewsItem(newsItem, i) {
          var newsHtml = '<!-- no story -->';
          if (newsItem !== false) {
            // TODO Need to do news image asset
            // TODO Need to get category Entry
            var newsContext = {
              image: 'https://unsplash.it/1200/800/?random',
              title: newsItem.fields.title,
              excerpt: Marked(newsItem.fields.excerpt),
              link: newsItem.fields.link,
              publishDate: newsItem.fields.publishDate,
              category: 'News'
            };
            newsHtml = newsTemplate(newsContext);
          }
          var newsPath = Path.resolve(targetDir, 'news/item'+i+'.html');
          return writeFile(newsPath, newsHtml);
        }
        return Bluebird.all([
          makeNewsItem(newsJSON.items[0] || false, 1),
          makeNewsItem(newsJSON.items[1] || false, 2),
          makeNewsItem(newsJSON.items[2] || false, 3),
          makeNewsItem(newsJSON.items[3] || false, 4),
          makeNewsItem(newsJSON.items[4] || false, 5),
          makeNewsItem(newsJSON.items[5] || false, 6)
        ]);
      }).then(function() {
        grunt.log.ok('News items completed');
        return Bluebird.resolve(true);
      }).catch(function (err) {
        grunt.log.error(err);
      });
    }

    // Run three processes simultaneously
    Bluebird
    .all([createBanner(), createResearch(), createNews()])
    .spread(function(a, b, c) {
      grunt.log.ok('Templates successfully created');
    }).catch(function(err) {
      grunt.log.error(err);
    }).finally(function() {
      done();
    });

  });

};