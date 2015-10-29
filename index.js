//sys argv

var argv = require('minimist')(process.argv.slice(2));
var parseFile=argv["parseFile"];
var domain=argv["domain"];//http://dmoz.org
var regex=argv["regex"];//regex for inlinks
var db_type=argv["dbtype"];
var help=argv["help"];
if(help){
	require('./docs/help');
}
var collection;
var childs=parseInt(argv["childs"]);//childs to spawn
var batchSize=parseInt(argv["batchSize"]);
var active_childs=0;

//requires
var tracker=require("./server");
var child=require('child_process');
var config=require("./config/config").load();
var pool=require('./pool');

function starter(){
	for (var i = active_childs; i < childs; i++) {
		  pool.getNextBatch(function(err,results){
				if(results.length!==0){
					createChild(results);
				}
					
					
				},batchSize);
		}
}
setInterval(starter,2000);

pool=pool.getDB(db_type).init();//choosing db type

function createChild(results){
	active_childs+=1;
	var bot = child.fork("spawn.js", [JSON.stringify(results),batchSize,parseFile,domain]);	
	console.log('[INFO] Child process started ');

	bot.on('close', function (code) {
		if(inlinks_pool.length!==0){
			//push whatever you have in buffer
			var k=inlinks_pool;
			inlinks_pool=[];
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
var inlinks_pool=[];
	bot.on("message",function(data){
		var t=data["setCrawled"];
		var d=data["addToPool"];
		if(t){
			pool.setCrawled(t[0],t[1]);
		}
		else if(d){
			if(inlinks_pool.length<=batchSize){
				inlinks_pool.push(d);
			}
			else{
				var k=inlinks_pool;
				inlinks_pool=[];
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

	},domain);

});
tracker.init(pool);//starting crawler webapp


