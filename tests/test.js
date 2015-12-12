var tika=require('../tika').init;
var robots=require('../robots').app;
var colors = require('colors');
var fs=require('fs');
console.log("[INFO] Test1 Tika module".yellow);
tika.startServer();
tika.submitFile("file:///home/tilak/bot-marvin/tests/cforjava.pdf",function(err,body){
	//console.log(body);
	if(err){
		console.log(err);
		console.log("[ERROR] Test1 Tika module".red);
	}
	else if(body!==null){
		console.log("[SUCCESS] Test1 Tika module".green);
	}

});
console.log("[INFO] Test2 Robots init module without cache".yellow);
fs.unlink("../pdf-store/http:####www.google.com",function(){
	robots.init(["http://www.google.com"],function(err,bots){
		if(err){
			console.log(err);
			console.log("[ERROR] Test2 Robots init module without cache".red);
		}
		else if(bots!==null){
			console.log("[SUCCESS] Test2 Robots init module without cache".green);
		}
		console.log("[INFO] Test3 Robots init module with cache".yellow);
		robots.loadCache();
		if(robots.bots["http://www.google.com"]===undefined){
			console.log("[ERROR] Test3 Robots init module with cache".red);
		}
		else{
			console.log("[SUCCESS] Test3 Robots init module with cache".green);
		}
	});


});
