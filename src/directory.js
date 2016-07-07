var Log = require('./log.js')
var config = require('../configs/config.json')
var fs = require('fs')
var Path = require('path')

function Directory () {
  var self = this
  this.dir = {}
  this.fileInfo = {}
  this.loadFileInfo()

  setInterval(function () {
    self.updateDownloads()
  }, 30000)
}

Directory.prototype.list = function (dir) {
  if (this.dir[dir] == null) {
    this.dir[dir] = this.getDir(dir)
  } else {
    var s = fs.statSync(Path.join(config.directory.path, dir))
    if (this.dir[dir].mtime < s.mtime) {
      this.dir[dir] = this.getDir(dir)
    }
  }

  return {
    'totalSize': this.dir[dir].totalSize,
    'files': this.dir[dir].files,
    'infos': this.fileInfo
  }
}

Directory.prototype.getDir = function (dir) {
  var self = this

  var list = {}
  var totalSize = 0
  var files = fs.readdirSync(Path.join(config.directory.path, dir))

  if (files.length > 0) {
    files.forEach(function (file) {
      var stats = self.getInfo(Path.join(config.directory.path, dir, file))
      list[file] = stats
      totalSize += stats.size
    })
  }

  var s = fs.statSync(Path.join(config.directory.path, dir))
  return {
    'mtime': s.mtime,
    'totalSize': totalSize,
    'files': list
  }
}

Directory.prototype.getInfo = function (file) {
  var stats = fs.statSync(file)
  var sfile = {}
  if (stats.isFile()) {
    sfile = stats
  } else {
    stats.size = sizeRecursif(file)
    sfile = stats
  }
  sfile.isfile = stats.isFile()
  sfile.isdir = stats.isDirectory()
  return sfile
}

Directory.prototype.setDownloading = function (file) {
  var self = this
  setTimeout(function () {
    self.fileInfo[file] = self.fileInfo[file] ? self.fileInfo[file] : {}
    self.fileInfo[file].downloading = self.fileInfo[file].downloading
      ? {date: new Date(), count: self.fileInfo[file].downloading.count + 1}
      : {date: new Date(), count: 1}
  }, 1)
}

Directory.prototype.finishDownloading = function (file) {
  var self = this
  setTimeout(function () {
    self.fileInfo[file].downloading = self.fileInfo[file].downloading
      ? {date: self.fileInfo[file].downloading.date, count: self.fileInfo[file].downloading.count - 1}
      : {date: new Date(), count: 0}

    if (self.fileInfo[file].downloading.count >= 0) {
      delete self.fileInfo[file].downloading
    }
  }, 1)
}

Directory.prototype.updateDownloads = function () {
  var self = this
  setTimeout(function () {
    var curDate = new Date()
    for (var key in self.downloading) {
      // if downloading for more than 1 hour remove
      if (curDate - self.fileInfo[key].downloading.date > 3600000) {
        delete self.fileInfo[key].downloading
      }
    }
  }, 1)
}

Directory.prototype.isDownloading = function (file) {
  file = file[0] === '/' ? file.substring(1) : file
  return this.fileInfo[file].downloading ? true : false
}

Directory.prototype.remove = function (file) {
  if (this.isDownloading(file)) return -1
  setTimeout(function () {
    fs.stat(Path.join(config.directory.path, file), function (err, stats) {
      if (err) Log.print(err)
      if (stats) {
        if (stats.isDirectory()) {
          removeRecursif(Path.join(config.directory.path, file))
        } else {
          fs.unlink(Path.join(config.directory.path, file), function (err) {
            if (err) Log.print(err)
          })
        }
      }
    })
  }, 1)
}

Directory.prototype.rename = function (path, oldname, newname) {
  if (this.isDownloading(path + oldname)) return -1
  setTimeout(function () {
    fs.rename(Path.join(config.directory.path, path, oldname), Path.join(config.directory.path, path, newname), function (err) {
      if (err) Log.print(err)
    })
  }, 1)
}

Directory.prototype.mkdir = function (path, name) {
  setTimeout(function () {
    fs.mkdir(Path.join(config.directory.path, path, name), function (err) {
      if (err) Log.print(err)
    })
  }, 1)
}

Directory.prototype.mv = function (path, file, folder) {
  if (this.isDownloading(Path.join(path, file))) return -1
  setTimeout(function () {
    fs.rename(Path.join(config.directory.path, path, file), Path.join(config.directory.path, path, folder, file), function (err) {
      if (err) Log.print(err)
    })
  }, 1)
}

Directory.prototype.setOwner = function(file, user){
  var self = this
  setTimeout(function () {
    self.fileInfo[file] = self.fileInfo[file] ? self.fileInfo[file] : {}
    self.fileInfo[file].owner = user
    saveFileInfo()
  },1)
}

Directory.prototype.loadFileInfo = function(){
  var self = this
  setTimeout(function(){
    fs.readFile('configs/fileInfo.json', function(err, data) {
      if (err){
        console.log(err)
        self.fileInfo = {}
        self.saveFileInfo()
      } else {
        self.fileInfo = JSON.parse(data)
      }
      console.log(self.fileInfo)
    })
  },1)
}

Directory.prototype.saveFileInfo = function(){
  var self = this
  setTimeout(function(){
    fs.writeFile('configs/fileInfo.json', JSON.stringify(self.fileInfo), function(err) {
      if (err) console.log(err)
    })
  },1)
}

function removeRecursif (path) {
  setTimeout(function () {
    if (fs.existsSync(path)) {
      fs.readdirSync(path).forEach(function (file, index) {
        var curPath = Path.join(path, file)
        if (fs.lstatSync(curPath).isDirectory()) { // recurse
          removeRecursif(curPath)
        } else { // delete file
          fs.unlinkSync(curPath)
        }
      })
      fs.rmdirSync(path)
    }
  }, 1)
}

function sizeRecursif (path) {
  var size = 0
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach(function (file, index) {
      var curPath = Path.join(path, file)
      if (fs.lstatSync(curPath).isDirectory()) { // recurse
        size += sizeRecursif(curPath)
      } else { // read size
        size += fs.statSync(curPath).size
      }
    })
    return size
  }
}

module.exports = new Directory()
