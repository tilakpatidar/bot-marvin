/*
 * Sitemap Parser
 *
 */

'use strict'
var Buffer = require('buffer').Buffer;
var zlib = require('zlib');
var xmlParse = require("xml2js").parseString;
var	request = require('request');
var	_ = require('underscore');
var check=require("check-types")
var ProgressBar = require('progress');
var urllib=require("url");
var parent_dir=process.getAbsolutePath(__dirname);
var config=require(parent_dir+"/lib/config-reloader.js");
var log=require(parent_dir+"/lib/logger.js");
var proto=require(parent_dir+"/lib/proto.js");
var URL=proto["URL"];
var regex_urlfilter={};
regex_urlfilter["accept"]=config.getConfig("accept_regex");
regex_urlfilter["reject"]=config.getConfig("reject_regex");
var sitemap = module.exports = Object;
function filterURLS(href,domain){
	domain=domain.replace("/sitemap.xml","");
	function reject(r){
		//console.log(r+"rule");
		//log.put((""+abs+" rejected by filters sitemap"),"info");
		return [false,r];
			
	}
if(check.assigned(href)){
	href=href.replace("https://","http://");//std form
	//console.log("url "+href);
	var abs=urllib.resolve(domain,href);
	if(abs===domain+"/"){
		//reject http://www.youtube.com http://www.youtube.com/
		return reject("0");
	}
	if(!check.assigned(abs.match(regex_urlfilter.accept))){ //user give acceptance
		if(!config.getConfig("external_links")){
			if(abs.indexOf(domain)<0){
				return reject("1");
			}
		}
	}
	
	for (var i = 0; i < regex_urlfilter.reject.length; i++) {
		if(check.assigned(abs.match(regex_urlfilter.reject[i]))){
				if(check.assigned(abs.match(config.getConfig("tika_supported_files")))){
					if(!config.getConfig("tika")){
						return reject("3");
					}

				}
				else{
					return reject("2");
					
					}
			}
		
	};
		return [true,abs];
							
						
							
		}
}
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
	var self = this;
	var req=request.get(this.url,{followRedirect:false});
	var body="";
	req.on('response', function(res) {
		 var encoding = res.headers['content-encoding'];
      if (encoding == 'gzip') {
	      	gzip=true;
      }
		console.log();
		    var len = parseInt(res.headers['content-length'], 10);
		    if(!len){
		    	len=100000000000;
		    }
		    var bar = new ProgressBar('  downloading '+self.url+'\n [:bar] :percent :etas', {
			    complete: '=',
			    incomplete: ' ',
			    width: 80,
			    total: len
			});
		 res.on('data', function (chunk) {
		 	if(gzip){
		 		input=input.concat(chunk);
		 	}
		 	
		 	var c=chunk.toString();
		 	body += c;
		 	(function(len){
				setTimeout(function(){
			 		bar.tick(len);
			 	},5000);
		 	})(c.length);
		 	
		    
		 });
		 res.on('error',function(err){
			callback(err,null);
		});
		 res.on('end', function (err) {
		    console.log('\n');
		    if(err){
		    	callback(err,null);
		    	return;
		    }
		    bar.tick(len);
		    if(gzip){
		    	input=new Buffer(input);
		    	console.log(input,self.url)
		    	var out=zlib.gunzip(input,function(err,uncompressed){
		    		if(!check.assigned(uncompressed)){
		    			callback(err,null);
				    	return;
		    		}
		    		var d=uncompressed.toString();
		    		console.log(d)
		    		try{
		    			xmlParse(d, function(err,data){
							callback(err,data);
						});
		    		}catch(err){
		    			callback(err,null);
				    	return;
		    		}
		    		
		    	});
		    	
		    }else{
		    	try{
			    	xmlParse(body, function(err,data){
						callback(err,data);
					});
				}catch(err){
		    			callback(err,null);
				    	return;
		    		}
		    }
		    
		 });
   });


	req.on('error',function(err){
			callback(err, "Error");
	});	
		
	
};

sitemap.getSites = function(url, callback){
	var self = this;
	var js=[];
	var d,s,error;
	var sUrlSize = 1;
	var parseCnt = 0;
	this.parse(url, function read(err, data){
		if(!err)
		{
			if(check.assigned(data) && check.assigned(data.urlset))
			{
				var d=data.urlset;
				if(!check.assigned(d.url)){
					return;
				}
				for (var i = 0; i < d.url.length; i++) {
					var obj=d.url[i];
					var k=[];
					var urll=filterURLS(obj["loc"][0],url);
					if(urll[0]){
						k.push(URL.normalize(urll[1])) //sitemap url normalization
						k.push(obj["changefreq"]);
						k.push(obj["lastmod"]);
						k.push(obj["priority"]);
						
						if(check.assigned(k[1])){
							k[1]=k[1][0].toLowerCase();
						}
						js.push(k)
					}
					
				};
				parseCnt++;
				if (parseCnt === sUrlSize) {
					callback(error, js);
				}
			}
			else if(check.assigned(data) && (s = data.sitemapindex))
			{
				var sitemapUrls = _.flatten(_.pluck(s.sitemap, "loc"));
				sUrlSize = _.size(sitemapUrls);
				//console.log(sitemapUrls);
				_.each(sitemapUrls, function(url){
					self.parse(url, read);
				});
			}else{
				error = "no valid xml";
			}
		}else{
			error = err;
			callback(error,[]);
		}
	});
};
