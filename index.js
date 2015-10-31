//sys argv
var argv = require('minimist')(process.argv.slice(2));
var config=require("./config/config").load();
var db_type=config["db_type"];
var help=argv["help"];
if(help){
	require('./docs/help');
}
var collection;
var childs=parseInt(config["childs"]);//childs to spawn
var batchSize=parseInt(config["batch_size"]);
var active_childs=0;

//requires
var tracker=require("./server");
var child=require('child_process');
var pool=require('./pool');

function starter(){
	console.log("[INFO] Check if new child available");
	for (var i = active_childs; i < childs; i++) {
		  pool.getNextBatch(function(err,results){
				if(results.length!==0){
					createChild(results);
				}
					
					
				},batchSize);
		}
}
setInterval(starter,5000);

pool=pool.getDB(db_type).init();//choosing db type
var inlinks_pool=[];
function createChild(results){
	active_childs+=1;
	var bot = child.fork("spawn.js",[]);	
	console.log('[INFO] Child process started ');
	var args=[results,batchSize,pool.links];
	bot.send({"init":args});
	bot.on('close', function (code) {
		if(inlinks_pool.length%batchSize===0){
			//push whatever you have in buffer
			var k=inlinks_pool.splice(0,batchSize);
			pool.addToPool(k);
		}
		

	  console.log('[INFO] Child process exited with code ' + code);
	  active_childs-=1;
	  for (var i = active_childs; i < childs; i++) {
		  pool.getNextBatch(function(err,results){
				if(results.length!==0){
					createChild(results);
				}
					
					
				},batchSize);
		}
							
	  
	});

	bot.on("message",function(data){
		var t=data["setCrawled"];
		var d=data["addToPool"];
		if(t){
			pool.setCrawled(t[0],t[1]);
		}
		else if(d){
			if(inlinks_pool.length%batchSize!==0){
				inlinks_pool.push(d);
			}
			else{
				var k=inlinks_pool.splice(0,batchSize);
				pool.addToPool(k);

			}
			
		}

	});

}

pool.createConnection(function(){
	pool.init(function(){
		for (var i = 0; i < childs; i++) {
			pool.getNextBatch(function(err,results){
				if(results.length!==0){
					createChild(results);
				}
				
				
								
			},batchSize);
		}

	});

});
tracker.init(pool);//starting crawler webapp


