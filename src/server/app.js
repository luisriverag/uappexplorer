var db = require('../db/db');
var config = require('../config');
var logger = require('../logger');
var express = require('express');
var _ = require('lodash');
var sitemap = require('sitemap');
var fs = require('fs');

//list borrowed from https://github.com/prerender/prerender-node
var useragents = [
  //'googlebot',
  //'yahoo',
  //'bingbot',
  'baiduspider',
  'facebookexternalhit',
  'twitterbot',
  'rogerbot',
  'linkedinbot',
  'embedly',
  'quora link preview',
  'showyoubot',
  'outbrain',
  'pinterest',
  'developers.google.com/+/web/snippet',
  'slackbot',
  'vkShare',
  'W3C_Validator'
];

function setup(app) {
  app.use(express.static(__dirname + config.server.static));

  var sm = sitemap.createSitemap ({
    hostname: config.server.host,
    cacheTime: 1200000,  //2 hours
    urls: [
      {url: '/apps/',  changefreq: 'daily', priority: 1},
    ]
  });

  app.get('/sitemap.xml', function(req, res) {
    db.Package.find({}, 'name', function(err, pkgs) {
      _.forEach(pkgs, function(pkg) {
        sm.add({url: '/app/' + pkg.name, changefreq: 'weekly', priority: 0.7});
      });

      res.header('Content-Type', 'application/xml');
      res.send(sm.toString());
    });
  });

  app.get('/app', function(req, res) {
    res.redirect(301, '/apps');
  });

  function openGraphData(html, og) {
    og = _.extend({
      title: 'uApp Explorer',
      description: 'Browse and discover apps for Ubuntu Touch',
      image: config.server.host + '/img/logo.png',
      url: config.server.host + '/apps',
    }, og);

    html = html.replace(/meta name="description" content="(?:[\S\s]*?)"/gi,         'meta name="description" content="' + og.description + '"');
    html = html.replace(/meta itemprop="name" content="(?:[\S\s]*?)"/gi,            'meta itemprop="name" content="' + og.title + '"');
    html = html.replace(/meta itemprop="description" content="(?:[\S\s]*?)"/gi,     'meta itemprop="description" content="' + og.description + '"');
    html = html.replace(/meta itemprop="image" content="(?:[\S\s]*?)"/gi,           'meta itemprop="image" content="' + og.image + '"');
    html = html.replace(/meta name="twitter:title" content="(?:[\S\s]*?)"/gi,       'meta name="twitter:title" content="' + og.title + '"');
    html = html.replace(/meta name="twitter:description" content="(?:[\S\s]*?)"/gi, 'meta name="twitter:description" content="' + og.description + '"');
    html = html.replace(/meta name="twitter:image:src" content="(?:[\S\s]*?)"/gi,   'meta name="twitter:image:src" content="' + og.image + '"');
    html = html.replace(/meta property="og:title" content="(?:[\S\s]*?)"/gi,        'meta property="og:title" content="' + og.title + '"');
    html = html.replace(/meta property="og:url" content="(?:[\S\s]*?)"/gi,          'meta property="og:url" content="' + og.url + '"');
    html = html.replace(/meta property="og:image" content="(?:[\S\s]*?)"/gi,        'meta property="og:image" content="' + og.image + '"');
    html = html.replace(/meta property="og:description" content="(?:[\S\s]*?)"/gi,  'meta property="og:description" content="' + og.description + '"');
    html = html.replace(/meta property="og:site_name" content="(?:[\S\s]*?)"/gi,    'meta property="og:site_name" content="' + og.title + ' - uApp Explorer' + '"');

    return html;
  }

  app.get('/app/:name', function(req, res) { //For populating opengraph data, etc for bots that don't execute javascript (like twitter cards)
    var useragent = req.headers['user-agent'];
    var match = useragents.some(function(ua) {
      return useragent.toLowerCase().indexOf(ua.toLowerCase()) !== -1;
    });

    if (match || !_.isUndefined(req.query._escaped_fragment_)) {
      res.header('Content-Type', 'text/html');
      db.Package.findOne({name: req.params.name}, function(err, pkg) {
        if (err) {
          logger.error('server: ' + err);
          res.status(500);
          res.send();
        }
        else if (!pkg) {
          res.status(404);
          fs.createReadStream(__dirname + config.server.static + '/404.html').pipe(res);
        }
        else {
          fs.readFile(__dirname + config.server.static + '/index.html', {encoding: 'utf8'}, function(err, data) {
            if (err) {
              res.status(500);
              res.send();
            }
            else {
              res.status(200);

              var og = {
                title: pkg.title,
                url: config.server.host + '/app/' + pkg.name,
                image: config.server.host + '/api/icon/' + pkg.icon_hash + '/' + pkg.name + '.png',
                description: pkg.description,
              };

              if (pkg.description && pkg.description.split('\n').length > 0) {
                og.description = pkg.description.split('\n')[0];
              }

              if (og.description.toLowerCase() == pkg.title.toLowerCase() && pkg.description.split('\n').length > 1) {
                og.description = pkg.description.split('\n')[1];
              }

              if (og.description.length > 50) {
                og.description = og.description.substring(0, 50) + '...';
              }

              res.send(openGraphData(data, og));
            }
          });
        }
      });
    }
    else {
      res.sendFile('index.html', {root: __dirname + config.server.static});
    }
  });

  app.get('/list/:id', function(req, res) { //For populating opengraph data, etc for bots that don't execute javascript (like twitter cards)
    var useragent = req.headers['user-agent'];
    var match = useragents.some(function(ua) {
      return useragent.toLowerCase().indexOf(ua.toLowerCase()) !== -1;
    });

    if (match || !_.isUndefined(req.query._escaped_fragment_)) {
      res.header('Content-Type', 'text/html');
      db.List.findOne({_id: req.params.id}, function(err, list) {
        if (err) {
          logger.error('server: ' + err);
          res.status(500);
          res.send();
        }
        else if (!list) {
          res.status(404);
          fs.createReadStream(__dirname + config.server.static + '/404.html').pipe(res);
        }
        else {
          fs.readFile(__dirname + config.server.static + '/index.html', {encoding: 'utf8'}, function(err, data) {
            if (err) {
              res.status(500);
              res.send();
            }
            else {
              res.status(200);

              var og = {
                title: 'User List - ' + list.name,
                url: config.server.host + '/list/' + list._id,
                description: 'User list by ' + list.user_name,
              };

              res.send(openGraphData(data, og));
            }
          });
        }
      });
    }
    else {
      res.sendFile('index.html', {root: __dirname + config.server.static});
    }
  });

  app.all(['/apps', '/apps/request', '/me'], function(req, res) { //For html5mode on frontend
    res.sendFile('index.html', {root: __dirname + config.server.static});
  });
}

exports.setup = setup;
