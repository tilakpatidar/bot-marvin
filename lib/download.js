#!/usr/bin/env node
var fs=require("fs");
if(process.execPath!==undefined){
	console.log("Setting env variables");
	var path=__dirname.split("/");
	path.pop();
	path=path.join("/");
	var data=fs.readFileSync(path+"/config/config.js").toString();
	var d=fs.writeFileSync(path+"/config/config.js",data.replace("\"env\": \"/usr/local/bin/nodejs\",","\"env\": \""+process.execPath.trim()+"\","));
	
	
}
var st=fs.createWriteStream(path+"/config/config_override.json");
st.write("{}");
st.end();
var st1=fs.createWriteStream(path+"/config/db_config.json");
st1.write("{}");
st1.end();
var edit;
console.log(process.env.EDITOR)
if(process.env.EDITOR===undefined){
	edit="nano";

}
else{
	edit=process.env.EDITOR;
}
	var path=__dirname.split("/");
	path.pop();
	path=path.join("/");
	var data=fs.readFileSync(path+"/config/config.js").toString();
	var d=fs.writeFileSync(path+"/config/config.js",data.replace("\"text_editor\": \"nano\",","\"text_editor\": \""+edit+"\","));
	


console.log("Setting env variables [SUCCESS]");
var request=require("request");
var ProgressBar = require('progress');
console.log("Downloading tika server jar please wait !\n\n");
var st=fs.createWriteStream(__dirname+"/tika-server-1.11.jar").on('error',function(err){
				
				console.log("download failed please download http://apache.spinellicreations.com/tika/tika-server-1.11.jar.\nRun bot-marvin-init before running crawler.");
});
var req=request({uri:"http://apache.spinellicreations.com/tika/tika-server-1.11.jar"});
var done_len=0;
req.on("response",function(res){
	console.log("downloading tika-server-1.11.jar ");
		var len = parseInt(res.headers['content-length'], 10);
		var bar = new ProgressBar('\n [:bar] :percent :etas', {
			    complete: '=',
			    incomplete: ' ',
			    width: 100,
			    total: len
			});
		res.on("data",function(chunk){
					var c=chunk.toString().length;
					done_len+=c;

				 	(function(len){
						setTimeout(function(){
					 		bar.tick(len);
					 	},5000);
				 	})(c);
		});
		res.on("error",function(){
			console.log("download failed please download http://apache.spinellicreations.com/tika/tika-server-1.11.jar.\nRun bot-marvin-init before running crawler.");
		})
		res.pipe(st);
		res.on("end",function(){
			bar.tick(len);
			var crypto = require('crypto');
			var data=fs.readFileSync(__dirname+"/tika-server-1.11.jar");
			var md5sum = crypto.createHash('md5');
			md5sum.update(data);
			var hash=md5sum.digest('hex');
			if(hash==="7e28f3288c3bcd0c26ac6f557ddfb977"){
				console.log("Download was successfull !");
			}else{
				console.log("Corrupted download re-run \n bot-marvin-init");
			}
			
			process.exit(0);

		});

});
req.on("error",function(){
	console.log("download failed please download http://apache.spinellicreations.com/tika/tika-server-1.11.jar.\nRun bot-marvin-init before running crawler.");
})


