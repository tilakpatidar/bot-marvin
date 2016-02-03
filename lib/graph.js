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
		pool.graph_collection.insert({"_id":url,"parent":parent_url},function(){

		});
	},
	"fetchNode":function(url,fn){
		pool.graph_collection.findOne({"_id":url},function(err,doc){
			return fn(err,doc);
		})
	},
	"fetchChildNodes":function(url,fn){
		pool.graph_collection.find({"parent":url}).toArray(function(err,docs){
			return fn(err,docs);
		});
	}
}
exports.init=function (connection_pool) {
	pool=connection_pool;
	pool.graph_collection.createIndex({parent:1});
	if(config.getConfig("web_graph")){
		log.put("Web graph started.","success");
		return app;
	}
	else{
		log.put("Web graph not selected in config.","info");
		return {
			insert:function(){},
			fetchNode:function(url,fn){return fn(new Error(),null);},
			fetchChildNodes:function(url,fn){return fn(new Error(),null);}
		};
	}
	
}