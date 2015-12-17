#!/usr/bin/env node
var proto=require(__dirname+'/lib/proto.js');
var config=require(__dirname+"/lib/config-reloader.js");
var JSONX=proto.init;
var fs=require('fs');
var log=require(__dirname+"/lib/logger.js");
var spawned={};
process.starter_lock=false;
function main(flag) {

	//setting args
	var argv = require('minimist')(process.argv.slice(2));
	if(argv["verbose"]!==undefined){
		var item=JSON.parse(argv["verbose"]);
		app.set("verbose",item);
		app.setVerbose(item);
	}
	if(argv["logging"]!==undefined){
		var item=JSON.parse(argv["logging"]);
		app.set("logging",item);
		app.setLogging(item);
	}
	if(argv["childs"]!==undefined){
		var item=argv["childs"];
		app.set("childs",item);
	}
	if(argv["max_concurrent_sockets"]!==undefined){
		var item=argv["max_concurrent_sockets"];
		app.set("max_concurrent_sockets",item);
	}
	if(argv["batch_size"]!==undefined){
		var item=argv["batch_size"];
		app.set("batch_size",item);
	}
	if(argv["db_type"]!==undefined){
		var item=argv["db_type"];
		app.set("db_type",item);
	}

			

			var pool=require(__dirname+'/pool');
			var db_type=config.getConfig("db_type");
			pool=pool.getDB(db_type).init();//choosing db type
			var collection;
			var childs=parseInt(config.getConfig("childs"));//childs to spawn
			var batchSize=parseInt(config.getConfig("batch_size"));
			process.active_childs=0;

			//requires
			var tracker=require(__dirname+"/server");
			var child=require('child_process');
			

			function starter(){
				if(process.starter_lock){
					//locked 
					log.put("Starter is locked ",'info');
					return;
				}
				else{
					log.put('lock release ','info');
					//now locking
					process.starter_lock=true;	
				}
				
				log.put("Check if new child available","info");
				log.put(("Current active childs "+process.active_childs),"info");
				var counter=0;
				var done=childs-process.active_childs;
				if(done===0){
					return;
				}
				function nextBatch(){
					pool.getNextBatch(function(err,results,hash){
					  		log.put("Got bucket "+hash,"info");
							if(results.length!==0){
								
								createChild(results,hash);
							}
							else{
								//push pool into db as childs are available but no buckets
								var k=inlinks_pool.splice(0,batchSize);
								pool.addToPool(k);
							}
							counter+=1;
							if(counter===done){
								//unlock starter now
								process.starter_lock=false;
								return;
							}
							else{
								process.nextTick(function(){nextBatch();});
							}
								
								
							},batchSize);
				}
					  
					nextBatch();
			}


			
			var inlinks_pool=[];
			var seed_links=pool.readSeedFile();//read the seed file
			if(seed_links===undefined){
				//empty file or file not exists
				return;
			}
			function createChild(results,hash){
				process.active_childs+=1;
				var botId=new Date().getTime()+""+parseInt(Math.random()*10000);
				var bot = child.fork(__dirname+"/spawn.js",[]);	
				spawned[botId]=bot;//saving child process
				log.put('Child process started '+botId,"success");
				var args=[results,batchSize,pool.links,botObjs,hash];
				bot.send({"init":args});
				bot.on('close', function (code) {
							//pushing the pool to db
							var k=inlinks_pool.splice(0,batchSize);
							pool.addToPool(k);
					
				
				  if(code===0){
				  	log.put(('Child process '+ botId+' exited with code ' + code),"success");
				  }
				  else{
				  	log.put(('Child process '+ botId+' exited with code ' + code),"error");
				  }
				  process.active_childs-=1;
				//  starter();
				 delete spawned[botId];		
				  
				});

				bot.on("message",childFeedback);

			}
			function childFeedback(data){
				//log.put("Parent recieved from "+data["bot"],"info");
					var t=data["setCrawled"];
					var d=data["addToPool"];
					var g=data["finishedBatch"];
					if(t){
						pool.setCrawled(t[0],t[1],t[2]);
					}
					else if(d){
						inlinks_pool.push(d);
						if(inlinks_pool.length>batchSize){
							var k=inlinks_pool.splice(0,batchSize);
							pool.addToPool(k);
							
							

						}

					
					}
					else if(g){
						pool.batchFinished(g);//set batch finished
					}
			}

			//starting child process for tika
			var tika = child.fork(__dirname+"/tika.js",[]);
			spawned["tika"]=tika;
			tika.on('close',function(code){

				if(code===0){

				}
				else{
	 
					log.put("Tika port occupied maybe an instance is already running ","error");

				}
			});
			tika.on("message",childFeedback);


				function initConnection(){
					pool.createConnection(function(){
						pool.seed(seed_links,starter);

					});

				}
				var botObjs;
				if(config.getConfig("allow_robots")){
					log.put("downloading robots.txt this could take a while","info");
					var robots=require(__dirname+'/robots.js').app;
					robots.init(Object.keys(pool.links),function(err,obj){
						if(!config.getConfig("verbose")){
							log.put("Robots files parsed","no_verbose");
						}
						log.put("robots.txt parsed","success");
						botObjs=obj;
						initConnection();
						
					});
				}
				else{
					initConnection();
				}
				setInterval(starter,15000);


				tracker.init(pool);//starting crawler webapp

	//cleanup code
	function cleanUp(close,fn){
		log.put("Performing cleanUp ","info");
			process.starter_lock=true;
			for(var key in spawned){
				spawned[key].kill();//kill the childs before exit
			}
		pool.stopBot(function(){
			log.put("cleanUp done","success");
		

			if(close===undefined || close){
				process.exit(0);
			}
			if(fn!==undefined){
				fn();
			}
			
		});
	}
	var death=require("death");
	death(cleanUp);
	process.on('restart',function(){
		if(process.MODE==='exec'){
				cleanUp(false,function(){
				var spawn = require('child_process').spawn;
	    		var file_path=__dirname+'/index.js';
				var ls    = spawn('/usr/bin/xterm', ['-hold','-e',config.getConfig("env")+" "+file_path+"; bash"]);
				ls.stdout.pipe(process.stdout);
				process.exit(0);


			});
		}
	
		
	});
			
	}




function updateJson(js){
	try{
		var pool=require(__dirname+'/pool');
		var db_type=config.getConfig("db_type");
		pool=pool.getDB(db_type).init();//choosing db type
		var dic=JSON.parse(JSONX.stringify(js));
		pool.createConnection(function(){
			config.updateLocalConfig(js,false);//update fs copy too
			pool.updateDbConfig(dic);//regex safe json update to db
			
		});
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
		var pool=require(__dirname+'/pool');
		var db_type=config.getConfig("db_type");
		pool=pool.getDB(db_type).init();//choosing db type
				pool.createConnection(function(){
						
							pool.drop(function(){
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
								app.clearSeed();
								try{
									pool.close();
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
	"crawl":function(){
		try{
			process.MODE='exec';
			main();
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
	"updateSeed":function(url,parseFile,phantomjs){
		var url=url.replace("https://","http://");
		if(this.isSeedPresent(url)){
			var data=fs.readFileSync(__dirname+"/seed").toString();
			var re=new RegExp(url+".*?\\n","gi");
			data=data.replace(re,"\n"+url+"\t"+parseFile+"\t"+""+phantomjs+"\n")
			data=data.replace(/\n{2,}/gi,"\n");
			fs.writeFileSync(__dirname+"/seed",data);
			log.put((""+url+" updated"),"success");
			return true;
		}else{
			log.put((""+url+" not exists"),"error");
			return false;
		}
	},
	"removeSeed":function(url){
		var url=url.replace("https://","http://");
		if(this.isSeedPresent(url)){
			var data=fs.readFileSync(__dirname+"/seed").toString();
			var re=new RegExp(url+".*?\\n","gi");
			data=data.replace(re,"\n\n")
			data=data.replace(/\n{2,}/gi,"\n");
			fs.writeFileSync(__dirname+"/seed",data);
			log.put((""+url+" removed"),"success");
			return true;
		}else{
			log.put((""+url+" not exists"),"error");
			return false;
		}
	},
	"loadSeedFile":function(path){
		var data=fs.readFileSync(path).toString().split("\n");
		for (var i = 0; i < data.length; i++) {
			var d=data[i].split("\t");
			app.insertSeed(d[0],d[1],JSON.parse(d[2]));
		};
	},
	"clearSeed":function(){
		try{
			fs.unlinkSync(__dirname+"/seed");
			fs.appendFileSync(__dirname+"/seed","");
			log.put(("Seed file cleared"),"success");
		}
		catch(err){
			console.log(err);
			log.put(("Unable to clear seed file"),"error");
			return false;
		}
		
		return true;
	}
};
if(require.main === module){
	try{
		process.MODE='exec';
		main();
	}
	catch(err){
		//cleanup will run automatically as normal exit
		console.log(err);
		cleanup();
	}
	
}else{
	process.MODE='require';

	exports.init=function(fn){
		try{
			var pool=require(__dirname+'/pool');
			var db_type=config.getConfig("db_type");
			pool=pool.getDB(db_type).init();//choosing db type
			pool.createConnection(function(){
					app.pool=pool;//set pool obj
					fn(app);//return the app object when db connection is made

			});
		}
		catch(err){
			fn(null);
		}

	};
}





