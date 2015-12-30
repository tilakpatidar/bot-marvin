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
var config=require(__dirname+"/lib/config-reloader.js");
var log=require(__dirname+"/lib/logger.js");
var childs=config.getConfig("childs");//childs to spawn
var batchSize=config.getConfig("batch_size");
var active_childs=0;
var cluster;
var starter_lock=false;
var counter=0;
var done=0;
var botObjs={};//stores the robots.txt data
var tracker=require(__dirname+"/server.js");
var child=require('child_process');
var inlinks_pool=[];
var pool;//global db object in the entire app
var spawned={};
function starter(){
	/*
		encapsulated function responsible for allocating vacant childs 
		This function is run continously in an interval to check and 
		realocate workers.
	*/
	if(starter_lock){
		//returns from here if old instance of the starter is not finishe
		log.put("Starter is locked ",'info');
		return;
	}
	else{
		log.put('lock release ','info');
		//lock starter for this instance
		starter_lock=true;	
	}
	
	log.put("Check if new child available","info");
	log.put(("Current active childs "+active_childs),"info");
	counter=0;
	done=childs-active_childs;
	if(done===0){
		return;//no available childs
	}
		  
	nextBatch();//call nextBatch to obtain a new bucket and start a worker
};//end of starter

function nextBatch(){
	/*
		encapsulated function which checks for an available 
		bucket and starts a new worker
	*/
		pool.getNextBatch(function(err,results,hash){
		  		
				if(results.length!==0 && hash!==null){
					//if bucket is not empty 
					log.put("Got bucket "+hash,"info");
					createChild(results,hash);
				}
				else{
					//inlinks_pool into db as childs are available but no buckets
					app.flushInlinks(function(){});
				}
				counter+=1;
				if(counter===done){
					//unlock starter now as this instance of starter is done
					starter_lock=false;
					return;
				}
				else{
					process.nextTick(function(){nextBatch();});//recursive execution
				}
					
					
				},batchSize);
	}
		
function createChild(bucket_links,hash){
	active_childs+=1;
	var botId=new Date().getTime()+""+parseInt(Math.random()*10000);//generate a random bot id
	var bot = child.fork(__dirname+"/spawn.js",[]);	
	spawned[botId]=bot;//saving child process for killing later in case of cleanup
	log.put('Child process started '+botId,"success");
	var args=[bucket_links,batchSize,pool.links,botObjs,hash];
	//not sending args with child process as char length limitation on bash

	//bot waits for this "init" msg which assigns the details of the task
	bot.send({"init":args});
	

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
			pool.setCrawled(t[0],t[1],t[2]);//mark as crawled
			break;
		case "addToPool":
			inlinks_pool.push(data["addToPool"]);
			if(inlinks_pool.length>batchSize){
				app.flushInlinks(function(){});
			}
			break;
		case "finishedBatch":
			var g=data["finishedBatch"];
			pool.batchFinished(g);//set batch finished
			break;
	}
		
}

//starting child process for tika
var tika = child.fork(__dirname+"/tika.js",[]);
spawned["tika"]=tika;
tika.on('close',function(code){
	if(code!==0){

		log.put("Tika port occupied maybe an instance is already running ","error");

	}
});

setInterval(starter,15000);


tika.on("message",childFeedback);
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
		return starter_lock;
	},
	setManagerLocked:function(state){
		/*
			Set the state of the starter function
		*/
		starter_lock=state;
	},
	flushInlinks:function(fn){
		/*
			In case of clean up,flushInlinks into the db
		*/
		var k=inlinks_pool.splice(0,batchSize);
		pool.addToPool(k,fn);

	},
	flushAllInlinks:function(fn){
		pool.addToPool(inlinks_pool,fn);
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
	cluster=clstr;
	botObjs=botObjs_obj;
	starter();//start the child_manager main function
	tracker.init(pool,clstr);//starting crawler webapp
	return app;
}