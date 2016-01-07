#!/usr/bin/env node
/*

	Index.js
	Main js file of the crawler
	@author Tilak Patidar

*/


//global requires
process.force_mode=false;//enables or disables the process.force_mode
process.my_timers=[];
process.reset=false;
process.seedFile=null;
var proto=require(__dirname+'/lib/proto.js');
JSONX=proto["JSONX"];//JSON for regex support in .json files
process.getAbsolutePath=proto.getAbsolutePath;
var argv=require(__dirname+'/argv.js');
var overriden_config=argv.init();//parses cmd line argv and perform required operations
var config=require(__dirname+"/lib/config-reloader.js");
config.setOverridenConfig(overriden_config);
var fs=require('fs');
var log=require(__dirname+"/lib/logger.js");
var cluster;//stores the cluster obj to communicate with the other bots



function main(pool) {
	//setting args
	
	process.bot.startBot(process.force_mode,function(s){
		if(s){
			//bot was started successfully
			function startBotManager(links,botObjs){


				//function to start the child_manager
				pool.seed(links,function(completed){
					if(completed){
						//create a child manager
						process.child_manager=new require(__dirname+'/child_manager.js')(pool,botObjs,cluster);						
					}


				});

			}

			pool.readSeedFile(function(links){

				//reading the seed links from db

						var botObjs={};//will store robots.txt data for seed links

						if(config.getConfig("allow_robots")){

							/*	
								if robots.txt has to be followed
								we have to download all robots.txt files
							*/

							log.put("downloading robots.txt this could take a while","info");
							var robots=require(__dirname+'/robots.js').app;
							robots.init(Object.keys(pool.links),function(err,obj){
								console.log(obj);
								if(obj){
									log.put("robots.txt parsed","success");
								}
								else{
									log.put("robots.txt parsing failed","error");
								}
								botObjs=obj;
								startBotManager(links,botObjs);
								
							});
						}
						else{
							startBotManager(links,null);
						}


				
					

				});
		}
		else{
			process.exit(0);
		}
	});
				
				


	function cleanUp(fn){
		log.put("Performing cleanUp ","info");
			process.child_manager.setManagerLocked(true);
			process.child_manager.flushAllInlinks(function(status){
				//flush all the inlinks into db before exit
					process.child_manager.killWorkers();//kill all the workers before quiting
					//clear all moduele references
					//console.log(process.bot);
					process.bot.stopBot(function (err) {
						  //if (err) throw err;
						
						log.put("cleanUp done","success");
					
						//flushing the log
						log.flush(function(){
							//clear timers
							for (var i = 0; i < process.my_timers.length; i++) {
								clearInterval(process.my_timers[i]);
							};
							pool.close();
								fn(true);
							
							
							
							
							
						});
					
					
					});				
			});

	}
	function deathCleanUp(){
		log.put('Termination request processing','info');
		cleanUp(function(done){
			if(done){
				process.exit(0);
			}
		});
	}
	var death=require("death");
	death(deathCleanUp);
	process.on('restart',function(){
				cleanUp(function(done){
				if(done){
					var spawn = require('child_process').spawn;
		    		var file_path=__dirname+'/index.js';
					var ls    = spawn('/usr/bin/xterm', ['-hold','-e',config.getConfig("env")+" "+file_path+"; bash"]);
					ls.stdout.pipe(process.stdout);
					process.exit(0);				
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
			

}


function updateJson(js){
	try{
		var dic=JSON.parse(JSONX.stringify(js));
		config.updateLocalConfig(js,false);//update fs copy too
		config.updateDbConfig(dic);//regex safe json update to db
	}
	catch(err){
		console.log(err);
		return false;
	}
	return true;
	
}


var app={
	"getConfig":function(){
		return config.getConfig();
	},
	"set":function(key,value,oldKey){
		//for recursive json objects
		var config1=config.getConfig();
		if(Object.prototype.toString.call(value) === '[object Object]'){
			for(var key1 in value){
				app.set(key1,value[key1],key);
			}
			return true;
		}
		if(this.isProperty(key)){
			if(oldKey!==undefined){
				if(value===null){
					delete config1[oldKey][key];
				}
				else{
					config1[oldKey][key]=value;
				}
				
			}
			else{
				if(value===null){
					delete config1[key];
				}
				else{
					config1[key]=value;
				}
				
			}
			
			if(updateJson(config1)){
				log.put((""+key+" updated"),"success");
				return true;
			}
			else{
				log.put((""+key+" update failed"),"error");
				return false;
			}
			
		}
		else{
			log.put((""+key+" invalid"),"error");
			return false;
		}
	},
	"get":function(args){
		return config.getConfig.apply(null,arguments);

	},
	"isProperty":function(args){
		return app.get.apply(null,arguments)!==undefined;
	},
	"reset":function(fn){
		//drop the db
		if(fn===undefined){
			fn=function(){};
		}
				
						
							app.pool.drop(function(){
								log.put("db reset","success");
								var files=fs.readdirSync(__dirname+'/robots/');
								for (var i = 0; i < files.length; i++) {
									if(files[i].indexOf(".")===0){
										//do not take hidden files
										continue;
									}
									var domain=files[i].replace(/##/g,"/");
									var data=fs.unlinkSync(__dirname+'/robots/'+files[i]);
								};
								log.put("robots cache reset","success");
								var files=fs.readdirSync(__dirname+'/db/sqlite');
								for (var i = 0; i < files.length; i++) {
									if(files[i].indexOf(".")===0){
										//do not take hidden files
										continue;
									}
									var data=fs.unlinkSync(__dirname+'/db/sqlite/'+files[i]);
								};
								log.put("SQLite db reset","success");
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
								log.put("crawler reset","success");
								app.clearSeed(function(status){
										try{
												//app.pool.close();
												fn();
										}
										catch(err){
											console.log(err);
											log.put("in pool.close","error");
											return;
										}


								});
								


							});

							

				
			return;
	},
	"crawl":function(force){
		if(force===undefined || force === false){
			process.force_mode=false;
		}
		else{
			process.force_mode=true;
		}
		try{
			process.MODE='exec';//will now run the crawler change the mode
			main(app.pool);
		}
		catch(err){
			console.log(err);
			cleanUp();
		}
		
		return undefined;
	},
	"isSeedPresent":function(url,fn){
		try{
				app.pool.checkIfNewCrawl(function(newCrawl,cluster_info){
				if(newCrawl){
					fn(false);
				}
				else{
					url=url.replace(/\./gi,"#dot#");
					if(cluster_info.seedFile[url]){
						fn(true);
					}
					else{
						fn(false);
					}
				}
			});
			
		}
		catch(err){
			fn(false);
		}
	},
	"insertSeed":function(url,parseFile,phantomjs,fn){
		url=url.replace("https://","http://");
		app.isSeedPresent(url,function(present){
			if(present){
				fn(false);
			}
			else{
				app.pool.insertSeed(url,parseFile,phantomjs,function(inserted){
				
					if(inserted){
						fn(true);
					}
					else{
						fn(false);
					}
				});
			}


		});
		
	},
	"updateSeed":function(url,parseFile,phantomjs,fn){
		url=url.replace("https://","http://");
		app.isSeedPresent(url,function(present){
			if(!present){
				fn(false);
			}
			else{
				app.pool.insertSeed(url,parseFile,phantomjs,function(inserted){
					if(inserted){
						fn(true);
					}
					else{
						fn(false);
					}
				});
			}


		});
	},
	"removeSeed":function(url,fn){
		var url=url.replace("https://","http://");
		app.pool.removeSeed(url,function(removed){
					if(removed){
						fn(true);
					}
					else{
						fn(false);
					}
		});
		
	},
	"loadSeedFile":function(path,fn){
		var data=fs.readFileSync(path).toString().split("\n");
		var done=0;
		for (var i = 0; i < data.length; i++) {
			var d=data[i].split("\t");
			(function(a,b,c){
				app.insertSeed(a,b,c,function(status){
					if(status){
						
					}
					done+=1;
					if(done===data.length){
						fn(true);
					}
				});
			})(d[0],d[1],JSON.parse(d[2]));
			
		};
	},
	"clearSeed":function(fn){
		app.pool.clearSeed(function(cleared){
			fn(cleared);
		});
	},
	"close":function(fn){
		process.bot.stopBot(function(){
			fn();
		});
	}
};
if(require.main === module){
	try{
		
		function executeProgram(fn){
			var pool=require(__dirname+'/pool');
			var db_type=config.getConfig("db_type");
			process.MODE='exec';
			pool=pool.getDB(db_type).init();//choosing db type
			pool.createConnection(function(){
				require(__dirname+'/cluster.js').init(pool,function(c){
				app.pool=pool;//set pool obj
				cluster=c;
				config.setDB(pool,overriden_config);
				var bot=require(__dirname+'/lib/bot.js');
				process.bot=new bot(cluster,pool);//making global so that bot stats can be updated in any module
				fn(pool);
				});			
			});
		}
		if(process.reset){
			executeProgram(function(){
				app.reset(function(){
					process.bot.stopBot(function(){
						process.exit(0);
					});
					
				});
			});
					
		}
		else if(process.seedFile!==null){
			executeProgram(function(pool){
				app.loadSeedFile(process.seedFile,function(){
					log.put('Bot seeded start bot without seedFile now','success');
					process.bot.stopBot(function(){
						process.exit(0);
					});
				});
			});
		}
		else{
			executeProgram(function(pool){
				main(pool);
			});
			
		}
		
		
		
	}
	catch(err){
		//cleanUp will run automatically as normal exit
		console.log(err);
		cleanUp();
	}
	
}else{
	process.MODE='require';

	exports.init=function(fn){
		
			var pool=require(__dirname+'/pool');
			var db_type=config.getConfig("db_type");
			pool=pool.getDB(db_type).init();//choosing db type
			pool.createConnection(function(){
				require(__dirname+'/cluster.js').init(pool,function(c){
					cluster=c;
					app.pool=pool;//set pool obj
					config.setDB(pool);
					var bot=require(__dirname+'/lib/bot.js');
					process.bot=new bot(cluster,pool);//making global so that bot stats can be updated in any module
					fn(app);//return the app object when db connection is made
				});
			});
		

	};
}





