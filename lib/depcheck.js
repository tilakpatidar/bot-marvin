var fs=require("fs");
var proto=require(__dirname+"/proto.js");
var parent_dir=proto.getAbsolutePath(__dirname);
var check=require("check-types");
function validate(){

	//check tika server jar installed

	var crypto = require('crypto');
	try{
		var data=fs.readFileSync(__dirname+"/tika-server-1.11.jar");
	}catch(err){
		console.log("Tika server not found please run\n bot-marvin-init");
		process.exit(0);
	}
	
	var md5sum = crypto.createHash('md5');
	md5sum.update(data);
	var hash=md5sum.digest('hex');
	if(hash!=="7e28f3288c3bcd0c26ac6f557ddfb977"){
		console.log("Tika server not found please run\n bot-marvin-init");
		process.exit(0);
	}

	//touch pid file
	function touchActivePidFile(){
		var stream=fs.createWriteStream(parent_dir+"/db/sqlite/active_pids.txt");
			stream.write(JSON.stringify({},null,2));
			stream.end();
			stream.on('finish',function(){
				process.exit(0)
			});
	}

	//check if db config set
	function touchDbConfigFile(){
		try{
			var stream=fs.createWriteStream(parent_dir+"/config/db_config.json");
			stream.write(JSON.stringify({},null,2));
			stream.end();
			stream.on('finish',function(){
				process.exit(0)
			});
			
		}catch(ee){
			//error in creating config file
			console.log(ee)
			//console.log(ee,"s")
		}
	}
	try{
		var string_data = fs.readFileSync(parent_dir+"/db/sqlite/active_pids.txt");
	}catch(err){
		touchActivePidFile();
	}
	try{
		var string_data=fs.readFileSync(parent_dir+"/config/db_config.json").toString()
		var data=JSON.parse(string_data);
		if(!check.assigned(data) || check.emptyObject(data)){
				console.log("Db config not set. Set using bot-marvin-db");
				process.exit(0)
		}
	}catch(err){
		console.log(err)
		//file not exists touch the file and exit
		//or may be a parsing error
			console.log("Db config not set. Set using bot-marvin-db");
			touchDbConfigFile();
			
	}
	

		


}

exports.check=validate;
function msg(){log.put(arguments[0],arguments[1],__filename.split('/').pop(), arguments.callee.caller.name.toString());}
