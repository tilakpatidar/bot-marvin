var parent_dir=process.getAbsolutePath(__dirname);
var request=require("request");
var fs = require('fs');
var log=require(parent_dir+"/lib/logger.js");
var config=require(parent_dir+"/lib/config-reloader.js");
var queued=0;
var check=require("check-types");
var dict={};
var blocked={};
var urls_len=100000;//initial large val
var global_fn;
var intervals = {};
var app={
	"init":function init(urls,fn){
		global_fn = fn;
		urls_len=urls.length;
		try{
			msg("Preparing robots.txt files this will take time . . .","info");
			var err;
			app.loadCache(function init_loadCache(){
				for (var i = 0; i < urls.length; i++) {
					if(check.assigned(app.bots[urls[i]])){
						queued+=1;
						if(queued===urls.length){
							return fn(err,app.bots);
						}
						continue;
					}
					(function(req_url){
						var robots = require('robots');
						var parser = new robots.RobotsParser();
						var req_url_new=req_url.split("/").slice(0,3).join("/");
						var init_time=new Date().getTime();
						if(!check.assigned(app.bots[req_url])){
							(function(req_url){

								
								intervals[req_url]= setInterval(function(){
										var t=new Date().getTime();
									 	if((t-init_time)>config.getConfig("robots_timeout")){
											clearInterval(intervals[req_url]);
											blocked[req_url] = true;
											msg("Robots.txt timed out for "+req_url, "error");
											queued+=1;
											if(queued===urls.length){
													return global_fn(err,app.bots);
											}
											return;
									 	}
								}, 1000);
							})(req_url);
								parser.setUrl(req_url_new+'/robots.txt', function parser_setUrl(parser_obj, success) {
									  if(blocked[req_url]){
									  	return;
									  }
									  if(success) {
									  	msg(("Robots.txt parsed for "+req_url),"success");
									  	addToCache(req_url_new,parser_obj,function(){
									  		
									  	});
									  	app.bots[req_url]=parser_obj;//saving robots obj
									  }
									  else{
									  	msg(("No Robots.txt found for "+req_url),"error");
									  	var parser_obj={"NO_ROBOTS":true};
									  	addToCache(req_url_new,parser_obj,function(){
									  		
									  	});
									  	app.bots[req_url]=parser_obj;//saving robots obj
										
									}
									queued+=1;
									if(queued===urls.length){
											return fn(err,app.bots);
									}

								});
						}
						else{
										queued+=1;
										if(queued===urls.length){
											return fn(err,app.bots);
										}
						}
						
							
						
							  

					})(urls[i]);
					
				};

			});
			
		}
		catch(err){
			//console.log(err)
			return fn(err,null);
		}
		
	},
	"loadCache":function loadCache(fn){
		var pool=process.pool;
		pool.robots_collection.find({}).toArray(function loadCache(err,docs){
			//console.log(err,docs)
			if(!check.assigned(docs) || check.emptyArray(docs) || check.assigned(err)){
				msg("Robots.txt cache is empty.","info");
				return fn();
			}
			else{
				for (var i = docs.length - 1; i >= 0; i--) {
					var data=docs[i]["robot"];
					var domain=docs[i]["_id"];
					if(check.assigned(data)){
						app.bots[domain]=data;
						msg(("Robots.txt loaded from cache for "+domain),"success");
					}
					if(i===0){
						return fn();
					}
				};
				
			}
		});
		
	},
	"bots":{},
	"sites":{}


};
function addToCache(key,value,fn){
	var pool=process.pool;
	pool.robots_collection.insert({"_id":key,"robot":value},function addToCache(err){
		return fn();
	})
}
exports.app=app;

function msg(){log.put(arguments[0],arguments[1],__filename.split('/').pop(), arguments.callee.caller.name.toString());}
