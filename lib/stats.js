/*
	stats.js
	Used for cluster stats for the web app.
*/
var parent_dir=process.getAbsolutePath(__dirname);
var proto=require(parent_dir+'/lib/proto.js');
JSONX=proto["JSONX"];//JSON for regex support in .json files
process.getAbsolutePath=proto.getAbsolutePath;
var check=require("check-types")


var Stats = function(config_obj, pool_obj, cluster_obj){
	var pool = pool_obj;
	var config = config_obj;
	var cluster = cluster_obj;

	this.clusterInfo = function(fn){

		var id_name=config.getConfig('cluster_name');
		pool.stats.cluster_info(id_name,function(err,results){
			return fn(err,results);
		});
	};

	this.activeBots = function(fn){
		var d={};
		d['db_type']=config.getConfig('db_type');
		d['db']=config.getConfig(config.getConfig('db_type'));
		pool.stats.activeBots(function(err,docs){
			return fn([docs,d]);
		});
	};


	this.crawlStats = function(fn){

		pool.stats.crawlStats(function(dic){
			return fn(dic);
		});
		
	};


	this.readLog = function(bot_name,type,lines,fn){
	
		cluster.send(bot_name,{"readLog":{"type":type,"n":lines}},function(status,response){
				return fn(status,response);
			});
	};

	this.readTerminal = function(bot_name,fn){
		cluster.send(bot_name,{"readTerminal":true},function(status,response){
				return fn(status,response);
		});	
	};

	this.getConfig = function(bot_name,fn){
			pool.cluster.getBotConfig(bot_name,function(err,results){

			try{

				return fn(err,results.config);
			}
			catch(err){

			return fn(err,{});
			}
		});
	};

	this.getSeed = function(fn){
			pool.cluster.getSeed(function(err,results){
			try{
				return fn(err,results);
			}
			catch(err){

				return fn(err,{});
			}
		});
	};

	this.getCrawledPages = function(bot_name,i,len,sort_key,sort_type,fn){
			if(bot_name==="master"){
				var d={"crawled":{$exists:true}};
			}
			else {
				var d={"updatedBy":bot_name, "crawled":{$exists:true}};
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
	};

	this.getFailedPages = function(bot_name,i,len,sort_key,sort_type,fn){
			if(bot_name==="master"){
				var d={"abandoned":true};
			}
			else {
				var d={"updatedBy":bot_name, "abandoned":true};
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
	};

	this.getTotalBuckets = function(bot_name,i,len,sort_key,sort_type,fn){
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
	};

	this.getProcessedBuckets = function(bot_name,i,len,sort_key,sort_type,fn){
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
	};

	this.indexField = function indexField(collection_name,index_name,fn){
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
	};

	this.setConfig = function(bot_name,js,fn){
			//updates the config changes done from local machine to db
			//console.log(bot_name);
			//console.log(js);
		pool.stats.updateConfig(bot_name,js,function setConfig(err,results){
			return fn(err,results);
		});
	};

	this.setSeed = function setSeed(js,fn){
			//updates the seed changes done from local machine to db
			
		pool.stats.updateSeed(js,function(err,results){
			return fn(err,results);
		});
	};


	this.getPage = function getpage(url,fn){
		pool.stats.getPage(url,function(err,data){
			return fn(err,data);
		});
	};


	this.getBucket = function getBucket(url,fn){
		pool.stats.getBucket(url,function(err,data){
			return fn(err,data);
		});
	};


	this.search = function search(query,i,fn){
		pool.stats.search(query,i,function(err,results){
			return fn(err,results);
		})
	};

};

module.exports = Stats;
function msg(){log.put(arguments[0],arguments[1],__filename.split('/').pop(), arguments.callee.caller.name.toString());}
