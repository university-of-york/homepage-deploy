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

    // fail the task
    function fail(err) {
      grunt.log.error(err);
      done(new Error(err));
    }

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

    // gets image from assets array
    function getAsset(imageField, assets) {
      var imageMeta = imageField.sys;
      var thisAsset = assets.filter(function(asset, j) {
        return asset.sys.id === imageMeta.id;
      })[0];
      // Add York URL to asset object
      thisAsset.fields.file.uoyurl = homepageImageDir+thisAsset.fields.file.fileName;
      return thisAsset;
    }

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
      if (!entryField) return false;
      var entryMeta = entryField.sys;
      var thisEntry = entries.filter(function(entry, j) {
        return entry.sys.id === entryMeta.id;
      })[0];
      return thisEntry;
    }

    var layoutUrl = apiUrl;
    layoutUrl+= '&content_type=homepageLayout';
    layoutUrl+= '&fields.current=true';
    var layoutRequest = Request(layoutUrl);

    // Fetch the current homepage layout
    function fetchLayout() {
      return layoutRequest
      .then(function(layoutResponse) {
        var layout = JSON.parse(layoutResponse);
        grunt.log.ok('Current layout fetched');
        if (layout.total > 1) {
          return Bluebird.reject('Too many current layouts');
        }
        return Bluebird.resolve(layout);
      }).catch(function (err) {
        fail(err);
      });
    }

    // Get banner item (it's called mastheadItem in Contentful)
    var bannerCompile = compileTemplate('banner.hbs');
    var bannerImage;

    // Banner creation
    function createBanner(layout) {
      return bannerCompile.then(function (bannerTemplate) {
        // Banner template built
        var bannerItem = layout.items[0].fields.mainBanner;
        var bannerEntry = getEntry(bannerItem, layout.includes.Entry);
        var bannerAssets = layout.includes.Asset;
        bannerImage = getAsset(bannerEntry.fields.bannerImage, bannerAssets);
        var bannerContext = {
          bannerImage: bannerImage.fields.file.uoyurl,
          title: bannerEntry.fields.title,
          excerpt: Marked(bannerEntry.fields.excerpt),
          buttonLink: bannerEntry.fields.buttonLink,
          buttonText: bannerEntry.fields.buttonText
        };
        return bannerTemplate(bannerContext);
      }).catch(function (err) {
        fail(err);
      }).then(function(bannerHtml) {
        var bannerPath = Path.resolve(options.targetDir, 'banner/index.html');
        return writeFile(bannerPath, bannerHtml);
      }).then(function() {
        return saveAsset(bannerImage);
      }).then(function() {
        grunt.log.ok('Banner items completed');
        return Bluebird.resolve(true);
      }).catch(function (err) {
        fail(err);
      });
    }

    // Get research stories
    var researchCompile = compileTemplate('research.hbs');
    var researchImages = [];

    // Research items creation
    function createResearch(layout) {
      return researchCompile.then(function(researchTemplate) {
        // Research template built
        var researchItems = layout.items[0].fields.researchItems;
        var researchAssets = layout.includes.Asset;
        function makeResearchItem(i) {
          var researchEntry = getEntry(researchItems[i], layout.includes.Entry);
          var researchHtml = '<!-- no story -->';
          if (typeof researchEntry != 'undefined') {
            researchImages[i] = getAsset(researchEntry.fields.image, researchAssets);
            var researchContext = {
              image: researchImages[i].fields.file.uoyurl,
              title: researchEntry.fields.title,
              excerpt: Marked(researchEntry.fields.excerpt),
              link: researchEntry.fields.link
            };
            researchHtml = researchTemplate(researchContext);
          }
          var researchPath = Path.resolve(options.targetDir, 'research/item'+i+'.html');
          return writeFile(researchPath, researchHtml);
        }
        // Make HTML snippets and save images locally
        var researchArray = [];
        for (var i = 0; i < 4; i++) {
          researchArray.push(makeResearchItem(i));
          researchArray.push(saveAsset(researchImages[i]));
        }
        return Bluebird.all(researchArray);
      }).then(function() {
        grunt.log.ok('Research items completed');
        return Bluebird.resolve(true);
      }).catch(function (err) {
        fail(err);
      });
    }

    // Get news stories
    var newsCompile = compileTemplate('news.hbs');
    var newsImages = [];
    var categoryUrl = apiUrl;
    categoryUrl+= '&content_type=category';
    var categoryRequest = Request(categoryUrl);

    // News items creation
    function createNews(layout) {
      return Bluebird.all([newsCompile, categoryRequest])
      .spread(function(newsTemplate, categoryResponse) {
        // News template built and categories found
        var categories = JSON.parse(categoryResponse).items;
        var newsItems = layout.items[0].fields.newsStories;
        var newsAssets = layout.includes.Asset;
        function makeNewsItem(i) {
          var newsEntry = getEntry(newsItems[i], layout.includes.Entry);
          var newsHtml = '<!-- no story -->';
          if (typeof newsEntry != 'undefined') {
            newsImages[i] = getAsset(newsEntry.fields.image, newsAssets);
            var thisCategoryEntry = getEntry(newsEntry.fields.category, categories);
            var thisCategoryName = thisCategoryEntry ? thisCategoryEntry.fields.name : false ;
            var newsContext = {
              image: newsImages[i].fields.file.uoyurl,
              title: newsEntry.fields.title,
              excerpt: Marked(newsEntry.fields.excerpt),
              link: newsEntry.fields.link,
              publishDate: newsEntry.fields.publishDate,
              category: thisCategoryName
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
        fail(err);
      });
    }

    // get layout then run build processes simultaneously
    fetchLayout().then(function(layout) {
      return Bluebird.all([createBanner(layout), createResearch(layout), createNews(layout)]);
    }).spread(function(a, b, c) {
      grunt.log.ok('Templates successfully created');
    }).catch(function(err) {
      fail(err);
    }).then(function() {
      done();
    });

  });

};