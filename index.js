#!/usr/bin/env node
var proto=require(__dirname+'/lib/proto.js');
var config=require(__dirname+"/lib/config-reloader.js");
var JSONX=proto.init;
var fs=require('fs');
var log=require(__dirname+"/lib/logger.js");
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
					return;
				}
				else{
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
				var bot = child.fork(__dirname+"/spawn.js",[]);	
				log.put('Child process started ',"success");
				var args=[results,batchSize,pool.links,botObjs,hash];
				bot.send({"init":args});
				bot.on('close', function (code) {
							//pushing the pool to db
							var k=inlinks_pool.splice(0,batchSize);
							pool.addToPool(k);
					
				
				  if(code===0){
				  	log.put(('Child process exited with code ' + code),"success");
				  }
				  else{
				  	log.put(('Child process exited with code ' + code),"error");
				  }
				  console.log(process.active_childs+"before");
				  process.active_childs-=1;
				  console.log(process.active_childs+"after");
				  starter();
										
				  
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
	function cleanUp(){
		log.put("Performing cleanUp ","info");
		pool.stopBot(function(){
			log.put("cleanUp done","success");
			process.exit(0);
		});
	}
	var death=require("death");
	death(cleanUp);
			
	}




function updateJson(js){
	try{
		fs.writeFileSync(__dirname+"/config/config.js","var temp=__dirname.split(\"/\");\ntemp.pop();\nvar parent_dir=temp.join(\"/\");\nvar proto=require(parent_dir+'/lib/proto.js');\nvar JSONX=proto.init;\nvar config="+JSONX.stringify(js)+"\n\nfunction load(){\nreturn JSONX.parse(JSON.stringify(config));\n}\nexports.load=load;\n\n");
	}
	catch(err){
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
		main();
		return undefined;
	},
	"isSeedPresent":function(url){
		try{
			var url=url.replace("https://","http://");
			var data=fs.readFileSync(__dirname+"/seed").toString();
			if(url[url.length-1]==="/"){
				url=url.slice(0,url.length-1);
			}
			return (data.indexOf(url)>=0);
		}
		catch(err){
			fs.appendFileSync(__dirname+"/seed","");
			return false;
		}
	},
	"insertSeed":function(url,parseFile,phantomjs){
		var url=url.replace("https://","http://");
		if(this.isSeedPresent(url)){
			log.put((""+url+" already exists"),"error");
			return false;
		}
		fs.appendFileSync(__dirname+"/seed","\n"+url+"\t"+parseFile+"\t"+""+phantomjs);
		log.put((""+url+" inserted"),"success");
		return true;
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
	main();
}
exports.init=function(){
//init function before sending lib
return app;

};




