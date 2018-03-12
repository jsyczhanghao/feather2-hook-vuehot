exports.init = function(){
	exports.install(require('vue'), false);
};

var Module = window.define.Module;
var execute = Module.prototype.execute;
var createElement = Module.createElement;
var urlStores = Module.urlStores;
var urlMaps = {};

Module.prototype.execute = function(){
	var o = execute.call(this);

	if(/vue$/.test(this.name)){
		exports.createRecord(this.name, o);
	}

	return o;
};


var links = [];

Module.createElement = function(url){
	var el = createElement(url);
	el.$$ids = urlStores[url].modules.slice();
	return el;
};

var reload = LiveReload.reloader.reload;

LiveReload.reloader.reload = function(path, options){
	var temp = path.split('!!!');
	var id = temp[0], url = temp[1];
	var maps = require.config('map');

	if(/vue$/.test(id)){
		delete Module.stores[id];
		
		for(var currentUrl in maps){
			var i = maps[currentUrl].indexOf(id);

			if(i > -1){
				maps[currentUrl].splice(i, 1);
				break;
			}
		}

		var map = {};

		map[url + '?_hotload=' + Date.now()] = id;

		require.config('map', map);
		require.async(id, function(Component){
			exports.reload(id, Component);
		});

		return;
	}else if(/css|less$/.test(id)){
		var links = document.querySelectorAll('link') || [];
		var foundLink;
		var ids = [id];

		delete Module.urlStores[url];

		[].some.call(links, function(link){
			if(link.$$ids && link.$$ids.indexOf(id) > -1){
				ids = link.$$ids.map(function(id){
					delete Module.stores[id];
					return id;
				});
				foundLink = link;
				return true;
			}

			return false;
		});

		var map = {};

		for(var currentUrl in maps){
			if(maps[currentUrl].indexOf(id) > -1){
				map[url] = maps[currentUrl];
				delete maps[currentUrl];
				break;
			}
		}

		require.config('map', map);
		require.async(ids, function(){
			foundLink.parentNode.removeChild(foundLink);
		});

		return;
	}else if(/js/.test(url)){
		location.reload();
		return;
	}

	reload.call(this, url, options)
};