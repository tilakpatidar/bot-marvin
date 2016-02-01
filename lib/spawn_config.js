/*
	js file written to provide config-reloader.js 
	like interface for spawned processes
*/
var parent_dir=process.getAbsolutePath(__dirname);
var check=require("check-types");
var proto=require(parent_dir+'/lib/proto.js');
var JSONX=proto.JSONX;
var ObjectX=proto.ObjectX;
var config={};
var OVERRIDEN_CONFIG={};
var DB_CONFIG={};
var app={
	"getConfig":function(){
		var val=config;
		//console.log(val)
		if(!check.assigned(arguments[0])){
			return config;
		}
		for (var i = 0; i < arguments.length; i++) {
			if(check.assigned(OVERRIDEN_CONFIG[arguments[i]])){
				val=OVERRIDEN_CONFIG[arguments[i]];//overrides the config with command line arguments
			}
			else if(check.assigned(DB_CONFIG[arguments[i]])){
				val=DB_CONFIG[arguments[i]];
			}
			else{
				val=val[arguments[i]];
			}
			
		};
		return val;
	}
}
exports.init=function(c,o,d){
	//console.log(JSONX.parse(JSON.stringify(c)))
	config=JSONX.parse(JSON.stringify(c));
	OVERRIDEN_CONFIG=o;
	DB_CONFIG=d;
	return app;
}