/*
	stats.js
	Used for cluster stats for the web app.
*/
var pool;
var parent_dir=process.getAbsolutePath(__dirname);
var proto=require(parent_dir+'/lib/proto.js');
JSONX=proto["JSONX"];//JSON for regex support in .json files
process.getAbsolutePath=proto.getAbsolutePath;
var log=require(parent_dir+"/lib/logger.js");
var config=require(parent_dir+"/lib/config-reloader.js");
var check=require("check-types")
var cluster;
var app={
	"clusterInfo":function(fn){
		var id_name=config.getConfig('cluster_name');
		pool.stats.cluster_info(id_name,function(err,results){
			return fn(err,results);
		});
	},
	"activeBots":function(fn){
		var d={};
		d['db_type']=config.getConfig('db_type');
		d['db']=config.getConfig(config.getConfig('db_type'));
		pool.stats.activeBots(function(err,docs){
			return fn([docs,d]);
		});
	},
	"crawlStats":function(fn){
		pool.stats.crawlStats(function(dic){
			return fn(dic);
		});
		

	},
	"readLog":function(bot_name,type,lines,fn){
		cluster.send(bot_name,{"readLog":{"type":type,"n":lines}},function(status,response){
				return fn(status,response);
			});
	},
	"readTerminal":function(bot_name,fn){
		cluster.send(bot_name,{"readTerminal":true},function(status,response){
				return fn(status,response);
		});
	},
	"getConfig":function(bot_name,fn){
			pool.cluster.getBotConfig(bot_name,function(err,results){

			try{

				return fn(err,results.config);
			}
			catch(err){

			return fn(err,{});
			}
		});
	},
	"getSeed":function(fn){
			pool.cluster.getSeed(function(err,results){
			try{
				return fn(err,results);
			}
			catch(err){

				return fn(err,{});
			}
		});
	},
	"getCrawledPages":function(bot_name,i,len,sort_key,sort_type,fn){
			if(bot_name==="master"){
				var d={done:true,"response":{$eq:200,$exists:true}};
			}
			else {
				var d={"updatedBy":bot_name,done:true,"response":{$eq:200,$exists:true}};
			}
			var sor={};
			if(!check.assigned(sort_key)){
				sor['lastModified']=-1;
			}
			else{
				sor[sort_key]=sort_type;
			}
			pool.stats.getCrawledPages(d,len,i,sor,function(err,results,c){
			try{

				return fn(err,results,c);
			}
			catch(err){

			return fn(err,{});
			}
		});
	},
	"getFailedPages":function(bot_name,i,len,sort_key,sort_type,fn){
			if(bot_name==="master"){
				var d={done:true,"response":{$ne:200,$exists:true}};
			}
			else {
				var d={"updatedBy":bot_name,done:true,"response":{$ne:200,$exists:true}};
			}
			var sor={};
			if(!check.assigned(sort_key)){
				sor['lastModified']=-1;
			}else{
				sor[sort_key]=sort_type;
			}
			pool.stats.getFailedPages(d,len,i,sor,function(err,results,c){
			try{

				return fn(err,results,c);
			}
			catch(err){

			return fn(err,{});
			}
		});
	},
	"getTotalBuckets":function(bot_name,i,len,sort_key,sort_type,fn){
			if(bot_name==="master"){
				var d={};
			}
			else {
				var d={"insertedBy":bot_name}
			}
			var sor={};
			if(!check.assigned(sort_key)){
				sor['lastModified']=-1;
			}else{
				sor[sort_key]=sort_type;
			}
			pool.stats.getTotalBuckets(d,len,i,sor,function(err,results,c){
			try{

				return fn(err,results,c);
			}
			catch(err){

			return fn(err,{});
			}
		});
	},
	"getProcessedBuckets":function(bot_name,i,len,sort_key,sort_type,fn){
			if(bot_name==="master"){
				var d={"processingBot":{$exists:true}};
			}
			else {
				var d={"processingBot":bot_name}
			}
			var sor={};
			if(!check.assigned(sort_key)){
				sor['lastModified']=-1;
			}else{
				sor[sort_key]=sort_type;
			}
			pool.stats.getProcessedBuckets(d,len,i,sor,function(err,results,c){
			try{

				return fn(err,results,c);
			}
			catch(err){

			return fn(err,{});
			}
		});
	},
	"indexField":function(collection_name,index_name,fn){
			var d={};
			d[index_name]="text";
			pool[collection_name].createIndex(d,function(err,results){
			try{

				return fn(err,results);
			}
			catch(err){

			return fn(err,{});
			}
		});
	},
	"setConfig":function(bot_name,js,fn){
			//updates the config changes done from local machine to db
			//console.log(bot_name);
			//console.log(js);
		pool.stats.updateConfig(bot_name,js,function(err,results){
			return fn(err,results);
		});
	},
	"setSeed":function(js,fn){
			//updates the seed changes done from local machine to db
			
		pool.stats.updateSeed(js,function(err,results){
			return fn(err,results);
		});
	},
	"getPage":function(url,fn){
		pool.stats.getPage(url,function(err,data){
			return fn(err,data);
		});
	},
	"search":function(query,i,fn){
		pool.stats.search(query,i,function(err,results){
			return fn(err,results);
		})
	}
};
module.exports=function(init,clstr){
	pool=init;
	cluster=clstr;
	return app;
};
