var fs=require("fs");
var parent_dir=process.getAbsolutePath(__dirname);
var config=process.bot_config;
var proto=require(parent_dir+'/lib/proto.js');
var JSONX=proto.JSONX;
var pool;
var check=require("check-types");
var log=require(parent_dir+"/lib/logger.js");
var app={
	"insert":function insert(url,parent_url){
		pool.graph_collection.insert({"url":url,"parent":parent_url},function insert(){

		});
	},
	"fetchNode":function fetchNode(url,fn){
		var li=[]
		pool.graph_collection.find({"url":url}).toArray(function fetchNode(err,docs){
			for (var i = 0; i < docs.length; i++) {
				var parent=docs[i]["parent"];
				li.push(parent);
			};
			return fn(err,{"url":url,"parents":li});
		})
	},
	"fetchChildNodes":function fetchChildNodes(url,fn){
		pool.graph_collection.find({"parent":url}).toArray(function fetchChildNodes(err,docs){
			return fn(err,docs);
		});
	}
}
exports.init=function init(connection_pool) {
	pool=connection_pool;
	pool.graph_collection.createIndex({parent:1});
	if(config.getConfig("web_graph")){
		msg("Web graph started.","success");
		return app;
	}
	else{
		msg("Web graph not selected in config.","info");
		return {
			insert:function(){},
			fetchNode:function(url,fn){return fn(new Error(),null);},
			fetchChildNodes:function(url,fn){return fn(new Error(),null);}
		};
	}
	
};
function msg(){log.put(arguments[0],arguments[1],__filename.split('/').pop(), arguments.callee.caller.name.toString());}
