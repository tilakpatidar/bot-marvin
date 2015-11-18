//sys argv
var argv = require('minimist')(process.argv.slice(2));
var config=require("./config/config").load();
var regex_urlfilter=require("./regex-urlfilter.js").load();
var db_type=config["db_type"];
var help=argv["help"];
if(help){
	require('./docs/help');
}
var collection;
var childs=parseInt(config["childs"]);//childs to spawn
var batchSize=parseInt(config["batch_size"]);
process.active_childs=0;

//requires
var tracker=require("./server");
var child=require('child_process');
var pool=require('./pool');

function starter(){
	console.log("[INFO] Check if new child available");
	console.log("[INFO] Current active childs "+process.active_childs);
	var counter=0;
	var done=childs-process.active_childs;
	if(done===0){
		setTimeout(starter,5000);
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
					setTimeout(starter,5000);
				}
					
					
				},batchSize);
		}
}


pool=pool.getDB(db_type).init();//choosing db type
var inlinks_pool=[];
var seed_links=pool.readSeedFile();//read the seed file
function createChild(results,hash){
	process.active_childs+=1;
	var bot = child.fork("spawn.js",[]);	
	console.log('[INFO] Child process started ');
	var args=[results,batchSize,pool.links,botObjs,hash];
	bot.send({"init":args});
	bot.on('close', function (code) {
				//pushing the pool to db
				var k=inlinks_pool.splice(0,batchSize);
				pool.addToPool(k);
		
	

	  console.log('[INFO] Child process exited with code ' + code);
	  process.active_childs-=1;
	  starter();
							
	  
	});

	bot.on("message",function(data){
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

	});

}



function initConnection(){
	pool.createConnection(function(){
		pool.seed(seed_links,starter);

	});

}
var botObjs;
if(config["allow_robots"]){
	console.log("[INFO] downloading robots.txt this could take a while");
	var robots=require('./robots.js').app;
	robots.init(Object.keys(pool.links),function(obj){
		console.log("[INFO] robots.txt parsed");
		botObjs=obj;
		initConnection();
		setTimeout(starter,5000);
	});
}
else{
	initConnection();
	setTimeout(starter,5000);
}



tracker.init(pool);//starting crawler webapp



