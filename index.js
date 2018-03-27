var lastModified = {};
var reload = require('./livereload').reload;
var handleReloadComment = require('./livereload').handleReloadComment;
var HOT = feather.util.read(__dirname + '/vendor/hotapi.js');
var INJECT = feather.util.read(__dirname + '/vendor/inject.js');
var INJECT_FILE;
var isFirst = true;

module.exports = function(feather, opt){
	var modified;
	var config = feather.config.get('cli');

	if(!config.watch || !/debug|dev|develop/.test(config.media)){
		return false;
	}

	feather.on('release:start', function(ret){
		modified = {};

		if(!INJECT_FILE){
			INJECT_FILE = feather.file.wrap(feather.project.getProjectPath() + '/inject__.js');
			INJECT_FILE.setContent(HOT + ';' + INJECT);
			feather.compile(INJECT_FILE);
		}
	});

	feather.on('compile:end', function(file){
		var mtime = file.getMtime().getTime();
	    var fromCache = file._fromCache;

	    if (file.release && (!fromCache || lastModified[file.subpath] !== mtime)) {
	      var cost = Date.now() - file._start;

	      lastModified[file.subpath] = mtime;
	      modified[file.id] = file;
	    }
	});	

	feather.on('release:end', function(ret){
		handleReloadComment(ret.src);

		ret.pkg['/inject__.js'] = INJECT_FILE;

		feather.util.map(ret.src, function(subpath, file){
			if(file.isHtmlLike){
				var content = file.getContent().replace('<body>', function(){
					return '\
						<script>\
							require.config("deps")["inject__.js"] = '  + JSON.stringify(INJECT_FILE.requires) + ';\
							require.config("map")["' + INJECT_FILE.getUrl() + '"] = "inject__.js";\
							require.async("inject__.js", function(INJECT){INJECT.init()})\
							</script>\
						<body>\
					';
				});
				file.setContent(content)
			}
		});	

		if(!ret.pkg['/map.json'].release){
			ret.pkg['/map.json'].release = '/static/map.json';
		}

		map = ret.pkg['/map.json'];
	});

	feather.on('deploy:end', function(){
		if(isFirst){
			isFirst = false;
			return;
		}

		let json = JSON.parse(map.getContent());

		var paths = [];

		function getUrl(id){
			return json[id].url;
		}

		for(var i in modified){
			if(!modified[i].isCssLike){
				paths.push(i + '!!!' + getUrl(i));
			}else{
				paths.push(i + '!!!' + (json[i] ? getUrl(json[i].pkg || i) : i));
			}
		}

		modified = {};
		reload(paths);
	})
};