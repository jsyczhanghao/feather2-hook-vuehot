var _ = fis.util;
var portfinder = require('portfinder');
var rLivereload = /"(?:[^\\"\r\n\f]|\\[\s\S])*"|'(?:[^\\'\n\r\f]|\\[\s\S])*'|(<\/body>|<!--livereload-->)/ig;
var LRServer;
var LRPORT;

if(!('EventEmitter' in process)){
  process.EventEmitter = require('events').EventEmitter
}

var defaultHostname = (function() {
  var ip = false;
  var net = require('os').networkInterfaces();
  Object.keys(net).every(function(key) {
    var detail = net[key];
    Object.keys(detail).every(function(i) {
      var address = String(detail[i].address).trim();
      if (address && /^\d+(?:\.\d+){3}$/.test(address) && address !== '127.0.0.1') {
        ip = address;
      }
      return !ip; // 找到了，则跳出循环
    });
    return !ip; // 找到了，则跳出循环
  });
  return ip || '127.0.0.1';
})();

function makeLiveServer(callback) {
  if (LRServer) return callback(null, LRServer, LRPORT);

  var basePort = fis.media().get('livereload.port', 8132);
  var port = LRPORT = basePort;
  var LiveReloadServer = require('livereload-server-spec');

  LRServer = new LiveReloadServer({
    id: 'com.baidu.fis',
    name: 'fis-reload',
    version: fis.cli.info.version,
    port: port,
    protocols: {
      monitoring: 7
    }
  });

  LRServer.on('livereload.js', function(req, res) {
    var script = fis.util.fs.readFileSync(__dirname + '/vendor/livereload.js');
    res.writeHead(200, {
      'Content-Length': script.length,
      'Content-Type': 'text/javascript',
      'Connection': 'close'
    });
    res.end(script);
  });

  LRServer.listen(function(err) {
    if (err) {
      err.message = 'LiveReload server Listening failed: ' + err.message;
      fis.log.error(err);
    }
  });

  process.stdout.write('\n Ψ '.bold.yellow + port + '\n');

  // fix mac livereload
  process.on('uncaughtException', function(err) {
    if (err.message !== 'read ECONNRESET') throw err;
  });


  callback(null, LRServer, LRPORT);
}

function reload(paths) {
  makeLiveServer(function(error, server) {
    if (server && server.connections) {
      _.map(server.connections, function(id, connection) {
        try {
          paths.map(function(path){
            connection.send({
              command: 'reload',
              path: path || '*', 
              liveCSS: true
            });
          })
        } catch (e) {
          try {
            connection.close();
          } catch (e) {}
          delete server.connections[id];
        }
      });
    }
  });
}

function handleReloadComment(modified) {
  makeLiveServer(function(error, server, port) {
    if (error) {
      return next(error);
    }

    _.toArray(modified).forEach(function(file) {
      var content = file.getContent();

      if (!file.isHtmlLike || typeof content !== 'string') {
        return;
      }

      rLivereload.lastIndex = 0;
      content = content.replace(rLivereload, function(all, token) {
        if (token) {
          var hostname = fis.config.get('livereload.hostname', defaultHostname);

          all = '<script type="text/javascript" charset="utf-8" src="http://' + hostname + ':' + port + '/livereload.js"></script>' + token;
        }

        return all;
      });

      file.setContent(content);
    });

    fis.log.debug('handle reload comment end');
  });
};

exports.reload = reload;
exports.handleReloadComment = handleReloadComment;
exports.makeLiveServer = makeLiveServer;
