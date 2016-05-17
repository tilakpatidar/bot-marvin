/*
 * Sitemap Parser
 *
 */

'use strict'
var Buffer = require('buffer').Buffer;
var zlib = require('zlib');
var xmlParse = require("xml2js").parseString;
var     request = require('request');
var fs=require("fs");
var     _ = require('underscore');
var check=require("check-types")
var ProgressBar = require('progress');
var urllib=require("url");
var parent_dir=process.getAbsolutePath(__dirname);
var config;
var regex_urlfilter;
var log=require(parent_dir+"/lib/logger.js");
var proto=require(parent_dir+"/lib/proto.js");
var URL;
var pool=process.pool;
var sitemap = module.exports = Object;



sitemap.setURL = function(url){
	this.url = url;
}

sitemap.parse = function(url, callback){
	this.url = url;
	var gzip=false;
	var input = [];
	if(url.indexOf(".gz")>=0){
		//gz file will require uncompressing
		gzip=true;
		
	}
	var prog=0;
	var bar;
	var self = this;
	var body="";
	var curr_time=(new Date()).getTime();
	var timer = setInterval(function () {
		  
		  if(check.assigned(bar)){
		  	bar.tick(prog);
		  	console.log("\n")
		  	if (bar.complete) {
			    console.log('\ncomplete\n');
			    clearInterval(timer);
			}
		  }
		  
		   
	
	}, 1000);
	var req=request.get(self.url,{followRedirect:false,timeout:config.getConfig("sitemap_parser_timeout")});
	req.on('response', function(res) {
		//console.log(res.statusCode);
		if(res.statusCode!==200){
			clearInterval(timer);
			//console.log("OLA")
			callback(new Error(),null);
			return;
		 
		}
	 var encoding = res.headers['content-encoding'];
      if (encoding == 'gzip') {
	      	gzip=true;
      }
     
		
		    var len = parseInt(res.headers['content-length'], 10);
		    if(!len){
		    	len=1000000;
		    }
		    bar = new ProgressBar('  downloading '+res.request.uri.href+'\n [:bar] :percent :etas', {
			    complete: '=',
			    incomplete: ' ',
			    width: 100,
			    total: len
			});
		 res.on('data', function (chunk) {
		 	if(gzip){
		 		input=input.concat(chunk);
		 	}
		 	
		 	var c=chunk.toString();
		 	body += c;
		 	prog=c.length;
			 	
		 
		 	
		    
		 });
		 res.on('error',function(err){
		 	clearInterval(timer);
			callback(err,null);
			return;
		});
		 res.on('end', function (err) {
		 	clearInterval(timer);
		    if(err){
		    	clearInterval(timer);
		    	callback(err,null);
		    	return;
		    }
		    bar.tick(len);
		    if(gzip){
		    	input=new Buffer(input);
		    	//console.log(input,self.url)
		    	var out=zlib.gzip(input,function(err,uncompressed){
		    		if(!check.assigned(uncompressed)){
		    			clearInterval(timer);
		    			callback(err,null);
				    	return;
		    		}
		    		var d=uncompressed.toString();
		    		//console.log(d)
		    		try{
		    			xmlParse(d, function(err,data){
		    				clearInterval(timer);
							callback(err,data);
							return;
						});
		    		}catch(err){
		    			clearInterval(timer);
		    			callback(err,null);
				    	return;
		    		}
		    		
		    	});
		    	
		    }else{
		    	try{
		    		
			    	xmlParse(body, function(err,data){
			 			clearInterval(timer);
						callback(err,data);
						return;
					});
				}catch(err){	
						clearInterval(timer);
		    			callback(err,null);
				    	return;
		    		}
		    }
		    
		 });
   });


	req.on('error',function(err){
			clearInterval(timer);
			callback(err, "Error");
			return;
	});	
	    
	   
	
		
	
};

sitemap.getSites = function(url, callback){
	var self = this;
	var js=[];
	var d,s,error;
	var sUrlSize = 1;
	var parseCnt = 0;
	this.parse(url, function read(err, data){
		
		 if(!check.assigned(err)){
            d = data.urlset;
            if(check.assigned(d)){

				
				for (var i = 0; i < d.url.length; i++) {
					var obj=d.url[i];
                    var k=[];
                    var href = obj["loc"][0];
                    var url_link = URL.url(href, url.replace("/sitemap.xml",""));
                    if(url_link.details.accepted){
                            var domain = url_link.getDomain();
                            k.push(url_link.getURL())
                            k.push(domain);
                            k.push(urllib.resolve(domain,"sitemap.xml"));
						if(!check.assigned(obj["changefreq"])){
							obj["changefreq"]=config.getConfig("default_recrawl_interval");
						}
						if(!check.assigned(obj["priority"])){
							obj["priority"]=1;
						}


						
						if(check.assigned(obj["priority"][0])){
							obj["priority"]=parseInt(parseFloat(obj["priority"][0]*10));  //as range of priority is 0.0 to 1.0
							if(obj["priority"]===0){
								obj["priority"]=1;
							}
							if(check.number(obj["priority"])){
								//then convert
								obj["priority"]=11-(obj["priority"]);
							}
							else{
								obj["priority"]=1;
							}

							
							//converting to our convention
						}
						if(obj["priority"]===0){
								obj["priority"]=1;
							}
						k.push((obj["changefreq"]).toString().toLowerCase());
						k.push(parseInt(obj["priority"]));
						
						js.push(k)
					}
					
				};
				parseCnt++;
				console.log(parseCnt,"parseCnt",sUrlSize)
				if (parseCnt === sUrlSize) {
					callback(error, js);
					return;
				}
			}
			else if(s = data.sitemapindex)
			{
				var sitemapUrls = _.flatten(_.pluck(s.sitemap, "loc"));
				sUrlSize += _.size(sitemapUrls);
				_.each(sitemapUrls, function(url){
					self.parse(url, read);
					
				});
			}else{
				error = "no valid xml";
			}
		}else{
			parseCnt++;
			console.log(parseCnt,"parseCnt",sUrlSize)
				if (parseCnt === sUrlSize) {
					callback(error, js);
					return;
			}
		}
	});
};


sitemap.init=function(c ,re){

        config = c;
        regex_urlfilter = re;
        URL=require(parent_dir+"/lib/url.js");
        URL.init(c,re);


};

