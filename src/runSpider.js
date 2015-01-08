var spider = require('./spider')

if (process.argv[2]) {
  if (process.argv[2] == 'update' || process.argv[2] == 'updates') {
    spider.run(true)
  }
  else if (process.argv[2] == 'department' || process.argv[2] == 'departments') {
    spider.parseDepartments()
  }
  else {
    spider.parsePackage({
      name: process.argv[2],
      _links: {
        self: {
          href: 'https://search.apps.ubuntu.com/api/v1/package/' + process.argv[2]
        }
      }
    })(function(err, pkg) {
      spider.parseExtendedPackage(pkg)(function() {})
    })
  }
}
else {
  spider.run()
}
