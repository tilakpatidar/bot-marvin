var tika=require('./tika').init;
tika.startServer();
tika.submitFile("https://training.github.com/kit/downloads/github-git-cheat-sheet.pdf",function(body){
	console.log(body);


});