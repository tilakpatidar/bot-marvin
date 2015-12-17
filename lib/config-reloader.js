var fs=require("fs");
var path = require('path');
var temp=__dirname.split("/");
temp.pop();
var parent_dir=temp.join("/");
var config=require(path.resolve(parent_dir+"/config/config.js")).load();
var proto=require(parent_dir+'/lib/proto.js');
var JSONX=proto.init;


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

exports.updateLocalConfig=function(dic,reload){
	//updates local copy of the config from db
	fs.writeFileSync(parent_dir+"/config/config.js","var temp=__dirname.split(\"/\");\ntemp.pop();\nvar parent_dir=temp.join(\"/\");\nvar proto=require(parent_dir+'/lib/proto.js');\nvar JSONX=proto.init;\nvar config="+JSONX.stringify(dic)+"\n\nfunction load(){\nreturn JSONX.parse(JSON.stringify(config));\n}\nexports.load=load;\n\n");
	if(reload===undefined || reload===true){
		process.emit("restart");//will be caught by death and it will cause to restart
	}
	if(process.MODE==='require'){
		config=dic;
	}
	
};