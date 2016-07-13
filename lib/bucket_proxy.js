var check = require("check-types");
var Immutable = require('immutable');

/**
	Caches a copy of inserted links to reduce time in bucket creation.
	@constructor
	@author Tilak Patidar <tilakpatidar@gmail.com>
*/
var BucketProxy = function constructor_bucket_proxy(limit) {

    /**
    	Urls are stored in it. Key is domain and each domain has another json
    	with keys representing levels and each level has an Immutable Set of urls.
    	@private
    	@type Object
    */
    var store = {};

    /**
    	Represents max cache size.
    	@type number
    	@private
    */
    var cache_limit;
    if (!check.assigned(limit)) {
        cache_limit = 10000;
    } else {
        cache_limit = limit;
    }

    /**
    	Represents current size of cache.
    	@private
    	@type number
    */
    var current_size = 0;

    /**
    	Pushes a url in the cache.
    	@public
    	@param {Url} url
    	@returns {boolean} -status of insertion

    */
    this.pushURL = function pushURL(url) {
        //console.log(current_size,"current_size ",cache_limit);
        if (current_size >= cache_limit) {
            //console.log("BLOCKED");
            return false;
        }
        if (check.assigned(store[url.domain])) {
            //domain present in the store
            var level = url.level;
            if (check.assigned(store[url.domain][level])) {
                store[url.domain][level] = store[url.domain][level].add(JSON.stringify(url));
            } else {
                store[url.domain][level] = Immutable.Set();
                store[url.domain][level] = store[url.domain][level].add(JSON.stringify(url));
            }

        } else {
            store[url.domain] = {};
            var level = url.level;
            store[url.domain][level] = Immutable.Set();
            store[url.domain][level] = store[url.domain][level].add(JSON.stringify(url));
        }
        ++current_size;
        return true;

    };


    /**
    	Fetches urls from the cache.
    	@public
    	@param {String} domain - Domain required
    	@param {number} num - number of urls to return
    */
    this.fetchURLs = function fetchURLs(domain, num) {

        if (!check.assigned(num)) {
            num = 1;
        }

        if (check.assigned(store[domain])) {
            var count = 0;
            var levels = Object.keys(store[domain]);
            levels.sort();
            var output = [];
            for (var index in levels) {
                var level = levels[index];
                var arr = store[domain][level].slice(0, num);
                store[domain][level] = store[domain][level].subtract(arr);
                var tmp = arr.toArray()
                output = output.concat(tmp);
                current_size -= tmp.length;
                if (output.length >= num) {
                    break;
                }

            }
            var temp = [];
            for (var indexx in output) {
                temp.push(JSON.parse(output[indexx]));
            }


            return temp;



        } else {
            return [];
        }



    }
};

module.exports = BucketProxy;