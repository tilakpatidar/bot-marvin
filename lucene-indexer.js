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
		db.serialize(function() {
			db.run("INSERT INTO pages(url,data_json,status) VALUES(?,?,0)",[url,JSON.stringify(data_json)],function(err,row){
				console.log(err+"pushQ");
				//console.log(JSON.stringify(row)+"pushQ");
				fn(row);
			});
		});

	},
	dequeue:function (fn,num){

		if(num===undefined){
			num=1;
		}
		console.log("NUM "+num);
		var li=[];
		var done=0;
			db.serialize(function() {
				db.all("SELECT * FROM pages WHERE status=0 LIMIT 0,"+num,function(err,rows){
					num=rows.length;
					var mask=[];
					var values=[];
					for (var i = 0; i < rows.length; i++) {
						var row=rows[i];
						mask.push("?");
						values.push(row.id);
						li.push({url:row.url,data_json:row.data_json,uid:row.id});

					};
					mask="("+mask.join(",")+")";

					db.run("UPDATE pages SET status=1 WHERE id IN "+mask,values,function(e,r){
							//console.log(e);
							//console.log("SONE DONE");
							fn(li);
					});//mark as under process
					//console.log(row);

					
					
				});
			});
		
		

	},
	remove:function (idd,mask,fn){
		db.serialize(function() {
			db.run("DELETE FROM pages WHERE id IN "+mask,idd,function(err,row){
					console.log(err+"Qerr");
					//console.log(JSON.stringify(row)+"QLength");
					fn(err,row);
				});
			});
	},
	length:function (fn){
		db.serialize(function() {
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
		console.log("FUCKER  FUCKER "+active);
		if(active>=config.getConfig('lucene_batch_size')){
			return;//if greater than batch size leave
		}
		var expected=(config.getConfig('lucene_batch_size')-active);
			active+=(expected);//mark active before even initializing
			queue.length(function(len){
			console.log(len+"LENGTH");
			if(len!==0){
					console.log("expected "+expected);
					queue.dequeue(function(li){
						console.log("dequeue");
						if(li.length!==expected){
							active-=(expected-li.length);//reducing if less items are recieved
						}
						for (var i = li.length - 1; i >= 0; i--) {
							var obj=li[i];
							//console.log("here");
								(function(url,data_json,uniqueId){
									try{
										//console.log(url,uniqueId);
											data_json=JSON.parse(data_json);
											data_json["url"]=url;
											var list=config.getConfig("lucene_indexed_fields_use_analyzers");
											list="_source#dot#"+list.join(",_source#dot#");
											data_json["indexed_fields"]=list;
											var l=[]
											l.push(data_json);

											//console.log(l,typeof l[0]);
											request.post("http://localhost:8000/index",{form:JSON.stringify(l)},function(err,responseHttp,body){
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
										active-=1;
										console.log("reducing "+active);
										queue.remove([uniqueId],"(?)",function(err,row){
										//	console.log(row);
										});
											
									
										setImmediate(function(){
											lucene.processNext();
										});	
									}


								})(obj.url,obj.data_json,obj.uid);
						};
					
						
						


				},expected);//[[],[]]

				
				
					
			}
			else{
				//if len is 0 then decrement the active counter
				active-=(expected);
				console.log("Active new "+active);
			}
			});
		
		
		
	},
	"getFileName":function(url){
		return __dirname+"/pdf-store/"+url.replace(/\//gi,"##");
	}

};
exports.init=app;
var active=0;
if(require.main === module){
	var lucene=app;
	lucene.startServer();
	process.on("message",function(d){
		(function(d){
		setTimeout(function(){
			
				 queue.enqueue(d["url"],d["data_json"],function(row){
		        	//console.log(fileName+"PUSHED");
		        	log.put("Lucene Got request for "+d["url"],"info");
			        lucene.processNext();
			        
		        });
			

		},5000);
		})(d);
	});
       
         
}
