/*
Child_manager.js
@author Tilak Patidar

Manages crawling workers owned by the bot and manages 
the communication and cordination between workers. 

	*starter_lock
	*locks the starter to avoid running 
	*the same function due to setInterval 
	*when old starter instance has not finished

	*active_childs
	keep the count of current active_childs
*/
var parent_dir=process.getAbsolutePath(__dirname);
var config=process.bot_config;
var log=require(parent_dir+"/lib/logger.js");
var childs=config.getConfig("childs");//childs to spawn
var batchSize=config.getConfig("batch_size");
var active_childs=0;
var cluster;
var check=require("check-types");
var botObjs={};//stores the robots.txt data
var tracker=require(parent_dir+"/lib/server.js");
var graph=require(parent_dir+"/lib/graph.js");
var child=require('child_process');
var inlinks_pool=[];
var fs=require("fs");
var sqlite3 = require('sqlite3').verbose();
var failed_db = new sqlite3.Database(parent_dir+'/db/sqlite/failed_queue');
failed_db.serialize(function() {
	failed_db.run("CREATE TABLE IF NOT EXISTS q (id INTEGER PRIMARY KEY AUTOINCREMENT,failed_url TEXT UNIQUE,failed_info TEXT,status INTEGER, count INTEGER)");
	//reset status counter on restart
	failed_db.run("UPDATE q SET status=0 WHERE status=1");
});
var tika_db = new sqlite3.Database(parent_dir+'/db/sqlite/tika_queue');
tika_db.serialize(function() {
	tika_db.run("CREATE TABLE IF NOT EXISTS q (id INTEGER PRIMARY KEY AUTOINCREMENT,fileName TEXT UNIQUE,parseFile TEXT,status INTEGER)");
	tika_db.run("UPDATE q SET status=0 WHERE status=1;");
});
var first_time=true;
process.starter_lock=false;
process.begin_intervals=true;
process.failed_batch_lock = false;
process.bot_killer_locked = false;
var pool;//global db object in the entire app
var spawned={};
var bot_spawn_time={};
function starter(){
	/*
		encapsulated function responsible for allocating vacant childs 
		This function is run continously in an interval to check and 
		realocate workers.
	*/
	
	if(process.starter_lock){
		return;
	}
	
	log.put("Check if new child available","info");
	log.put(("Current active childs "+active_childs),"info");
	var done=childs-active_childs;
	if(done===0){
		return;//no available childs
	}
	if(!process.webappOnly){
			nextBatch();//call nextBatch to obtain a new bucket and start a worker
	}
	
};//end of starter

function nextBatch(){
	active_childs+=1;
	/*

		encapsulated function which checks for an available 
		bucket and starts a new worker
	*/
		pool.getNextBatch(function(err,results,hash,refresh_label){
		  		
				if(results.length!==0 && check.assigned(hash)){
					//if bucket is not empty 
					log.put("Got bucket "+hash,"info");
					createChild(results,hash,refresh_label);
				}
				else{
					active_childs-=1;
					//inlinks_pool into db as childs are available but no buckets
					app.flushInlinks(function(){});
				}
					
					
				},batchSize);
	}

function nextFailedBatch(){
	if(process.failed_batch_lock){
		return;
	}
	process.failed_batch_lock = true; 
	var li = [];
	failed_db.serialize(function(){
		
		failed_db.serialize(function() {
				failed_db.each("SELECT * FROM q WHERE count<"+config.getConfig("retry_times_failed_pages")+" AND status=0 LIMIT 0,"+config.getConfig('failed_queue_size'),function(err,row){
					//console.log(err,row.id,'added to child');

					failed_db.run("UPDATE q SET status=1 WHERE id=?",[row.id],function(e,r){
						//console.log(e,row.id,'status updated');
						log.put('Retry in failed queue '+row.failed_url,'info');
					});					
					
					var failed_info = JSON.parse(row.failed_info);
					//bucket_id for failed pages is failed_queue_(row.id)_(count)
					li.push({'_id':row.failed_url,'domain':failed_info['domain'], 'bucket_id':'failed_queue_'+failed_info['bucket_id']+'_'+row.id+'_'+row.count});
					
					
				},function(){

					//all callbacks were successfull
					
					createChild_for_failed_queue(li,'failed_queue', 'failed_queue');// sending failed_queue string instead of bucket hash
					//it will not be reported to finishedBatch
					//see below in childFeedBack
				});

		});



	});


}

function createChild_for_failed_queue(bucket_links,hash,refresh_label){
	log.put('Starting failed_queue','info');
	var botId=new Date().getTime()+""+parseInt(Math.random()*10000);//generate a random bot id
	var bot = child.fork(parent_dir+"/spawn.js",[]);	
	spawned[botId]=bot;//saving child process for killing later in case of cleanup
	bot_spawn_time[botId] = {'bot':bot,'spawn_time':new Date().getTime(),'bucket_links':bucket_links,'hash':hash};
	log.put('Child process started '+botId,"success");
	var c= config.getGlobals();// tuple of config,overriden_config,db_config
	var args=[bucket_links,batchSize,pool.links,botObjs,hash,refresh_label,c[0],c[1],c[2]];
	//not sending args with child process as char length limitation on bash

	//bot waits for this "init" msg which assigns the details of the task
	try{
		bot.send({"init":args});
	}catch(err){
		
	}
	
	

	bot.on('close', function (code) {
		  //pushing the pool to db
		  app.flushInlinks(function(){});
		  if(code===0){
		  	log.put(('Child process '+ botId+' exited with code ' + code),"success");
		  }
		  else{
		  	log.put(('Child process '+ botId+' exited with code ' + code),"error");
		  }
		  process.failed_batch_lock = false;
		 delete bot_spawn_time[botId];
		 delete spawned[botId];	//delete from our record	
	  
	});

	bot.on("message",childFeedback);	
}



function createChild(bucket_links,hash,refresh_label){
	if(first_time){
		process.bucket_creater_locked=false;
		first_time=false;
		//will unlock the bucker_creator for first time
	}
	
	var botId=new Date().getTime()+""+parseInt(Math.random()*10000);//generate a random bot id
	var bot = child.fork(parent_dir+"/spawn.js",[]);	
	spawned[botId]=bot;//saving child process for killing later in case of cleanup
	bot_spawn_time[botId] = {'bot':bot,'spawn_time':new Date().getTime(),'bucket_links':bucket_links,'hash':hash};
	log.put('Child process started '+botId,"success");
	var c= config.getGlobals();// tuple of config,overriden_config,db_config
	var args=[bucket_links,batchSize,pool.links,botObjs,hash,refresh_label,c[0],c[1],c[2]];
	//not sending args with child process as char length limitation on bash

	//bot waits for this "init" msg which assigns the details of the task
	try{
		bot.send({"init":args});
	}catch(err){
		
	}
	
	

	bot.on('close', function (code) {
		  //pushing the pool to db
		  app.flushInlinks(function(){});
		  pool.batchFinished(hash,refresh_label,function(){
			  if(code===0){
			  	log.put(('Child process '+ botId+' exited with code ' + code),"success");
			  }
			  else{
			  	log.put(('Child process '+ botId+' exited with code ' + code),"error");
			  }
		  });

		  active_childs-=1;
		 delete bot_spawn_time[botId];
		 delete spawned[botId];	//delete from our record	
	  
	});

	bot.on("message",childFeedback);

}

function botKiller(){
	if(process.bot_killer_locked){
		return;
	}
	process.bot_killer_locked = true;
	var d = 0;
	var c = Object.keys(bot_spawn_time).length;
    if(c === 0){ 
        process.bot_killer_locked = false;
        return;
    }
	for(var botId in bot_spawn_time){
		if(botId === "tika"){
			++d;
			if(d === c){
				process.bot_killer_locked = false;
				return;
			}
			continue
		}
		(function(botId){
			var bot = bot_spawn_time[botId];
			if((new Date().getTime() - bot['spawn_time']) >= config.getConfig('child_timeout')){
				log.put('Timeout in '+botId+' shutting down gracefully','error');
				if(bot['hash'].indexOf('failed_queue')>=0){
					//failed_queue child process
					//no need to track just 
					var rows = [];
					for(var index in bot['bucket_links']){
						var link = bot['bucket_links'][index];
						var failed_id = parseInt(link['bucket_id'].replace('failed_queue_','').split('_')[1]);
						rows.push(failed_id);
					}
					if(rows.length === 0){

							try{
								log.put('No uncrawled pages found, still shutting '+botId, 'success');
								spawned[botId].kill();
								delete bot_spawn_time[botId];
		 						delete spawned[botId];	//delete from our record	
							}catch(err){
								
							}	
							++d;
							if(d === c){
								process.bot_killer_locked = false;
							}
							return;					
					}
					failed_db.serialize(function(){
						failed_db.run("UPDATE q SET status=0 WHERE id IN "+'('+rows.toString()+')',[],function(e,r){
							console.log(e,r);
							try{
								log.put('uncrawled pages found, and were added to failed_queue - shutting '+botId, 'success');
								spawned[botId].kill();
								delete bot_spawn_time[botId];
		 						delete spawned[botId];	//delete from our record	
							}catch(err){
								
							}

						});	
					});

					++d;
					if(d === c){
						process.bot_killer_locked = false;
					}
				}else{

					pool.checkUnCrawled(bot['bucket_links'],function(err,links){
						if(links.length === 0){
							try{
								log.put('no uncrawled pages found, still shutting '+botId, 'success');
								active_childs-=1;
								spawned[botId].kill();
								delete bot_spawn_time[botId];
			 					delete spawned[botId];	//delete from our record	
							}catch(e){

							}							
							++d;
							if(d === c){
								process.bot_killer_locked = false;
							}
						}
						(function(links){
							failed_db.parallelize(function() {
									var done = 0;
									var count = links.length;
									for(var index in links){
										var link = links[index];
										(function(link){
											var failed_info = {};
											failed_info['bucket_id'] = link['bucket_id'];
											failed_info['domain'] = link['domain'];
											failed_db.run("INSERT OR IGNORE INTO q(failed_url,failed_info,status,count) VALUES(?,?,0,0)",[link['_id'],JSON.stringify(failed_info)],function(err,row){
												pool.batchFinished(link['bucket_id'],link['fetch_interval'],function(){

													++done;
													if(done === count){
														++d;
														if(d === c){
															process.bot_killer_locked = false;
														}
														try{
															log.put('uncrawled pages found, and were added to failed_queue - shutting '+botId, 'success');
															active_childs-=1;
															spawned[botId].kill();
															delete bot_spawn_time[botId];
										 					delete spawned[botId];	//delete from our record	
														}catch(e){

														}
													}
											});
											});

										})(link);
									}
							});
						
						})(links);
					});
					
					
				}
				
			}
			else{
				++d;
				if(d === c){
					process.bot_killer_locked = false;
				}
			}
		})(botId);
	}
}


function childFeedback(data){
	/*
		encapsulated function called when worker sends 
		a message to the parent
	*/
	var sender=data["bot"];
	var l=Object.keys(data).join(" ").replace("bot","").trim();
	switch(l){
		case "setCrawled":
			var t=data["setCrawled"];
			//console.log(t)
			pool.setCrawled(t);//mark as crawled
			
			
			break;
		case "addToPool":
			inlinks_pool.push(data["addToPool"]);
			if(inlinks_pool.length>batchSize){
				app.flushInlinks(function(){

				});
			}
			break;
		case "finishedBatch":
			var g=data["finishedBatch"];
			if(g[0].indexOf("failed_queue")>=0){
				break;//ignore
			}
			pool.batchFinished(g[0],g[1]);//set batch finished
			break;
		case "tika":
			var dat=data["tika"];
			console.log(dat)
			try{
				tika.send({"tika":dat})
			}catch(err){

			}
			
			break;
		case "tikaPID":
			process.tikaPID=data["tikaPID"];
			//log the pid so that if bot is started again it can kill a old instance of tika server
			fs.writeFileSync(parent_dir+"/db/sqlite/tikaPID.txt",data["tikaPID"]+"");
			break;
		case "graph":
			var url=data["graph"][0];
			var parent=data["graph"][1];
			graph.insert(url,parent);
			break;

	}
		
}

function startTika(){
	if(config.getConfig("tika")){
			var tika = child.fork(parent_dir+"/tika.js",[]);
			var c=config.getGlobals();
			tika.send({"init":[c[0],c[1],c[2]]});
			spawned["tika"]=tika;
			tika.on('close',function(code){
				if(code!==0){
					setTimeout(startTika,5000);
					log.put("Tika port occupied maybe an instance is already running ","error");

				}
			});
			function tikaPing(){
				if(process.begin_intervals){
					try{
						tika.send({"ping":"ping"});
					}catch(err){
						
					}
				}
				
			}
			var tika_interval =setInterval(tikaPing,5000);	
			process.my_timers.push(tika_interval)
			tika.on("message",childFeedback);
	}
}

if(!process.webappOnly){
	//starting child process for tika


	var a = setInterval(starter,15000);
	var b = setInterval(nextFailedBatch,15000);
	var c1 = setInterval(botKiller,config.getConfig('child_timeout'));
	process.my_timers= process.my_timers.concat([a,b,c1]);
	
}



//starting child process for lucene
/*
var lucene = child.fork(__dirname+"/lucene-indexer.js",[]);
spawned["lucene"]=lucene;
lucene.on('close',function(code){
	if(code!==0){

		log.put("Lucene shut down","error");

	}
});
*/




var app={

	getActiveChilds:function(){
		/*
			Get the number of active childs in the manager
		*/
		return active_childs;
	},
	isManagerLocked:function(){
		/*
			Returns the state of the starter function
		*/
		return process.starter_lock;
	},
	setManagerLocked:function(state){
		/*
			Set the state of the starter function
		*/
		process.starter_lock=state;
	},
	flushInlinks:function(fn){
		/*
			In case of clean up,flushInlinks into the db
		*/
		var k=inlinks_pool.splice(0,batchSize);
		//console.log(k);
		return pool.addToPool(k,fn);

	},
	flushAllInlinks:function(fn){
		return pool.addToPool(inlinks_pool,fn);
	},
	"killWorkers":function(){
		/*
			Kill all the workers before clean up
		*/
		failed_db.serialize(function(){
			failed_db.run("UPDATE q SET status=0 WHERE status=?",[1],function(e,r){
						
			});	
		
		});
		tika_db.serialize(function(){
			tika_db.run("UPDATE q SET status=0 WHERE status=?",[1],function(e,r){
						
			});	
		
		});



		for(var key in spawned){
			spawned[key].kill();//kill the childs before exit
		}
		
	}
};
module.exports=function(pool_obj,botObjs_obj,clstr){
	//constructor
	/*
		pool_obj:     The db pool obj
		botObjs_obj:  Parsed robots.txt data for workers
	*/
	pool=pool_obj;
	graph=graph.init(pool);
	cluster=clstr;
	botObjs=botObjs_obj;
	starter();//start the child_manager main function
	tracker.init(pool,clstr);//starting crawler webapp
	return app;
}