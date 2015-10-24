//sys argv

var argv = require('minimist')(process.argv.slice(2));
var website=argv["website"];
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
var config=require("./config").load();
var pool=require('./pool');



pool=pool.getDB(db_type).init();//choosing db type

function createChild(results){
	active_childs+=1;
	var bot = child.fork("spawn.js", [JSON.stringify(results),batchSize,website,domain]);	
	console.log('[INFO] Child process started ');

	bot.on('close', function (code) {
	  console.log('[INFO] Child process exited with code ' + code);
	  active_childs-=1;
	  pool.getNextBatch(function(err,results){
			for (var i = active_childs; i < childs; i++) {
				createChild(results);
				
			};
							
	  },batchSize);
	});

	bot.on("message",function(data){
		var t=data["setCrawled"];
		var d=data["addToPool"];
		if(t){
			pool.setCrawled(t[0],t[1]);
		}
		else if(d){
			pool.addToPool(d);
		}

	});

}

pool.createConnection(function(){
	pool.init(function(){
		pool.getNextBatch(function(err,results){
			for (var i = 0; i < childs; i++) {
				createChild(results);
			};
							
		},batchSize);


	},domain);

});
tracker.init(pool);//starting crawler webapp


