'use strict';

var phantom = require('node-phantom-simple');
var path = require('path');
var phantomPath = require('phantomjs-prebuilt').path;

module.exports = function(grunt) {

  // log
  function log(something) {
    grunt.log.writeln(something);
  }
  // stringify json and log
  function jlog(someJSON) {
    log(JSON.stringify(someJSON,null,2));
  }

  grunt.registerMultiTask('screenshot', 'Take a screenshot of the page', function() {

    var options = this.options({
      src: 'https://www.google.com',
      dest:'',
      delay:0,
      viewport: '1240x1080'
    });
    var done = this.async();

    phantom.create({ path: phantomPath }, function (err, browser) {
      if (err) grunt.fail.warn(err.message);
      return browser.createPage(function (err, page) {
        if (err) grunt.fail.warn(err.message);
        var url = options.src;
        var viewport = options.viewport.split('x');
        var dest = path.resolve(options.dest);
        page.set('viewportSize', {
          width: viewport[0],
          height: viewport[1]
        });
        page.set('zoomFactor', 1);
        return page.open(url, function (err, status) {

          if (err) grunt.fail.warn(err.message);

          page.evaluate(function() {
            var style = document.createElement('style');
            style.appendChild(document.createTextNode('.o-grid__box--full { width:100%; }'));
            style.appendChild(document.createTextNode('.o-grid__box--half { width:49%; }'));
            style.appendChild(document.createTextNode('.o-grid__box--third { width:32.666%; }'));
            style.appendChild(document.createTextNode('.o-grid__box--twothirds { width:65.666%; }'));
            style.appendChild(document.createTextNode('.o-grid__box--quarter { width:24%; }'));
            style.appendChild(document.createTextNode('.o-grid__box--threequarters { width:74%; }'));
            style.setAttribute('type', 'text/css');
            // document.head.insertBefore(style, document.head.firstChild);
            document.head.insertBefore(style, null);

            // Create the event
            var event = new CustomEvent("name-of-event", { "detail": "Example of an event" });
            // Dispatch/Trigger/Fire the event
            document.dispatchEvent(event);
          });

          function takeScreenshot() {
            grunt.log.ok("Taking screenshot!");
            page.render(dest, function() {
              browser.exit();
              done();
            });
          }
          if (options.delay === 0) {
            takeScreenshot();
          } else {
            grunt.log.ok("Delaying "+options.delay+"ms");
            setTimeout(function() {
              takeScreenshot();
            }, options.delay);
          }
        });
      });
    });

  });

};