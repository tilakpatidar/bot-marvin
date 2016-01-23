var fs=require("fs");

function check(){

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


}

exports.check=check;