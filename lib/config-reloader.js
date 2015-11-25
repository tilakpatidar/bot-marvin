var fs=require("fs");
var path = require('path');
var temp=__dirname.split("/");
temp.pop();
var parent_dir=temp.join("/");
var config=require(path.resolve(parent_dir+"/config/config.js")).load();

fs.watchFile(parent_dir+"/config/config.js", function (curr, prev) {
	delete require.cache[path.resolve(parent_dir+"/config/config.js")];
  	config=require(path.resolve(parent_dir+"/config/config.js")).load();
});
exports.getConfig=function(){
	var val=config;
	if(arguments[0]===undefined){
		return config;
	}
	for (var i = 0; i < arguments.length; i++) {
		val=val[arguments[i]];
	};
	return val;
};