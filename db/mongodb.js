//global connection to mongodb
//mongodb connection file
var MongoClient = require('mongodb').MongoClient;
var temp=__dirname.split("/");
temp.pop();
var parent_dir=temp.join("/");
var log=require(parent_dir+"/lib/logger.js");
var config=require(parent_dir+'/config/config.js').load();
var mongodb=config["mongodb"]["mongodb_uri"];
var collection=config["mongodb"]["mongodb_collection"];
var collection1=config["mongodb"]["bucket_collection"];
//read seed file


var pool={
	"seed":function(links,fn){
		pool.resetBuckets(function(){
			var stamp1=new Date().getTime()-2000;//giving less time
			var stamp=stamp1+""+parseInt(Math.random()*10000);
			process.collection1.insert({"_id":stamp,"underProcess":false,"bot":config["bot_name"],"recrawlAt":stamp1},function(err,results){
				var done=0;
				for (var i = 0; i < links.length; i++) {
					var anon=(function(domain,stamp,url){
						if(domain===""){
							return;
						}
						if(url===undefined){
							//not counter links
							url=domain;
						}
						process.collection.insert({"_id":url,"hash":stamp,"domain":domain,"done":false},function(err,results){
							if(err){
							log.put("pool.init maybe seed is already added","error");
							}
								log.put(("Added  "+domain+" to initialize pool"),"success");
								done+=1;
								if(done===links.length-1){
									fn(results);
								}
								
					
						});

					});
					
					anon(links[i].split('\t')[0],stamp);
					
					
				};
				
				
			});



		});

		
	},
	"addToPool":function(li){
		//urls we will be getting will be absolute
		
		pool.addLinksToDB(li,function(hash){
			pool.generatePool(function(){
					var stamp1=new Date().getTime();
					process.collection1.insert({"_id":hash,"underProcess":false,"bot":config["bot_name"],"recrawlAt":stamp1},function(err,results){
						if(err){

							log.put(("pool.addToPool"+err),"error");
						}
						else{
							log.put(("Updated bucket "+hash),"success");
						}
											
											
					});
			});
		});
		
			
	

		
	},
	"getNextBatch":function(result,batchSize){
		var stamp1=new Date().getTime();
		process.collection1.findAndModify({"underProcess":false,"recrawlAt":{$lte:stamp1}},[],{"$set":{"underProcess":true,"bot":config["bot_name"]}},{"remove":false},function(err,object){
			if(object.value!==null){
					var hash=object["value"]["_id"];
					//console.log(hash);
					process.collection.find({"hash":hash},{},{}).toArray(function(err,docs){
						if(err){

							log.pu("pool.getNextBatch","error");
						}
						else{
							//console.log(docs);
							log.put(("Got "+docs.length+" for next Batch"),"success");
							result(err,docs,hash);		
						}


					});
			}
			else{
					result(null,[],null);	
				}
				

		});
			
		
		
	},
	"setCrawled":function(url,data,status){
		var stamp1=new Date().getTime();
		if(data===undefined || data ===null){
			data="";
		}
		if(status===undefined){
			status="0";//no error
		}
		process.collection.updateOne({"_id":url},{$set:{"done":true,"data":data,"response":status,"lastModified":stamp1}},function(err,results){
			if(err){
				log.put("pool.setCrawled","error");
			}
			else{
				log.put(("Updated "+url),"success");
			}
			
		});
	},
	"crawlStats":function(fn){
		process.collection.find({"done":false}).count(function(err,count){
					process.collection.find({"done":true}).count(function(err1,count1){
						process.collection1.count(function(err,count2){
							fn(count,count1,count2);

						});
						

					});

		});
	},
	"createConnection":function(fn){
		process.mongo=MongoClient.connect(mongodb, function(err, db) {
			process.db=db;
			process.collection=db.collection(collection);
			process.collection1=db.collection(collection1);

			fn(err,db);

		});
	},
	close:function(){
		process.db.close();
	},
	"readSeedFile":function(){
		var fs  = require("fs");
		var dic={};
		var links=[];
		links=fs.readFileSync(parent_dir+"/seed").toString().replace(/\n{2,}/gi,"\n").replace(/^\n/gi,"").split('\n');
			//parsing seed file
			if(links[0]!==""){
				//not if file is empty
				for (var i = 0; i < links.length; i++) {
					var k=links[i].split("\t");
					dic[k[0]]={"phantomjs":JSON.parse(k[2]),"parseFile":k[1]};
				};
			}
			else{
				log.put("Empty seed file","error");
				process.exit(0);
			}
		pool["links"]=dic;
		pool["seedCount"]=links.length;
		return links;
	},
	"batchFinished":function(hash){
		var stamp1=new Date().getTime()+config["recrawl_interval"];
		var lm=new Date().getTime();
		process.collection1.findAndModify({"_id":hash},[],{$set:{"underProcess":false,"recrawlAt":stamp1,"lastModified":lm}},{"remove":false},function(err,object){
			if(object.value!==null){
					var hash=object["value"]["_id"];
					log.put(("Bucket "+hash+"completed !"),"success");
			}
			
				

		});
	},
	"resetBuckets":function(fn){
		var stamp1=new Date().getTime()-2000;//giving less time
		process.collection1.update({"underProcess":true,"bot":config["bot_name"]},{$set:{"underProcess":false,"recrawlAt":stamp1}},{multi:true},function(err,results){
		//resetting just buckets processed by this bot
		
			if(err){
				log.put("pool.resetBuckets","error");
			}
			else{
				log.put("pool.resetBuckets","success");
				fn();
			}
			
		});

	},
	"addLinksToDB":function(li,fn){
		var stamp=new Date().getTime()+""+parseInt(Math.random()*10000);
		var done=0;
		for (var i = 0; i < li.length; i++) {
			var key=li[i][1];
			var item=li[i][0];
			(function(url,domain,hash){
				process.collection.insert({"_id":url,"done":false,"domain":domain,"data":"","hash":hash},function(err,results){
						if(err){

							//console.log("pool.addToPool");
						}
						else{
							//console.log("Discovered "+url);
							if(pool.cache[domain]){
								pool.cache[domain].push(url);
							}
							else{
								pool.cache[domain]=[];
								pool.cache[domain].push(url);
							}
						}
						done+=1;
						if(done===li.length-1){
							fn(stamp);
						}				
				});
			})(item,key,stamp);


			
		};
		
	},
	"generatePool":function(fn){
		var re=[];
		var n_domains=Object.keys(pool.cache).length;
		var eachh=config["batch_size"]/n_domains;
		for (var key in pool.cache) {
			var l=pool.cache[key].splice(0,eachh);
			for (var i = 0; i < l.length; i++) {
				var url=l[i];
				re.push([url,key]);
			};
		};
		fn(re);

	},
	"drop":function(fn){
		process.db.dropDatabase();
		fn();
	},
	"seedCount":0,
	"cache":{}
};


function init(){
	return pool;
}
exports.init=init;