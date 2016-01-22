var fs=require("fs");
var request=require("request");
var ProgressBar = require('progress');
console.log("Downloading tika server jar please wait !\n\n");
var st=fs.createWriteStream("./tika-server-1.11.jar").on('error',function(err){
				
				console.log("download failed please download http://apache.spinellicreations.com/tika/tika-server-1.11.jar.\nRun bot-marvn --setup-tika before running crawler.");
});
var req=request({uri:"http://apache.spinellicreations.com/tika/tika-server-1.11.jar"});
var done_len=0;
req.on("response",function(res){
		var len = parseInt(res.headers['content-length'], 10);
		var bar = new ProgressBar('  downloading tika-server-1.11.jar \n [:bar] :percent :etas', {
			    complete: '=',
			    incomplete: ' ',
			    width: 20,
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
			console.log("download failed please download http://apache.spinellicreations.com/tika/tika-server-1.11.jar.\nRun bot-marvn --setup-tika before running crawler.");
		})
		res.pipe(st);

});
req.on("error",function(){
	console.log("download failed please download http://apache.spinellicreations.com/tika/tika-server-1.11.jar.\nRun bot-marvn --setup-tika before running crawler.");
})


