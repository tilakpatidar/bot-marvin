#!/usr/bin/env node
var proto=require(__dirname+'/lib/proto.js');
var config=require(__dirname+"/config/config").load();
var JSONX=proto.init;
var fs=require('fs');
var log=require(__dirname+"/lib/logger.js");
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

			//reload config
			var config=require(__dirname+"/config/config").load();

			var pool=require(__dirname+'/pool');
			var db_type=config["db_type"];
			pool=pool.getDB(db_type).init();//choosing db type
			var collection;
			var childs=parseInt(config["childs"]);//childs to spawn
			var batchSize=parseInt(config["batch_size"]);
			process.active_childs=0;

			//requires
			var tracker=require(__dirname+"/server");
			var child=require('child_process');
			

			function starter(){
				log.put("Check if new child available","info");
				log.put(("Current active childs "+process.active_childs),"info");
				var counter=0;
				var done=childs-process.active_childs;
				if(done===0){
					setTimeout(starter,15000);
					return;
				}
				for (var i = process.active_childs; i < childs; i++) {
					  pool.getNextBatch(function(err,results,hash){
					  		//console.log("results length  "+results.length);
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
								setTimeout(starter,15000);
							}
								
								
							},batchSize);
					}
			}


			
			var inlinks_pool=[];
			var seed_links=pool.readSeedFile();//read the seed file
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
				  
				  process.active_childs-=1;
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
			tika.on("message",childFeedback);


				function initConnection(){
					pool.createConnection(function(){
						pool.seed(seed_links,starter);

					});

				}
				var botObjs;
				if(config["allow_robots"]){
					log.put("downloading robots.txt this could take a while","info");
					var robots=require(__dirname+'/robots.js').app;
					robots.init(Object.keys(pool.links),function(err,obj){
						log.put("robots.txt parsed","success");
						botObjs=obj;
						initConnection();
						setTimeout(starter,15000);
					});
				}
				else{
					initConnection();
					setTimeout(starter,15000);
				}



				tracker.init(pool);//starting crawler webapp

			
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
		var config=require(__dirname+"/config/config.js").load();
		return config;
	},
	"set":function(key,value){
		//for recursive json objects
		if(Object.prototype.toString.call(value) === '[object object]'){
			for(var key1 in value){
				app.set(key1,value[key1]);
			}
			return true;
		}
		if(this.isProperty(key)){
			config[key]=value;
			if(updateJson(config)){
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
	"get":function(key){
		return config[key];

	},
	"isProperty":function(key){
		var data=fs.readFileSync(__dirname+"/config/config.js").toString();
		var re=new RegExp("\""+key+"\"","gi");
		if(data.match(re)){
			return true;
		}
		else{
			return false;
		}
	},
	"reset":function(fn){
		//drop the db
		var pool=require(__dirname+'/pool');
		var db_type=config["db_type"];
		pool=pool.getDB(db_type).init();//choosing db type
				pool.createConnection(function(){
						
							pool.drop();
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
								return;
							}
							

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
			log.put(("Seed file cleared"),"success");
		}
		catch(err){
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




