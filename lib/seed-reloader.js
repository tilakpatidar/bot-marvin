
/*

	seed.json will have .
	db copy of seed will have .=> #dot#

*/


var fs=require("fs");
var path = require('path');
var parent_dir=process.getAbsolutePath(__dirname);
var config=process.bot_config;
var seed={};
var _=require("underscore");
var proto=require(parent_dir+'/lib/proto.js');
var JSONX=proto.JSONX;
var ObjectX=proto.ObjectX;
var pool;
var check=require("check-types");
var log=require(parent_dir+"/lib/logger1.js");
function gs(){
	var val=seed;
	if(!check.assigned(arguments[0])){
		return seed;
	}
	else{
		return seed[arguments[0]];
	}
	return val;
};

function uls(dic){
	//updates local copy of the seed file
	fs.writeFileSync(parent_dir+"/config/seed.json",JSON.stringify(dic,null,2));
	//console.log("RESTSRT")
	process.emit("restart");//will be caught by death and it will cause to restart
	
};

function pullDbSeed(fn){
	pool.pullSeedLinks(function pullDbSeed_pullSeedLinks(err,results){
		//console.log(err,results)
		results=JSON.parse(JSON.stringify(results).replace(/#dot#/gi,"."));
		return fn(err,results);
	});

	};

function seedReloader(){
		pullDbSeed(function seedReloader(new_seed){
			if(check.assigned(new_seed)){
				//console.log(new_seed);
				//console.log(JSON.parse(JSONX.stringify(gc())));
				if(!ObjectX.isEquivalent(new_seed,seed)){
					msg("Seed File changed from db ","info");
					//if local and db copy unmatches
					//means seed has been changed from db
					uls(JSONX.parse(JSON.stringify(new_seed)));
				}
				else{
					msg("No change in seed","info");
				}
			}
		});
	};
process.seed_check_mode=setInterval(function(){
	
		var b=setInterval(function(){
			if(process.begin_intervals){
				seedReloader();
			}

		},10000);
		process.my_timers.push(b);
		clearInterval(process.seed_check_mode);//once intervals are set clear the main interval
	
},5000);
exports.getSeed=gs;
exports.updateLocalSeed=uls;
exports.setDB=function setDB(p,fn){
	pool=p;
	return fn();
}
exports.pullSeedFromDB=function pullSeedFromDB(fn){
	pullDbSeed(function(err,results){
		return fn(err,results);
	});
}

exports.removeSeed = function removeSeed(host){
	pool.removeSeed(host, function(err, docs){
		process.emit("stop_bot_and_exit");
	});
}

function insertSeed(url,parseFile,phantomjs,priority,fetch_interval,fn){
			if(!check.assigned(fn)){
				fn=function(){}
			}
			if(_.size(arguments)<5){
				throw new SyntaxError("atleast 5 args expected");
				return fn(false);
			}
			url=url.replace("https://","http://");
			
					pool.insertSeed(url,parseFile,phantomjs,priority,fetch_interval,function(inserted){
					
						if(inserted){
							return fn(true);
						}
						else{
							return fn(false);
						}
					});
				



}

var seedFile = function seedFile(path, seed_data, fn){
	//will seed the bot and exit gracefully
	//console.log(path);
	//console.log(arguments)
	pool.checkIfNewCrawl(function(newCrawl){
		//check if crawl is fresh or old
		//if new crawl it updates cluster info
	var json;
	if(check.assigned(path)){
		//data is not provided
			check.assert.assigned(path,"file path cannot be undefined")
			// \n$ to remove extra \n at end
			var data=fs.readFileSync(path).toString().replace(/\t{2,}/gi,"\t").replace(/\n{2,}/gi,"\n").replace(/\n$/gi,"");
			json=JSON.parse(data);
	}else{
		//data is provided
			json=seed_data;
	}
		
			var done=0;
			var limit=_.size(json);
			var parsers={};
			//backup old seed collection
			pool.moveSeedCollection(function(){
				try{
					if(limit === 0){
						//empty obj means just clear the seed file
						return pool.successSeedCollection(function(){
							fn();
						});
					}
					for(var keys in json){
						var obj=json[keys];
						(function(a,b,c,dd,ee){
							parsers[b]=true;
							insertSeed(a,b,c,dd,ee,function insertSeed(status){
								if(status){
								}
								else{
									msg("Failed to seed url "+a,"error");
								}
								done+=1;
								if(done===limit){	
									var size=_.size(parsers);
									var counter=0;
									for(var parser_keys in parsers){
										(function(parseFile){
											pool.insertParseFile(parseFile,function(parseFileUpdated){
													
													++counter;
													if(counter===size){
														//drop tmp seed collections
														pool.successSeedCollection(function(){
															if(!check.assigned(fn)){
																process.emit("stop_bot_and_exit");
															}else{
																fn();
															}
														});
														
														
														return;
													}
													
											});

										})(parser_keys);
										
									}
									
									
								}
							});
						})(obj["_id"],obj["parseFile"],obj["phantomjs"],obj["priority"],obj["fetch_interval"]);
					}
				}catch(err){
					//restore from old collection
					console.log(err);
					pool.restoreSeedCollection(function restoreSeedCollection(){
						msg("Exception occured while updating seed file","error");
						msg("Restoring old seed file","info");
					});
				}


			});


	
	
	});		
}

exports.seedFile = seedFile;
if(process.env.EDITOR===undefined){
	process.env.EDITOR="/bin/nano";
}
var edit = require('string-editor');
exports.editSeedFile = function editSeedFile(fn){
	pullDbSeed(function editSeedFile_pullDbSeed(err,results){
			if(err || (!check.assigned(err) && !check.assigned(results))){
				var execSeedFile = false;
				edit("[]","seed.json", function edit1(err, result) {
					// when you are done editing result will contain the string 
					console.log("Updating seed please wait!");
					//console.log(result)
					try{
						var seed_data = JSON.parse(result);
						execSeedFile = true;
					}catch(err){
						result = result.replace(/\s/gi,'');
						if(result === "" || result === "{}" || result === "[]"){
							seed_data = {};
						}else{
							msg("JSON format error","error");
							process.bot.stopBot(function(){
									process.exit(0);
									fn()
								});	
						}
					}
					if(execSeedFile){
						seedFile(null, seed_data, function(){
							console.log("Seed updated [SUCCESS]");
							process.bot.stopBot(function(){
								process.exit(0);
								fn()
							});

						});						
					}
						
				});
			}else{
				var con=results;
				var execSeedFile = false;
				edit(JSON.stringify(con,null,2),"seed.json", function edit(err, result) {
					// when you are done editing result will contain the string 
					console.log("Updating seed please wait!");
					try{
						var seed_data = JSON.parse(result);
						execSeedFile = true;
					}catch(err){
						result = result.replace(/\s/gi,'');
						if(result === "" || result === "{}" || result === "[]"){
							seed_data = {};
						}else{
							msg("JSON format error","error");
							process.bot.stopBot(function(){
									process.exit(0);
									fn()
								});	
						}
					}
					if(execSeedFile){
						seedFile(null, seed_data, function(){
							console.log("Seed updated [SUCCESS]");
							process.bot.stopBot(function(){
								process.exit(0);
								fn()
							});

						});						
					}

						
				});
			}

		});
		
		
}

exports.pull=function pull(fn){
	pullDbSeed(function pullDbSeed(err,results){
		//console.log(err,results)
		if(err || (!check.assigned(err) && !check.assigned(results))){
			console.log("You have to seed the crawler.\nUse bot-marvin --loadSeedFile <file_path>")
			console.log("Or use bot-marvin --editSeedFile to edit seed file here.");
			process.bot.stopBot(function(){
				process.exit(0);
				return fn();
			})
		}else{
			seed=results;
			return fn();
		}
	})
};
function msg(){log.put(arguments[0],arguments[1],__filename.split('/').pop(), arguments.callee.caller.name.toString());}
