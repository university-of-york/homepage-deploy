'use strict';

var Fs = require('fs');
var Path = require('path');
var Mkdirp = require('mkdirp');
var Moment = require('moment');
var Marked = require('marked');
var Request = require('request-promise');
var Bluebird = require('bluebird');
var Handlebars = require('handlebars');

var homepageImageDir = "https://www.york.ac.uk/static/data/homepage/images/"

// format an ISO date using Moment.js
// usage: {{dateFormat dateString format="MMMM YYYY"}}
Handlebars.registerHelper('dateFormat', function(context, block) {
  var f = block.hash.format || "D MMM YYYY";
  return Moment(context).format(f);
});

// Get icon name from category
// usage: {{iconify categoryName}}
Handlebars.registerHelper('iconify', function(context) {
  switch (context) {
    case 'News':
      return 'newspaper-o';
    case 'Event':
      return 'calendar';
    case 'Comment':
      return 'comment-o';
    default:
      return 'null';
  }
});

module.exports = function(grunt) {

  // log
  function log(something) {
    grunt.log.writeln(something);
  }
  // stringify json and log
  function jlog(someJSON) {
    log(JSON.stringify(someJSON,null,2));
  }

  grunt.registerMultiTask('get', 'Get data from (Contentful) API', function() {

    var options = this.options({
      layoutDir: 'layouts',
      targetDir: 'download',
      uploadDir: 'upload'
    });
    var done = this.async();
    // Contentful CDN URL:
    // https://cdn.contentful.com/spaces/spaceId/entries?access_token=accessToken&content_type=newsStory
    var credentials = grunt.file.readJSON('.ftppass');
    var spaceId = credentials.contentful.spaceId;
    var accessToken = credentials.contentful.accessToken;
    var apiUrl = 'https://cdn.contentful.com/spaces/'+spaceId+'/entries?access_token='+accessToken;

    // Write 'html' to 'path'
    function writeFile(path, html) {
      return new Bluebird(function(resolve, reject) {
        var thisDir = Path.dirname(path);
        // Create directory if it doesn't exist yet
        Mkdirp(thisDir, function (err) {
          if (err) {
            reject('Directory '+thisDir+' could not be created');
          }
          // Write the file
          Fs.writeFile(path, html, function(err) {
            if (err) {
              reject('File '+path+' could not be created');
            }
            resolve();
          });
        });
      });
    }

    // Precompile a Handlebars template
    function compileTemplate(templateName) {
      return new Bluebird(function(resolve, reject) {
        var templatePath = Path.resolve(options.layoutDir, templateName);
        Fs.readFile(templatePath, 'utf-8', function(err, data) {
          if (err) {
            reject(templatePath+' could not be read');
          }
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

    // gets image from assets array
    function getAsset(imageField, assets) {
      var imageMeta = imageField.sys;
      var thisAsset = assets.filter(function(asset, j) {
        return asset.sys.id === imageMeta.id;
      })[0];
      // Add York URL to asset object
      thisAsset.fields.file.uoyurl = homepageImageDir+thisAsset.fields.file.fileName;
      return thisAsset;
    };

    // Save remote image locally
    function saveAsset(thisAsset) {
      return new Bluebird(function(resolve, reject) {
        if (typeof thisAsset == 'undefined') resolve();
        var savePath = Path.resolve(options.uploadDir, 'images', thisAsset.fields.file.fileName);
        var saveTarget = thisAsset.fields.file.url;
        if (saveTarget.indexOf('//') === 0) saveTarget = 'https:'+saveTarget;
        Request(saveTarget, {encoding: 'binary'}, function(err, response, body) {
          if (err) {
            reject(saveTarget+' could not be read');
          }
          grunt.file.write(savePath, body, {encoding: 'binary'});
          grunt.verbose.ok('Image saved to '+savePath);
          resolve();
        });
      });
    }

    // gets specific entry from entries array
    function getEntry(entryField, entries) {
      var entryMeta = entryField.sys;
      var thisEntry = entries.filter(function(entry, j) {
        return entry.sys.id === entryMeta.id;
      })[0];
      return thisEntry;
    }

    // Get banner item (it's called mastheadItem in Contentful)
    var bannerCompile = compileTemplate('banner.hbs');
    var bannerUrl = makeUrl('mastheadItem');
    var bannerRequest = Request(bannerUrl);
    var bannerImage;

    // Banner creation
    function createBanner() {
      return Bluebird
      .all([bannerCompile, bannerRequest])
      .spread(function (bannerTemplate, bannerResponse) {
        // All requests succeeded.
        var bannerJSON = JSON.parse(bannerResponse);
        var bannerItem = bannerJSON.items[0];
        var bannerAssets = bannerJSON.includes.Asset;
        bannerImage = getAsset(bannerItem.fields.bannerImage, bannerAssets);
        var bannerContext = {
          bannerImage: bannerImage.fields.file.uoyurl,
          title: bannerItem.fields.title,
          excerpt: Marked(bannerItem.fields.excerpt),
          buttonLink: bannerItem.fields.buttonLink,
          buttonText: bannerItem.fields.buttonText
        };
        return bannerTemplate(bannerContext);
      }).catch(function (err) {
        grunt.log.error(err);
        done(err);
      }).then(function(bannerHtml) {
        var bannerPath = Path.resolve(options.targetDir, 'banner/index.html');
        return writeFile(bannerPath, bannerHtml);
      }).then(function() {
        return saveAsset(bannerImage);
      }).then(function() {
        grunt.log.ok('Banner items completed');
        return Bluebird.resolve(true);
      }).catch(function (err) {
        grunt.log.error(err);
        done(err);
      });
    }

    // Get research stories
    var researchCompile = compileTemplate('research.hbs');
    var researchUrl = makeUrl('researchStory');
    var researchRequest = Request(researchUrl);
    var researchImages = [];

    // Research items creation
    function createResearch() {
      return Bluebird
      .all([researchCompile, researchRequest])
      .spread(function (researchTemplate, researchResponse) {
        // All requests succeeded.
        var researchJSON = JSON.parse(researchResponse);
        var researchAssets = researchJSON.includes.Asset;
        function makeResearchItem(researchItem, i) {
          var researchHtml = '<!-- no story -->';
          if (typeof researchItem != 'undefined') {
            researchImages[i] = getAsset(researchItem.fields.image, researchAssets);
            var researchContext = {
              image: researchImages[i].fields.file.uoyurl,
              title: researchItem.fields.title,
              excerpt: Marked(researchItem.fields.excerpt),
              link: researchItem.fields.link
            };
            researchHtml = researchTemplate(researchContext);
          }
          var researchPath = Path.resolve(options.targetDir, 'research/item'+i+'.html');
          return writeFile(researchPath, researchHtml);
        }
        // Make HTML snippets and save images locally
        var researchArray = [];
        for (var i = 0; i < 4; i++) {
          researchArray.push(makeResearchItem(researchJSON.items[i], i));
          researchArray.push(saveAsset(researchImages[i]));
        }
        return Bluebird.all(researchArray);
      }).then(function() {
        grunt.log.ok('Research items completed');
        return Bluebird.resolve(true);
      }).catch(function (err) {
        grunt.log.error(err);
        done(err);
      });
    }

    // Get news stories
    var newsCompile = compileTemplate('news.hbs');
    var newsUrl = makeUrl('newsStory');
    var newsRequest = Request(newsUrl);
    var newsImages = [];

    // News items creation
    function createNews() {
      return Bluebird
      .all([newsCompile, newsRequest])
      .spread(function (newsTemplate, newsResponse) {
        // All requests succeeded.
        var newsJSON = JSON.parse(newsResponse);
        var newsAssets = newsJSON.includes.Asset;
        var newsEntries = newsJSON.includes.Entry;
        function makeNewsItem(i) {
          var newsItem = newsJSON[i];
          var newsHtml = '<!-- no story -->';
          if (typeof newsItem != 'undefined') {
            newsImages[i] = getAsset(newsItem.fields.image, newsAssets);
            var thisCategory = getEntry(newsItem.fields.category, newsEntries)
            var newsContext = {
              image: newsImages[i].fields.file.uoyurl,
              title: newsItem.fields.title,
              excerpt: Marked(newsItem.fields.excerpt),
              link: newsItem.fields.link,
              publishDate: newsItem.fields.publishDate,
              category: thisCategory.fields.name
            };
            newsHtml = newsTemplate(newsContext);
          }
          var newsPath = Path.resolve(options.targetDir, 'news/item'+i+'.html');
          return writeFile(newsPath, newsHtml);
        }
        // Make HTML snippets and save images locally
        var newsArray = [];
        for (var i = 0; i < 6; i++) {
          newsArray.push(makeNewsItem(i));
          newsArray.push(saveAsset(newsImages[i]));
        }
        return Bluebird.all(newsArray);
      }).then(function() {
        grunt.log.ok('News items completed');
        return Bluebird.resolve(true);
      }).catch(function (err) {
        grunt.log.error(err);
        done(err);
      });
    }

    // Run three processes simultaneously
    Bluebird
    .all([createBanner(), createResearch(), createNews()])
    .spread(function(a, b, c) {
      grunt.log.ok('Templates successfully created');
    }).catch(function(err) {
      grunt.log.error(err);
      done(err);
    }).finally(function() {
      done();
    });

  });

};