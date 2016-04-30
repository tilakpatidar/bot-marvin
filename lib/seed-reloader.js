
/*

	seed.json will have .
	db copy of seed will have .=> #dot#

*/


var fs=require("fs");
var path = require('path');
var parent_dir=process.getAbsolutePath(__dirname);
var config=process.bot_config;
var seed={};
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
	pool.pullSeedLinks(function(err,results){
		//console.log(err,results)
		results=JSON.parse(JSON.stringify(results).replace(/#dot#/gi,"."));
		return fn(err,results);
	});

	};

function seedReloader(){
		pullDbSeed(function(new_seed){
			if(check.assigned(new_seed)){
				//console.log(new_seed);
				//console.log(JSON.parse(JSONX.stringify(gc())));
				if(!ObjectX.isEquivalent(new_seed,seed)){
					log.put("Seed File changed from db ","info");
					//if local and db copy unmatches
					//means seed has been changed from db
					uls(JSONX.parse(JSON.stringify(new_seed)));
				}
				else{
					log.put("No change in seed","info");
				}
			}
		});
	};
process.seed_check_mode=setInterval(function(){
	if(process.MODE==='exec'){
		var b=setInterval(function(){
			if(process.begin_intervals){
				seedReloader();
			}

		},10000);
		process.my_timers.push(b);
		clearInterval(process.seed_check_mode);//once intervals are set clear the main interval
	}
},5000);
exports.getSeed=gs;
exports.updateLocalSeed=uls;
exports.setDB=function(p,fn){
	pool=p;
	return fn();
}
exports.pullSeedFromDB=function(fn){
	pullDbSeed(function(err,results){
		return fn(err,results);
	});
}
exports.pull=function(fn){
	pullDbSeed(function(err,results){
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
}