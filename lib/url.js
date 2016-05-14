var urllib = require('url');
var ObjectX = require(__dirname+"/proto.js").ObjectX;
var check = require('check-types');
var config;
var regex_urlfilter;
function getFileType(url){
	//tika vs normal webpage
	if(config.getConfig("tika")){
		if(check.assigned(url.match(config.getConfig("tika_supported_files")))){
			//file type matched use tika instead
			return "file";
		}
		else{
			//#debug#(url,domain)
			return "webpage";
		}
	}
	else{
		return "webpage";
	}
}
function extractDomain(url){
	return url.split("/").slice(0,3).join("/");
}
function normalizeProtocol(url){
	return "http://" + url.replace("https://","").replace("http://","");
}
function normalizeDomain(url){
	if(url[url.length-1] == "/"){
		url = url.slice(0,-1);
	}
	return "http://" + url.replace("https://","").replace("http://","");
}
function normalizeURL(url){
	url = normalizeProtocol(url);
	if(url[url.length-1] == "/"){
		url = url.slice(0,-1);
	}
	return url;
}
function nutchStyleURLKey(url){
	var type = "http://";
	var type1 = ":http";
	var domain=url.replace(type,"");
	var temp=domain.split('/')[0].split(".");
	var tt=temp.join(".");
	domain=temp.reverse().join(".");
	var path=url.replace(type,"").replace(tt,"");
	var id=domain+type1+path;
	return id;
}
function isAccepted(url, domain){
	if(!check.assigned(url.match(regex_urlfilter.accept))){ //user give acceptance
		if(!config.getConfig("external_links")){
			if(url.indexOf(domain)<0){
				return false;
			}
		}
	}
	
	for (var i = 0; i < regex_urlfilter.reject.length; i++) {
		if(check.assigned(url.match(regex_urlfilter.reject[i]))){
			if(check.assigned(url.match(config.getConfig("tika_supported_files")))){
				if(!config.getConfig("tika")){
					return false;
				}
			}
			else{
				return false;
							
			}
		}
						
	};

	return true;
}

exports.init = function(c, re ){
	config = c; 
	regex_urlfilter = re;
}
exports.url = function(url_input, d, p){
	var domain = d;
	var url = url_input;
	var parent = p;
	function URL(url){
		var url_obj = {};
		//check if absolute and relative
		if(url.indexOf("https://") < 0 && url.indexOf("http://") < 0){
			//relative
			if( !check.assigned(domain) ){
				//if given url is relative and no domain is specified then reject the url
				url_obj["accepted"] = false;
			}else{
				url = urllib.resolve(domain, url);
			}
			
		}else{
			//absolute
			if( !check.assigned(domain) ){
				domain = normalizeDomain(extractDomain(url));
			}else{
				domain = normalizeDomain(d);
			}			
		}
		url = normalizeURL(url);
		url_obj["url"] = url;
		url_obj["domain"] = domain;
		if(!check.assigned(parent)){
			url_obj["parent"] = null;
		}else{
			url_obj["parent"] = normalizeURL(parent);
		}
		
		url_obj["nutch_key"] = nutchStyleURLKey(url);
		if(!check.assigned(url_obj["accepted"])){
			//if not rejected by above code then run isAccepted()
			url_obj["accepted"] = isAccepted(url, domain);
		}
		
		url_obj["status_code"] = null;
		url_obj["response_time"] = null;
		url_obj["content"] = null;
		url_obj["parsed_content"] = null;
		url_obj["isParsed"] = false;
		url_obj["isIndexed"] = false;
		url_obj["file_type"] = getFileType(url);
		url_obj['redirect'] = null;
		var rep = ObjectX.clone(url_obj);
		Object.seal(rep);
		this.details=rep;


		//setters

		this.setStatusCode = function(code){
			url_obj["status_code"] = code;
			rep = ObjectX.clone(url_obj);
			Object.seal(rep);
			this.details=rep;
			
		};
		his.setRedirectedURL = function(url){
			url_obj["redirect"] = normalizeURL(url);
			rep = ObjectX.clone(url_obj);
			Object.seal(rep);
			this.details=rep;
			
		};
		this.setResponseTime = function(response){
			url_obj["response_time"] = response; 
			rep = ObjectX.clone(url_obj);
			Object.seal(rep);
			this.details=rep;
			
		};
		this.setContent = function(content){
			url_obj["content"] = content;
			rep = ObjectX.clone(url_obj);
			Object.seal(rep);
			this.details=rep;

			
		};
		this.setParsed = function(parsed){
			url_obj["parsed_content"] = parsed;
			url_obj["isParsed"] = true;
			rep = ObjectX.clone(url_obj);
			Object.seal(rep);
			this.details=rep;
			
		};

		this.getStatusCode = function(){
			return url_obj["status_code"];
		};
		this.getURL = function(){
			return url_obj["url"];
		};
		this.getRedirectedURL = function(){
			return url_obj["redirect"];
		};
		this.getDomain = function(){
			return url_obj["domain"];
		};
		this.getNutchKey = function(){
			return url_obj["nutch_key"];
		};
		this.isAccepted = function(){
			return url_obj["accepted"];
		};
		this.getDomain = function(){
			return url_obj["domain"];
		};
		this.getParent = function(){
			return url_obj["parent"];
		};
		this.getResponseTime = function(){
			return url_obj["response_time"];
		};
		this.getHTMLContent = function(){
			return url_obj["content"];
		};
		this.getParsedContent = function(){
			return url_obj["parsed_content"];
		};
		this.isIndexed = function(){
			return url_obj["isIndexed"];
		};
		this.isParsed = function(){
			return url_obj["isParsed"];
		};
	};
	return new URL(url);
};