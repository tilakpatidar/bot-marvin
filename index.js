var website=process.argv[2];//dmoz
var domain=process.argv[3];//http://dmoz.org
var regex=process.argv[4];//regex for inlinks
var parser=require("./parsers/"+website);
var cheerio=require("cheerio");
var request=require("request");
var MongoClient = require('mongodb').MongoClient;
//global connection to mongodb
var pool={
	"init":function(fn){
		process.collection.insert({"_id":domain,"done":false},function(err,results){
			console.log("[INFO] Added  "+domain+" to initialize pool");
			fn(results);
			
		});
	},
	"addToPool":function(url){
		process.collection.insert({"_id":url,"done":false,"data":""},function(err,results){
			console.log("[INFO] Discovered "+url);
			
		});
	},
	"getNextBatch":function(result){
		process.collection.find({"done":false},{},{limit:batchSize}).toArray(function(err,docs){
			console.log("[INFO] Got "+docs.length+" for next Batch");
			result(err,docs);

		});
		
	},
	"setCrawled":function(url,data){
		process.collection.updateOne({"_id":url},{"done":true,"data":data},function(err,results){
			console.log("[INFO] Updated "+url);
		});
	},
	"createConnection":function(){
		process.mongo=MongoClient.connect("mongodb://192.168.101.5:27017/dmoz", function(err, db) {
			process.collection=db.collection("test");
			pool.init(function(){
				pool.getNextBatch(function(err,results){
							crawl(results);
				});


			});

		});
	}
};
pool.createConnection();


//console.log(parser.init);
//process and global namespaces
var batchSize=1000;
var done=0;
var queued=0;
var li=[];//url pool
li.push(domain);
function req(url){
			(function(url){
				request(url,function(err,response,html){
					console.log("[INFO] Data fetched  "+url);
					grabInlinks(html,url);
					var dic=parser.init.parse(html);//pluggable parser
					pool.setCrawled(url,dic);
					done+=1;
					if(queued-done>0){
						//means space left 
						/*var url1=li.slice(1);
						if(url1!==undefined){
								li=li.slice(1);
								process.nextTickreq(url1);
						}
						*/
					}
					else{
						//equal hence batch is done
						pool.getNextBatch(function(results){
							crawl(results);
						});
						
					}
				});



			})(url);
			queued+=1;
	
}
function crawl(pools){
	done=0;
	queued=0;
	for (var i = 0; i < batchSize; i++) {
		if(pools!==null && pools[i]!==undefined){
			var url=pools[i]["_id"];
			req(url);
		}
		else{
			break;
		}

	};
	

}
function grabInlinks(html,url){
	if(html){
		var $=cheerio.load(html);
		var a=$("a").each(function(){
			var href=$(this).attr("href");
			if(href!==undefined){
				if(href[0]==="/"){
					//relative link
					pool.addToPool(domain+href);
				}
				else if(href.indexOf(domain)>=0){
					pool.addToPool(href);
				}
			}

		});
		console.log("[INFO] Got "+a.length+"links from "+url)
	}

}


