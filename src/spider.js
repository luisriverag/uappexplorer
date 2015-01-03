var db = require('./db')
var utils = require('./utils')
var config = require('./config.js')
var https = require('https')
var _ = require('lodash')
var async = require('async')
var request = require('request')
var schedule = require('node-schedule')
var moment = require('moment')

var propertyMap = {
  architecture:   'architecture',
  author:         'developer_name',
  average_rating: 'ratings_average',
  categories:     'department',
  changelog:      'changelog',
  company:        'company_name',
  description:    'description',
  download:       'download_url',
  filesize:       'binary_filesize',
  framework:      'framework',
  icon:           'icon_url',
  icons:          'icon_urls',
  keywords:       'keywords',
  last_updated:   'last_updated',
  license:        'license',
  name:           'name',
  prices:         'prices',
  published_date: 'date_published',
  screenshot:     'screenshot_url',
  screenshots:    'screenshot_urls',
  status:         'status',
  support:        'support_url',
  terms:          'terms_of_service',
  title:          'title',
  type:           'content',
  version:        'version',
  videos:         'video_urls',
  website:        'website',
}

function map(pkg, data) {
  _.forEach(propertyMap, function(dataProperty, pkgProperty) {
    if (data[dataProperty] !== undefined) {
      pkg[pkgProperty] = data[dataProperty]

      if (dataProperty.indexOf('_url') > -1) {
        pkg[pkgProperty] = utils.fixUrl(pkg[pkgProperty])
      }
      else if (pkgProperty == 'filesize') {
        pkg[pkgProperty] = utils.niceBytes(pkg[pkgProperty])
      }
      else if (pkgProperty == 'description') {
        if (pkg[pkgProperty]) {
          var split = pkg[pkgProperty].replace('\r', '').split('\n');
          if (split.length == 2 && split[0] == split[1]) {
            pkg[pkgProperty] = split[0].replace('\n', '')
          }
        }
      }
    }
  })

  return pkg
}

function parseExtendedPackage(pkg) {
  return function(callback) {
    setTimeout(function() {
      console.log('spider: ' + pkg.url)
      request(pkg.url, function(err, resp, body) {
        if (err) {
          console.error('spider: ' + err)
        }
        else {
          data = JSON.parse(body)
          pkg = map(pkg, data)
          pkg.icon_filename = pkg.icon.replace('https://', '').replace('http://', '').replace(/\//g, '-')
          console.log('spider: ' + pkg.icon_filename)

          pkg.save(function(err, pkg) {
            if (err) {
              console.error('spider: ' + err)
              callback(err)
            }
            else {
              var filename = config.data_dir + '/' + pkg.icon_filename

              utils.download(pkg.icon, filename, function() {
                console.log('spider: ' + filename + ' finished downloading')
              })
              callback(null, pkg)
            }
          })
        }
      })
    }, 5 * 1000)
  }
}

function parsePackage(data) {
  return function(callback) {
    //TODO change to findOne
    db.Package.find({name: data.name}, function(err, packages) {
      var pkg = null
      if (err) {
        console.error('spider: ' + err)
      }
      else if (packages.length == 0) {
        pkg = new db.Package()
      }
      else {
        pkg = packages[0]
      }

      pkg = map(pkg, data)
      pkg.url = utils.fixUrl(data._links.self.href)
      pkg.save(function(err, pkg) {
        if (err) {
          console.error('spider: ' + err)
          callback(err)
        }
        else {
          callback(null, pkg)
        }
      })
    })
  }
}

function parsePackageList(list) {
  console.log('spider: parsing ' + list.length + ' packagess')
  var packageCallbacks = []
  var packageNames = []
  _.forEach(list, function(pkg) {
    packageCallbacks.push(parsePackage(pkg))
    packageNames.push(pkg.name)
  })
  console.log('spider: done parsing package list')

  db.Package.find({}, function(err, packages) {
    if (err) {
      console.error('spider: ' + err)
    }
    else {
      _.forEach(packages, function(pkg) {
        if (packageNames.indexOf(pkg.name) == -1) {
          console.log('spider: deleting ' + pkg.name)
          pkg.remove(function(err) {
            if (err) {
              console.error('spider: ' + err)
            }
          })
        }
      })
    }
  })

  async.parallel(packageCallbacks, function(err, pkgs) {
    console.log('spider: done saving packages')

    var extendedCallbacks = []
    _.forEach(pkgs, function(pkg) {
      if (pkg) {
        extendedCallbacks.push(parseExtendedPackage(pkg))
      }
    })

    //For testing
    //var extendedCallbacks = [extendedCallbacks[0]]
    async.series(extendedCallbacks, function(err, results) {
      if (err) {
        console.error('spider: ' + err)
      }

      console.log('spider: done spidering')
    })
  })
}

function fetchAppListPage(page, packageList, callback) {
  request(config.spider.search_api + '?size=100&page=' + page, function(err, resp, body) {
    if (err) {
      console.error('spider: ' + err)
    }
    else {
      var data = JSON.parse(body)
      console.log('spider: got package list page #' + page)
      if (data['_embedded'] && data['_embedded']['clickindex:package']) {
        if (_.isArray(packageList)) {
          packageList = packageList.concat(data['_embedded']['clickindex:package'])
        }
        else {
          packageList = data['_embedded']['clickindex:package']
        }

        fetchAppListPage(page + 1, packageList, callback)
      }
      else {
        callback(packageList)
      }
    }
  })
}

function fetchReviews(pkg, callback) {
  var now = moment()
  if (!pkg.reviews_fetch_date || now.diff(pkg.reviews_fetch_date, 'days') > 3) {
    request(config.spider.reviews_api + '?package_name=' + pkg.name, function(err, resp, body) {
      if (err) {
        console.error('spider: ' + err)
        callback(pkg)
      }
      else {
        pkg.reviews = JSON.parse(body)
        pkg.reviews_fetch_date = now.valueOf()

        pkg.save(function(err, pkg2) {
          if (err) {
            console.error('spider: ' + err)
            callback(pkg)
          }
          else {
            callback(pkg2)
          }
        })
      }
    })
  }
  else {
    callback(pkg)
  }
}

//TODO: make option to only download new packages
function run() {
  console.log('spider: fetching package list')
  fetchAppListPage(1, [], parsePackageList)
}

function setupSchedule() {
  console.log('spider: scheduling spider')
  var spider_rule = new schedule.RecurrenceRule()
  spider_rule.dayOfWeek = [0, 2, 4]
  spider_rule.hour = 0
  spider_rule.minute = 0

  var spider_job = schedule.scheduleJob(spider_rule, function() {
    console.log('spider: running spider')
    run()
  })

  //Schedule once for immediate updating of the apps when needed
  var one_time = new Date(2015, 0, 1, 0, 55, 0)
  var now = new Date();
  if (one_time > now) {
    var spider_job_one_time = schedule.scheduleJob(one_time, function() {
      console.log('spider: running spider (once)')
      run()
    })
  }
}

exports.run = run
exports.schedule = setupSchedule
exports.parsePackage = parsePackage
exports.parseExtendedPackage = parseExtendedPackage
exports.fetchReviews = fetchReviews
