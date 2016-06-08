var check = require("check-types");
var Immutable = require('immutable');

var BucketProxy = function constructor_bucket_proxy(limit){

	var store = {};
	if(!check.assigned(limit)){
		this.cache_limit = 10000;
	}else{
		this.cache_limit = limit;
	}
	
	var current_size = 0;
	this.pushURL = function pushURL(url){
		if(current_size >= this.cache_limit){
			return;
		}
		if(check.assigned(store[url.domain])){
			//domain present in the store
			var level = url.level;
			if(check.assigned(store[url.domain][level])){
				store[url.domain][level] = store[url.domain][level].add(JSON.stringify(url));
			}else{
				store[url.domain][level] = Immutable.Set();
				store[url.domain][level] = store[url.domain][level].add(JSON.stringify(url));
			}

		}else{
			store[url.domain] = {};
			var level = url.level;
			store[url.domain][level] = Immutable.Set();
			store[url.domain][level] = store[url.domain][level].add(JSON.stringify(url));
		}
		++current_size;

	};

	this.fetchURLs = function fetchURLs(domain, num){

		if(!check.assigned(num)){
			num = 1;
		}

		if(check.assigned(store[domain])){
			var count = 0;
			var levels = Object.keys(store[domain]);
			levels.sort();
			var output = [];
			for(var index in levels){
				var level = levels[index];
				var arr = store[domain][level].slice(0,num);
				store[domain][level] = store[domain][level].subtract(arr);
				output = output.concat(arr.toArray());
				current_size-=arr.length;
				if(output.length >= num){
					break;
				}
				
			}
			var temp = [];
			for(var indexx in output){
				temp.push(JSON.parse(output[indexx]));
			}
			delete output;

			return temp;

			

		}else{
			return [];
		}



	}
};

module.exports = BucketProxy;