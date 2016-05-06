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
var first_time=true;
process.starter_lock=false;
process.begin_intervals=true;
var pool;//global db object in the entire app
var spawned={};
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
		
function createChild(bucket_links,hash,refresh_label){
	if(first_time){
		process.bucket_creater_locked=false;
		first_time=false;
		//will unlock the bucker_creator for first time
	}
	
	var botId=new Date().getTime()+""+parseInt(Math.random()*10000);//generate a random bot id
	var bot = child.fork(parent_dir+"/spawn.js",[]);	
	spawned[botId]=bot;//saving child process for killing later in case of cleanup
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
		  active_childs-=1;
		 delete spawned[botId];	//delete from our record	
	  
	});

	bot.on("message",childFeedback);

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
if(!process.webappOnly){
	//starting child process for tika
	if(config.getConfig("tika")){
			var tika = child.fork(parent_dir+"/tika.js",[]);
			var c=config.getGlobals();
			tika.send({"init":[c[0],c[1],c[2]]});
			spawned["tika"]=tika;
			tika.on('close',function(code){
				if(code!==0){

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
			setInterval(tikaPing,5000);	
			tika.on("message",childFeedback);
	}

	setInterval(starter,15000);
	
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