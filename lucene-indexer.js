var proto=require(__dirname+'/lib/proto.js');
process.getAbsolutePath=proto.getAbsolutePath;
var exec = require('child_process').exec;
var fs = require('fs');
var request = require('request');
var log=require(__dirname+"/lib/logger.js");
var config=require(__dirname+"/lib/config-reloader.js");
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database(__dirname+'/db/sqlite/lucene_queue');
db.serialize(function() {
	db.run("CREATE TABLE IF NOT EXISTS pages (id INTEGER PRIMARY KEY AUTOINCREMENT,url TEXT UNIQUE,data_json TEXT,status INTEGER)");
});
var queue={
	enqueue:function (url,data_json,fn){
		db.parallelize(function() {
			db.run("INSERT INTO pages(url,data_json,status) VALUES(?,?,0)",[url,JSON.stringify(data_json)],function(err,row){
				//console.log(this);
				//console.log(JSON.stringify(row)+"pushQ");
				fn(row);
			});
		});

	},
	dequeue:function (fn,num){

		if(num===undefined){
			num=1;
		}
		//console.log("NUM "+num);
		var li=[];
		var done=0;
			db.parallelize(function() {
				db.all("SELECT * FROM pages WHERE status=0 LIMIT 0,"+num,function(err,rows){
					//console.log(rows)
					num=rows.length;
					var mask=[];
					var values=[];
					if(rows.length===0){
						fn([]);
					}
					for (var i = 0; i < rows.length; i++) {
						var row=rows[i];
						mask.push("?");
						values.push(row.id);
						li.push({url:row.url,data_json:row.data_json,uid:row.id});

					};
					mask="("+mask.join(",")+")";
					//console.log("UPDATE pages SET status=1 WHERE id IN "+mask);
					db.run("UPDATE pages SET status=1 WHERE id IN "+mask,values,function(e,r){
							//console.log(this);
							//console.log(e);
							//console.log("SONE DONE");
							fn(li);
					});//mark as under process
					//console.log(row);

					
					
				});
			});
		
		

	},
	remove:function (idd,mask,fn){
		db.parallelize(function() {
			db.run("DELETE FROM pages WHERE id IN "+mask,idd,function(err,row){
			//console.log(this);					//console.log(err,"Qerr");
					//console.log(JSON.stringify(row)+"QLength");
					fn(err,row);
				});
			});
	},
	length:function (fn){
		db.parallelize(function() {
			db.each("SELECT COUNT(*) AS `c` FROM pages WHERE status=0",function(err,row){
				//console.log(err+"QLength");
				//console.log(JSON.stringify(row)+"QLength");
				fn(row.c);
			});
		});
	}

}




var app={
	"startServer":function(){
		var path=__dirname+"/lib";
		exec('bash run.sh',{cwd:path},function(error, stdout, stderr) {
			log.put("[SUCCESS] Lucene server started","success");
		    if (error !== null) {
		        log.put('[INFO] Lucene Server is already running',"error");
		    }
		});
	},
	"processNext":function(){
		if(busy){
			return;
		}
		busy=true;

			
					queue.dequeue(function(li){
						var counter=0;
						var done_counter=li.length;
						if(li.length===0){
							busy=false;
							setImmediate(function(){lucene.processNext();});
						}
						for (var i=0;i<li.length;i++) {
							var obj=li[i];
							//console.log("here");
								(function(url,data_json,uniqueId){
									try{
										//console.log(url,uniqueId);
											data_json=JSON.parse(data_json);
											data_json["url"]=url;

											request({ url:"http://localhost:9200/bot_marvin/docs", method: 'PUT', json:data_json},function(err,responseHttp,body){
												console.log(err.responseHttp,body);
												if(err){
													log.put("Error in post /index Lucene","error");
												}
												else{
													log.put("Indexed "+url,"success");
												}
											})
									}
									catch(err){
										log.put("error from Lucene for "+url,"error");
										
									}
									finally{
										queue.remove([uniqueId],"(?)",function(err,row){
											//console.log(err,row);
										});
										counter+=1;
										if(counter===done_counter){
											//console.log("COUNTER "+counter+" "+done_counter);
											busy=false;
											setImmediate(function(){lucene.processNext();});
										}
										
											
									
									}


								})(obj.url,obj.data_json,obj.uid);
						};
					
						
						


				},config.getConfig("lucene_batch_size"));//[[],[]]

		
		
		
		
	}

};
exports.init=app;
var busy=false;
if(require.main === module){
	var lucene=app;
	lucene.startServer();
	process.on("message",function(d){
			queue.enqueue(d["url"],d["data_json"],function(row){
		        	//console.log("PUSHED");
		        	log.put("Lucene Got request for "+d["url"],"info");
		        	lucene.processNext();
			        
	        });	


	});

         
}

