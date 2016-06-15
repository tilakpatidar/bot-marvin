//run as sudo and stop your apache or nginx server
//if you want to have a fake url use dnmasq to resolve 
//a url to localhost ie. this nodejs server
//sudo dnsmasq --no-daemon --log-queries
//gksudo gedit /etc/NetworkManager/NetworkManager.conf
var util = require('util'),
    http = require('http'),
    fs   = require("fs"),
    URL  = require("url");

var pre_num = [124542,4525,1245,79865,8789656,632,3545431,4654635,65633,65464,646568];
var authors = ["http://plus.google.com/tilakpatidar", "http://plus.google.com/tilak", "http://www.twitter.com/tilakpatidar", "http://www.google.com/tilakpatidar", "http://www.blogspot.com/tilak", "http://www.stackoverflow.com/tilakpatidar",
"http://www.askubuntu.com/tilak", "http://www.stackexchange.com/tilak", "http://www.askubuntu.com/tilakpatidar", "http://www.stackexchange.com/tilakpatidar", "http://www.ubuntu.com/tilak"];
var other_domains = ["http://www.google.com","http://www.indiabix.com","http://www.india.com","http://www.yahoo.com","http://www.yandex.com"];

function lang_url(lang, url){
	u = url.split("/").slice(0, 3);
	p = url.split("/").slice(3);
	u = u.join("/")+lang.replace("-","/")+p.join("/");
	return u;
}
function generateHTML(domain, url){
	var str;
	var bot_meta="";
	var sw=parseInt(Math.random()*2000);
	if(sw>300 && sw<350){
		var bot_meta ="<meta name=\"robots\" content=\"noindex,nofollow\">";
	}else if(sw<100){
		var bot_meta ="<meta name=\"robots\" content=\"noindex\">";
	}else if(sw>500 && sw<1000){
		var bot_meta="<link rel=\"canonical\" href=\""+URL.resolve(domain,"/"+pre_num[parseInt(Math.random()*10)]+".html")+"\" />";
		bot_meta+="<link rel=\"alternate\" type=\"application/rss+xml\" href=\"/"+pre_num[parseInt(Math.random()*10)]+""+"\" />";
		
		bot_meta+='<link rel="alternate" href="'+lang_url("en-us",url)+'" hreflang="en-us" />';
		bot_meta+='<link rel="alternate" href="'+lang_url("de-de",url)+'" hreflang="de-de" />';
		bot_meta+='<link rel="alternate" href="'+lang_url("fr-fr",url)+'" hreflang="fr-fr" />';
		bot_meta+='<link rel="alternate" href="'+lang_url("ja-jp",url)+'" hreflang="ja-jp" />';
		bot_meta+='<link rel="alternate" href="'+lang_url("ko-kr",url)+'" hreflang="ko-kr" />';	

	}else if(sw > 200 && sw < 300){
		//author tag
		var author = authors[parseInt(Math.random()*10)];
		if(author){
			bot_meta += "<link rel=\"author\" href = \""+author+"\">";
		}
		
	}

	
	
	str="<html><head><title>"+domain+"</title>"+bot_meta+"</head><body>"+randomURLS(domain)+"</body></html>";
	return str;
	
}


var body_text = "About the Reviewers Skanda Bhargav is an engineering graduate from Visvesvaraya Technological University (VTU), Belgaum, Karnataka, India. He did his majors in computer science engineering. He is currently employed with Happiest Minds Technologies, an MNC based out of Bangalore. He is a Cloudera-certified developer in Apache Hadoop. His interests are big data and Hadoop. He has been a reviewer for the following books and a video, all by Packt Publishing: Instant MapReduce Patterns – Hadoop Essentials How-to Hadoop Cluster Deployment Building Hadoop Clusters [Video] Cloudera Administration Handbook I would like to thank my family for their immense support and faith in me throughout my learning stage. My friends have brought the confidence in me to a level that makes me bring out the best in myself. I am happy that God has blessed me with such wonderful people, without whom I wouldn’t have tasted the success that I’ve achieved today. Randal Scott King is a global consultant who specializes in big data and network architecture. His 15 years of experience in IT consulting has resulted in a client list that looks like a “Who’s Who” of the Fortune 500. His recent projects include a complete network redesign for an aircraft manufacturer and an in-store video analytics pilot for a major home improvement retailer. He lives with his children outside Atlanta, GA. You can visit his blog at www.randalscottking.com. Dmitry Spikhalskiy currently holds the position of software engineer in a Russian social network service, Odnoklassniki, and is working on a search engine, video recommendation system, and movie content analysis. Previously, Dmitry took part in developing Mind Labs’ platform, infrastructure, and benchmarks for a high-load video conference and streaming service, which got “The biggest online-training in the world” Guinness world record with more than 12,000 participants. As a technical lead and architect, he launched a mobile social banking start- up called Instabank. He has also reviewed Learning Google Guice and PostgreSQL 9 Admin Cookbook, both by Packt Publishing. Dmitry graduated from Moscow State University with an MSc degree in computer science, where he first got interested in parallel data processing, high-load systems, and databases. Jeroen van Wilgenburg is a software craftsman at JPoint (http://www.jpoint.nl), a software agency based in the center of the Netherlands. Their main focus is on developing high-quality Java and Scala software with open source frameworks. Currently, Jeroen is developing several big data applications with Hadoop, MapReduce, Storm, Spark, Kafka, MongoDB, and Elasticsearch.";

function randomURLS(domain, count){
	var li=[];
	var max_limit;
	


	for(var j=0;j<20;j++){
		var change_domain = parseInt(Math.random()*10);
		if(change_domain > 5){
			var cd = parseInt(Math.random()*10)/2;
			if(other_domains[cd]){
				domain = other_domains[cd];
			}
		}
		var max=1000000000;
		var min=0;
		var k=parseInt(Math.random()* (max - min) + min);
		var depth=parseInt(Math.random()* (10-1)+1);
		var dir="";
		for(var kk=1;kk<=depth;kk++){
			dir+=("dir"+kk+"/");
		}
		var sw=parseInt(Math.random()*100);
		var sw1=parseInt(Math.random()*100);
		
		if(sw1>50){
			abs = "/"+dir+k;
		}else{
			abs=URL.resolve(domain,"/"+dir+k);
		}

		if(sw>10 && sw<95){
			li.push('<li><a href="'+abs+'.html">'+k+'</a>');
		}
		else if(sw >= 95){
			li.push('<li><a href="'+abs+'404.html">'+k+'</a>');
		}
		else if(sw<10){
			
				li.push('<li><a href="'+abs+'.pdf">'+k+'</a>');
			
			
			
		}
		
	}
	li.push("</li>");
	return li.join("")+"<p>"+body_text+"</p>";
	

}
http.createServer(function (req, res) {
	var url = req.url.toString();
	var domain="http://"+req.headers.host;
	console.log(URL.resolve(domain,url));
	if(url.indexOf("404.html")>0){
		res.writeHead(404, { 'Content-Type': 'text/html' });
		res.write('');
		res.end();
		return;
	}
	var deny = parseInt(Math.random()*1000);
	if(deny < 200){
		var deny1 = parseInt(Math.random()*1000);
		if(deny1>700){
			res.writeHead(404, { 'Content-Type': 'text/html' });
		}else if(deny1 > 500 && deny1 < 700){
			res.writeHead(500, { 'Content-Type': 'text/html' });
		}else{
			if(url.indexOf('robots.txt')<0 && url.indexOf('sitemap.xml')<0){
				console.log("Testing for ETIMEDOUT");
				return;
			}
			
		}
		
		res.write('');
		res.end();
		return;
	}
	if(url.indexOf("/robots.txt")>=0){
		//for robots.txt request
		res.write("User-agent: *\nAllow: /");
		res.end();
		return;
	}
	if(url.indexOf("/sitemap.xml")>=0){
		//for robots.txt request
		res.writeHead(404, {"Content-Type": "text/plain"});
	    res.write("404 Not Found\n");
	    res.end();
		return;
	}
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

		var ans=generateHTML(domain,url);
		res.writeHead(200, { 'Content-Type': 'text/html' });
		res.write(ans);
		res.end();
	}
		
		
  
  
}).listen(80);
