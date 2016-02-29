#!/usr/bin/env node
/*

	Index.js
	Main js file of the crawler
	@author Tilak Patidar

*/


//global requires
process.setMaxListeners(50);
process.caught_termination=false;
var fs=require('fs');
process.begin_intervals=false;
process.force_mode=false;//enables or disables the process.force_mode
process.my_timers=[];//stores all the timers used to remove all timers for graceful exit
process.reset=false;
process.seedFile=null;
var check = require('check-types');
var _=require("underscore");
var cluster,log;
var dependency=require(__dirname+"/lib/depcheck.js");
dependency.check();
var proto=require(__dirname+'/lib/proto.js');
JSONX=proto["JSONX"];//JSON for regex support in .json files
process.getAbsolutePath=proto.getAbsolutePath;
var config=require(__dirname+"/lib/config-reloader.js");
var seed=require(__dirname+"/lib/seed-reloader.js");
process.bot_config=config;
process.bot_seed=seed;
var pool=require(__dirname+'/lib/pool');
var db_type=config.getConfig("db_type");
pool=pool.getDB(db_type).init();//choosing db type

//some args need to be parsed before
var argv = require('minimist')(process.argv.slice(2));
if(check.assigned(argv["force"])){
		process.force_mode=true;
}

pool.createConnection(function(){
	process.pool=pool;
	startCluster(function(){
		
		startBot(function(s){
			config.setDB(pool,function(){
				seed.setDB(pool,function(){
					var argv=require(__dirname+'/lib/argv.js');
					var new_opts=argv.init();
					process.overriden_config=new_opts;//parses cmd line argv and perform required operations
					process.config_delay_interval=setInterval(function(){
						if(!process.modifyConfig){ //if modifying config delay pull config
							clearInterval(process.config_delay_interval);
							config.pullConfig(function(){
								log=require(__dirname+"/lib/logger.js");
								pool.checkIfNewCrawl(function(){
									if(process.editSeedFile){
										editSeedFile();
									}else if(process.seedFile){
										seedFile();
									}else if(process.reset){
										reset(function(){
											process.bot.stopBot(function(){
												process.exit(0);
											});
										});
									}
									else{
										seed.pull(function(){
											entire_body();
										});
									}
									
								});
							});
							

							
						}
					},1000);
				
				});
			});
		});
	});
});
function startCluster(fn){
	process.MODE='exec';
		require(__dirname+'/lib/cluster.js').init(pool,function(c){
			cluster=c;
			//seed.setDB(pool);
			var bot=require(__dirname+'/lib/bot.js');
			process.bot=new bot(cluster,pool);//making global so that bot stats can be updated in any module
			fn(pool);
			return;
		});
}
function startBot(fn){
	process.bot.startBot(process.force_mode,function(status){
			//#debug#console.log("THIS ONE")
			if(status){
				//bot was started successfully
				fn(true);
			}
			else{
				//unable to start bot exit gracefully
				process.exit(0);
			}
		});
}
function startBotManager(links,botObjs,links_fetch_interval){


	//function to start the child_manager
	pool.seed(links,links_fetch_interval,function(completed){
		if(completed){
			//create a child manager
			process.child_manager=new require(__dirname+'/lib/child_manager.js')(pool,botObjs,cluster);		
			//#debug#console.log(process.child_manager,"child_manager")				
		}


	});

}
function entire_body(){
	console.log(process.overriden_config)
	config.setOverridenConfig(process.overriden_config);
	fs.appendFileSync(__dirname+"/db/sqlite/active_pids.txt",process.pid+"\n");
	var cluster;//stores the cluster obj to communicate with the other bots
	
		
			pool.readSeedFile(function(links,links_fetch_interval){
					//reading the seed links from db
			

					var botObjs={};//will store robots.txt data for seed links

					if(config.getConfig("allow_robots")){

						/*	
							if robots.txt has to be followed
							we have to download all robots.txt files
						*/

						log.put("downloading robots.txt this could take a while","info");
						var robots=require(__dirname+'/lib/robots.js').app;
						robots.init(Object.keys(pool.links),function(err,obj){
							//#debug#console.log(obj);
							if(obj){
								log.put("robots.txt parsed","success");
							}
							else{
								log.put("robots.txt parsing failed","error");
							}
							botObjs=obj;
							//#debug#console.log("CUL")
							startBotManager(links,botObjs,links_fetch_interval);
							return;
							
						});
					}
					else{
						startBotManager(links,null,links_fetch_interval);
						return;
					}


			
				

			});
	


	function updateJson(js){
		try{
			var dic=JSON.parse(JSONX.stringify(js));
			config.updateLocalConfig(js,false);//update fs copy too
			config.updateDbConfig(dic);//regex safe json update to db
		}
		catch(err){
			//#debug#console.log(err);
			return false;
		}
		return true;
		
	}



}
function isSeedPresent(url,fn){
			check.assert.assigned(url,"seed url cannot be undefined")
			if(!check.assigned(fn)){
				fn=function(){};
			}

			try{
					url=url.replace(/\./gi,"#dot#");
					pool.isSeedPresent(url,function(bool){
						if(bool){
							return fn(true);
						}
						else{
							return fn(false);
						}

					});
					
				
			}
			catch(err){
				return fn(false);
			}
		}
function insertSeed(url,parseFile,phantomjs,priority,fetch_interval,fn){
			if(!check.assigned(fn)){
				fn=function(){}
			}
			if(_.size(arguments)<5){
				throw new SyntaxError("atleast 5 args expected");
				return fn(false);
			}
			url=url.replace("https://","http://");
			isSeedPresent(url,function(present){
				if(present){
					return fn(false);
				}
				else{
					pool.insertSeed(url,parseFile,phantomjs,priority,fetch_interval,function(inserted){
					
						if(inserted){
							return fn(true);
						}
						else{
							return fn(false);
						}
					});
				}


});
}
if(process.env.EDITOR===undefined){
	process.env.EDITOR="/bin/nano";
}
var edit = require('string-editor');
function editSeedFile(fn){
	seed.pullSeedFromDB(function(err,results){
			if(err || (!check.assigned(err) && !check.assigned(results))){
				edit("{}","seed.json", function(err, result) {
					// when you are done editing result will contain the string 
					console.log("Updating seed please wait!");
					//console.log(result)
					var dic=JSON.parse(result);
					seedFile(dic,function(){
						console.log("Seed updated [SUCCESS]");
						process.bot.stopBot(function(){
							process.exit(0);
							fn()
						});

					});
						
				});
			}else{
				var con=results;
				edit(JSON.stringify(con,null,2),"seed.json", function(err, result) {
					// when you are done editing result will contain the string 
					console.log("Updating seed please wait!");
					//console.log(result)
					var dic=JSON.parse(result);
					seedFile(dic,function(){
						console.log("Seed updated [SUCCESS]");
						process.bot.stopBot(function(){
							process.exit(0);
							fn()
						});

					});
						
				});
			}

		});
		
		
}
function seedFile(data,fn){
	//will seed the bot and exit gracefully
	pool.checkIfNewCrawl(function(newCrawl){
		//check if crawl is fresh or old
		//if new crawl it updates cluster info	
	if(!check.assigned(data)){
		//data is not provided
			var path=process.seedFile;
			check.assert.assigned(path,"file path cannot be undefined")
			// \n$ to remove extra \n at end
			var data=fs.readFileSync(path).toString().replace(/\t{2,}/gi,"\t").replace(/\n{2,}/gi,"\n").replace(/\n$/gi,"");
			var json=JSON.parse(data);
	}else{
		//data is provided
			var json=data;
	}
		
			var done=0;
			var success=0;
			var limit=_.size(json);
			var parsers={};
			for(var keys in json){
				var obj=json[keys];
				(function(a,b,c,dd,ee){
					parsers[b]=true;
					insertSeed(a,b,c,dd,ee,function(status){
						if(status){
							success+=1;
						}
						else{
							log.put("Failed to seed url "+a,"error");
						}
						done+=1;
						if(done===limit){	
							var size=_.size(parsers);
							var counter=0;
							for(var parser_keys in parsers){
								(function(parseFile){
									pool.insertParseFile(parseFile,function(parseFileUpdated){
											
											++counter;
											if(counter===size){
												if(!check.assigned(fn)){
													process.emit("stop_bot_and_exit");
												}else{
													fn();
												}
												
												return;
											}
											
									});

								})(parser_keys);
								
							}
							
							
						}
					});
				})(keys,obj["parseFile"],obj["phantomjs"],obj["priority"],obj["fetch_interval"]);
			}
	
	
	});		
}
function reset(fn){
			//drop the db				
		pool.drop(function(){
			log.put("db reset","success");
			log.put("robots cache reset","success");

			//drop temp dbs
			var files=fs.readdirSync(__dirname+'/db/sqlite');
			for (var i = 0; i < files.length; i++) {
				if(files[i].indexOf(".")===0){
					//do not take hidden files
					continue;
				}
				var data=fs.unlinkSync(__dirname+'/db/sqlite/'+files[i]);
			};
			log.put("SQLite db reset","success");


			//drop pdf store
			var files=fs.readdirSync(__dirname+'/pdf-store/');
			for (var i = 0; i < files.length; i++) {
				if(files[i].indexOf(".")===0){
					//do not take hidden files
					continue;
				}
				var domain=files[i].replace(/##/g,"/");
				var data=fs.unlinkSync(__dirname+'/pdf-store/'+files[i]);
			};
			log.put("pdf-store cache reset","success");


			
			try{
				var stream=fs.createWriteStream(__dirname+"/config/db_config.json");
				stream.write("{}");
				stream.close();
				log.put("Db config cleared","success");
			}catch(ee){
				log.put("Db config not cleared not cleared","error");
			}
			

			log.put("crawler reset","success");
			clearSeed(function(status){
					try{
							//app.pool.close();
							return fn();
					}
					catch(err){
						//#debug#console.log(err);
						log.put("in pool.close","error");
						return;
					}


			});
			


		});

					

		
	return;
		
}
function clearSeed(fn){
	if(!check.assigned(fn)){
		fn=function(){}
	}
	pool.clearSeed(function(cleared){
		if(check.assigned(fn)){
			fn(cleared);
			return;
		}
	});
}
function deathCleanUp(){
	if(process.caught_termination){
		return;
	}
	if(!check.assigned(log)){
		log={};
		log.put=function(msg,color){
			console.log(msg)
		};
		log.flush=function(){

		};
	}
	process.caught_termination=true;
	log.put('Termination request processing','info');
	cleanUp(function(done){
		if(done){
			//#debug#console.log(done)
			process.nextTick(function(){
				var pids=fs.readFileSync(__dirname+"/db/sqlite/active_pids.txt").toString().split("\n");
				for (var i = 0; i < pids.length; i++) {
					try{
						//#debug#console.log(parseInt(pids[i]))
						process.kill(parseInt(pids[i]));
					}catch(err){
						//#debug#console.log(err)
					}
					
				};
				fs.unlinkSync(__dirname+"/db/sqlite/active_pids.txt");
				process.exit(0);


			});
		}
	});
}
function cleanUp(fn){
	log.put("Performing cleanUp ","info");
	try{
		process.kill(process.tikaPID,"SIGINT");
	}catch(err){
		//trying to kill the tika server jar
	}
	if(!check.assigned(cluster.cluster_server)){
		cluster.cluster_server={}
	}
	if(!check.assigned(cluster.file_server)){
		cluster.file_server={}
	}
	if(!check.assigned(cluster.fileServer)){
		cluster.fileServer={}
	}
	if(!check.assigned(cluster.cluster_server.shutdown)){
		cluster.cluster_server.shutdown=function(fn){
			fn();
		};
	}
	if(!check.assigned(cluster.file_server.shutdown)){
		cluster.file_server.shutdown=function(fn){
			fn();
		};
	}
	if(!check.assigned(cluster.fileServer.shutdown)){
		cluster.fileServer.shutdown=function(fn){
			fn();
		};
	}
	if(!check.assigned(process.child_manager)){
						process.child_manager={};
						process.child_manager.setManagerLocked=function(){};
						process.child_manager.killWorkers=function(){};
						process.child_manager.flushAllInlinks=function(fn){fn();}
					}
	process.child_manager.setManagerLocked(true); //lock the manager so no new childs are spawned
	//#debug#console.log(cluster.cluster_server,cluster.file_server)
	process.child_manager.flushAllInlinks(function(status){
//flush all the inlinks into db before exit
process.child_manager.killWorkers();//kill all the workers before quiting
//clear timers
for (var i = 0; i < process.my_timers.length; i++) {
	clearInterval(process.my_timers[i]);
};
	cluster.cluster_server.shutdown(function() {
		cluster.file_server.shutdown(function() {
				cluster.fileServer.shutdown(function() {
					

					
					
						//clear all moduele references
						//#debug#console.log(process.bot);
						process.bot.stopBot(function (err) {
							  //if (err) throw err;
							
							log.put("cleanUp done","success");

							//flushing the log
							log.flush(function(){
								

									pool.close(function(){
										return fn(true);
									});
								
							});
						});
					});
									
									
									
									
									
								});
							
							
							});				
					});
				
				

}
if(!process.modifyConfig && !process.editSeedFile){
	var death=require("death");
	death(deathCleanUp);
}
process.on("stop_bot_and_exit",function(){
	process.bot.stopBot(function(){
		process.exit(0);
	})
});
process.on('restart',function(){
	cleanUp(function(done){
	if(done){
		var spawn = require('child_process').spawn;
		var file_path=__dirname+'/index.js';
		var ls    = spawn(config.getConfig("env"),[file_path],{stdio: 'inherit'});
		fs.appendFileSync(__dirname+"/db/sqlite/active_pids.txt",ls.pid+"\n");
		//ls.stdout.pipe(process.stdout);
		//process.exit(0);			
		ls.on("exit",function(){
			process.exit(0)
		});	
				
	}



});
			
		
			
});
process.on('grace_exit',function(){
	cleanUp(function(done){
		if(done){

			process.exit(0);
		}
		
	});
	
});