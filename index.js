#!/usr/bin/env node
/*

	Index.js
	Main js file of the crawler
	@author Tilak Patidar

*/


//global requires
process.setMaxListeners(50);
process.caught_termination=false;
process.begin_intervals=false;
process.force_mode=false;//enables or disables the process.force_mode
process.my_timers=[];//stores all the timers used to remove all timers for graceful exit
process.reset=false;
process.seedFile=null;
process.seedFileData=null;
process.removeSeed = null;

var fs=require('fs');
var check = require('check-types');
var _=require("underscore");
var cluster,log;

//checks dependencies and exits if not met

var dependency=require(__dirname+"/lib/depcheck.js");
dependency.check();


var proto=require(__dirname+'/lib/proto.js');
JSONX=proto["JSONX"];//JSON for regex support in .json files

process.getAbsolutePath=proto.getAbsolutePath;
var parent_dir = __dirname;  //parent dir path for importing modules safely



var config=require( parent_dir + "/lib/config-reloader.js" );
var seed=require(parent_dir+"/lib/seed-reloader.js");

process.bot_config=config; //globals for sharing config and seed file across various modules
process.bot_seed=seed;


//importing db connector
var pool=require(__dirname+'/lib/pool');
var db_type=config.getConfig("db_type");
pool=pool.getDB(db_type).init();//choosing db type


//some args need to be parsed before
var argv = require('minimist')(process.argv.slice(2));
if(check.assigned(argv["force"])){
		process.force_mode=true;
}

pool.createConnection(function(){
	process.pool=pool; //global db pool
	startCluster(function(){
		
		startBot(function(s){
			config.setDB(pool,function(){
				seed.setDB(pool,function(){
					var argv=require(__dirname+'/lib/argv.js');

					var new_opts=argv.init(); //executes the args passed and returns overriden config

					var overriden_config=new_opts;//parses cmd line argv and perform required operations
					

					process.config_delay_interval=setInterval(function(){
						if(!process.modifyConfig){ //set to true by argv if --config is selected stops bot from starting if this option is selected
							clearInterval(process.config_delay_interval);
							config.pullConfig(function(){
								log=require(parent_dir+"/lib/logger.js");
								pool.checkIfNewCrawl(function(){
									if(process.editSeedFile){
										seed.editSeedFile();
									}else if(process.removeSeed){
										seed.removeSeed(Object.keys(process.removeSeed)[0]);
									}
									else if(process.seedFile){
										seed.seedFile(process.seedFile, null);
									}else if(process.reset){
										reset(function(){
											process.bot.stopBot(function(){
												process.exit(0);
											});
										});
									}
									else{
										seed.pull(function(){
											entire_body(overriden_config);
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
		require(parent_dir+'/lib/cluster.js').init(pool,function(c){

			cluster=c; //get cluster objecte
			//seed.setDB(pool);
			var bot=require(parent_dir+'/lib/bot.js');
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
			process.child_manager=new require(parent_dir+'/lib/child_manager.js')(pool,botObjs,cluster);		
			//#debug#console.log(process.child_manager,"child_manager")				
		}


	});

}
function entire_body(overriden_config){
	//console.log(overriden_config)
	config.setOverridenConfig(overriden_config);
	fs.appendFileSync(__dirname+"/db/sqlite/active_pids.txt",process.pid+"\n");
	var cluster;//stores the cluster obj to communicate with the other bots
	
		
			pool.readSeedFile(function(links,links_fetch_interval){
					//reading the seed links from db
			

					var botObjs={};//will store robots.txt data for seed links

					if(config.getConfig("allow_robots") && !process.webappOnly){

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