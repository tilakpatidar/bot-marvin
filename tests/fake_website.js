//run as sudo and stop your apache or nginx server
//if you want to have a fake url use dnmasq to resolve 
//a url to localhost ie. this nodejs server
//sudo dnsmasq --no-daemon --log-queries
//gksudo gedit /etc/NetworkManager/NetworkManager.conf
var util = require('util'),
    http = require('http'),
    fs   = require("fs"),
    url  = require("url");
function generateHTML(domain){
	var str;
	str="<html><head><title>"+domain+"</title></head><body>"+randomURLS(domain)+"</body></html>";
	return str;
	
}
function randomURLS(domain){
	var li=[];
	for(var j=0;j<20;j++){
		var max=1000000000;
		var min=0;
		var k=parseInt(Math.random()* (max - min) + min);
		var depth=parseInt(Math.random()* (10-1)+1);
		var dir="";
		for(var kk=1;kk<=depth;kk++){
			dir+=("dir"+kk+"/");
		}
		var sw=parseInt(Math.random()*100);
		var abs=url.resolve(domain,"/"+dir+k);
		if(sw>50 && sw<95){
			li.push('<li><a href="'+abs+'.html">'+k+'</a>');
		}
		else if(sw<50){
			
				li.push('<li><a href="'+abs+'.pdf">'+k+'</a>');
			
			
			
		}
		
	}
	li.push("</li>");
	return li.join("");
	

}
http.createServer(function (req, res) {
	var url = req.url.toString();
	var domain="http://"+req.headers.host;
	console.log(domain);
	if(url.indexOf(".pdf")>0){
		res.writeHead(200, { 'Content-Type': 'application/pdf' });
		fs.readFile("cforjava.pdf",function(error,data){
			console.log(error);
			res.write(data);
			res.end();

		});
	}
	else if(url.indexOf(".docx")>0){
		res.writeHead(200, { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
		fs.readFile("centering.docx",function(error,data){
			res.write(data);
			res.end();

		});
	}
	else{
		var ans=generateHTML(domain);
		res.writeHead(200, { 'Content-Type': 'text/html' });
		res.write(ans);
		res.end();
	}
		
		
  
  
}).listen(80);
