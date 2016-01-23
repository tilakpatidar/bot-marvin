#!/usr/bin/env node
/*

	Index.js
	Main js file of the crawler
	@author Tilak Patidar

*/


//global requires
process.force_mode=false;//enables or disables the process.force_mode
process.my_timers=[];//stores all the timers used to remove all timers for graceful exit
process.reset=false;
process.seedFile=null;
var proto=require(__dirname+'/lib/proto.js');
var check = require('check-types');
var _=require("underscore")
JSONX=proto["JSONX"];//JSON for regex support in .json files
process.getAbsolutePath=proto.getAbsolutePath;
var argv=require(__dirname+'/lib/argv.js');
var new_opts=argv.init();
var log=require(__dirname+"/lib/logger.js");
var overriden_config=new_opts;//parses cmd line argv and perform required operations
var config=require(__dirname+"/lib/config-reloader.js");
config.setOverridenConfig(overriden_config);
var fs=require('fs');
var dependency=require(__dirname+"/lib/depcheck.js");
dependency.check();
var cluster;//stores the cluster obj to communicate with the other bots



function main(pool) {
	//setting args
	
	process.bot.startBot(process.force_mode,function(status){
		if(status){
			//bot was started successfully
			function startBotManager(links,botObjs){


				//function to start the child_manager
				pool.seed(links,function(completed){
					if(completed){
						//create a child manager
						process.child_manager=new require(__dirname+'/lib/child_manager.js')(pool,botObjs,cluster);						
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
							var robots=require(__dirname+'/lib/robots.js').app;
							robots.init(Object.keys(pool.links),function(err,obj){
								//console.log(obj);
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
			//unable to start bot exit gracefully
			process.exit(0);
		}
	});
				
				


	function cleanUp(fn){
		log.put("Performing cleanUp ","info");
			process.child_manager.setManagerLocked(true); //lock the manager so no new childs are spawned
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
		//return the json config of the bot
		return config.getConfig();
	},
	"set":function(){
		//for recursive json objects
		var config1=config.getConfig();
		var t="";
		var val;
		for (var i = 0; i < arguments.length; i++) {
			if(i===arguments.length-1){
				val=arguments[i]
			}else{
				check.assert.assigned(arguments[i],"key value pairs cannot be undefined")
				check.assert.string(arguments[i],"key value should be a string")
				t+="['"+arguments[i]+"']"
			}
		};
		eval("config1"+t+"=val");
		var log_key=t.replace(/'/g,"").replace("\[|\]"," ");
		if(updateJson(config1)){
				log.put((""+log_key+" updated"),"success");
				return true;
			}
			else{
				log.put((""+log_key+" update failed"),"error");
				throw new Error(""+log_key+" update failed");
				return false;
			}
			
		
	},
	"get":function(args){
		check.assert.assigned(args,"atleast one arg expected")
		return config.getConfig.apply(null,arguments);

	},
	"isProperty":function(args){
		check.assert.assigned(args,"atleast one arg expected")
		return check.assigned(app.get.apply(null,arguments));
	},
	"reset":function(fn){
		//drop the db
		if(!check.assigned(fn)){
			fn=function(){};
		}
				
						
							app.pool.drop(function(){
								log.put("db reset","success");

								//drop robots.txt cache
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
		if(!check.assigned(force) || force === false){
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
		check.assert.assigned(url,"seed url cannot be undefined")
		if(!check.assigned(fn)){
			fn=function(){};
		}

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
	"insertSeed":function(url,parseFile,phantomjs,priority,fetch_interval,fn){
		if(!check.assigned(fn)){
			fn=function(){}
		}
		if(_.size(arguments)<5){
			throw new SyntaxError("atleast 5 args expected");
			fn(false);
		}
		url=url.replace("https://","http://");
		app.isSeedPresent(url,function(present){
			if(present){
				fn(false);
			}
			else{
				app.pool.insertSeed(url,parseFile,phantomjs,priority,fetch_interval,function(inserted){
				
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
	"updateSeed":function(url,parseFile,phantomjs,priority,fetch_interval,fn){
		if(!check.assigned(fn)){
			fn=function(){}
		}
		if(_.size(arguments)<5){
			throw new SyntaxError("atleast 5 args expected");
			fn(false);
		}
		url=url.replace("https://","http://");
		app.isSeedPresent(url,function(present){
			if(!present){
				fn(false);
			}
			else{
				app.pool.insertSeed(url,parseFile,phantomjs,priority,fetch_interval,function(inserted){
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
		if(!check.assigned(fn)){
			fn=function(){}
		}
		check.assert.assigned(url,"seed url cannot be undefined")
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
		if(!check.assigned(fn)){
			fn=function(){}
		}
		check.assert.assigned(path,"file path cannot be undefined")
		// \n$ to remove extra \n at end
		var data=fs.readFileSync(path).toString().replace(/\t{2,}/gi,"\t").replace(/\n{2,}/gi,"\n").replace(/\n$/gi,"").split("\n");
		var done=0;
		var success=0;
		for (var i = 0; i < data.length; i++) {
			var d=data[i].split("\t");
			(function(a,b,c,dd,ee){
				app.insertSeed(a,b,c,dd,ee,function(status){
					if(status){
						success+=1;
					}
					else{
						log.put("Failed to seed url "+a,"error");
					}
					done+=1;
					if(done===data.length){
						fn(true);
					}
				});
			})(d[0],d[1],JSON.parse(d[2]),d[3],d[4]);
			
		};
	},
	"clearSeed":function(fn){
		if(!check.assigned(fn)){
			fn=function(){}
		}
		app.pool.clearSeed(function(cleared){
			if(check.assigned(fn)){
				fn(cleared);
			}
		});
	},
	"close":function(fn){
		if(!check.assigned(fn)){
			fn=function(){}
		}
		process.bot.stopBot(function(){
			if(check.assigned(fn)){
				fn();
			}
		});
	},
	"setParser":function(parser_name,fn_webpage,fn_files,fn){
		if(!check.assigned(fn)){
			fn=function(){}
		}
		var webpage="var user_defined_fn="+fn_webpage.toString()+";\nuser_defined_fn(ret,data,$)";
		var fn_files="var user_defined_fn="+fn_files.toString()+";\nuser_defined_fn(ret,data)";
		var code=fs.readFileSync(__dirname+"/lib/parse_template.js").toString();
		
		code=code.replace("###REPLACE_HTML###",fn_webpage).replace("###REPLACE_DOC###",fn_files);
		fs.writeFileSync(__dirname+"/parsers/"+parser_name+".js",code);
		app.pool.insertParseFile(parser_name,function(bool){
			if(bool===true){
				log.put("Parse File inserted","success");
			}
			else{
				log.put("Parse File insert failed","error");
			}
			if(check.assigned(fn)){
				fn();
			}
			
		})
	}
};
if(require.main === module){
	try{
		
		function executeProgram(fn){
			var pool=require(__dirname+'/lib/pool');
			var db_type=config.getConfig("db_type");
			process.MODE='exec';
			pool=pool.getDB(db_type).init();//choosing db type
			pool.createConnection(function(){
				require(__dirname+'/lib/cluster.js').init(pool,function(c){
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
		else if(check.assigned(process.seedFile)){
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
		
			var pool=require(__dirname+'/lib/pool');
			var db_type=config.getConfig("db_type");
			pool=pool.getDB(db_type).init();//choosing db type
			pool.createConnection(function(){
				require(__dirname+'/lib/cluster.js').init(pool,function(c){
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





