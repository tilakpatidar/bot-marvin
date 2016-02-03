var fs=require("fs");
var parent_dir=process.getAbsolutePath(__dirname);
var config=process.bot_config;
var proto=require(parent_dir+'/lib/proto.js');
var JSONX=proto.JSONX;
var pool;
var check=require("check-types");
var log=require(parent_dir+"/lib/logger.js");
var app={
	"insert":function(url,parent_url){

	}
}
exports.init=function (connection_pool) {
	pool=connection_pool;
	if(config.getConfig("web_graph")){
		log.put("Web graph started.","success");
		return app;
	}
	else{
		log.put("Web graph not selected in config.","info");
		return {
			insert:function(){}
		};
	}
	
}