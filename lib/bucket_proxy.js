var check = require("check-types");
var Immutable = require('immutable');
var _ = require("underscore");

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
        Stores count of urls in domains and various levels.
        @private
        @type Object

    */
    var count_store = {};


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
            var l = url.level;
            if (check.assigned(count_store[url.domain])) {

                //free space

                var url_levels = Object.keys(count_store[url.domain]);

                url_levels.sort();
                url_levels.reverse();

                var found = false;

                _.each(url_levels, function(url_level) {

                    
                    if (url.level < count_store[url.domain][url_level]) {

                        //console.log("freed  ", store[url.domain][url_level].size);
                        store[url.domain][url_level] = store[url.domain][url_level].remove(store[url.domain][url_level].last());
                        //console.log("freeed  ", store[url.domain][url_level].size);

                        if (check.assigned(count_store[url.domain][url_level])) {
                            count_store[url.domain][url_level] -= 1;
                        }

                        found = true;
                        return {}; //break

                    }

                });

                if (!found) {
                    return false;
                }

            } else {
                return false;
            }

        }



        var level = url.level;
        //console.log('here adding');


        if (check.assigned(store[url.domain])) {
            //domain present in the store

            if (check.assigned(store[url.domain][level])) {
                store[url.domain][level] = store[url.domain][level].add(JSON.stringify(url));
            } else {
                store[url.domain][level] = Immutable.Set();
                store[url.domain][level] = store[url.domain][level].add(JSON.stringify(url));

            }


        } else {
            store[url.domain] = {};
            store[url.domain][level] = Immutable.Set();
            store[url.domain][level] = store[url.domain][level].add(JSON.stringify(url));
        }



        if (check.assigned(count_store[url.domain])) {

            if (check.assigned(count_store[url.domain][level])) {
                count_store[url.domain][level] += 1;
            } else {
                count_store[url.domain][level] = 1;
            }

        } else {
            count_store[url.domain] = {};
            count_store[url.domain][level] = 1;
        }


        //console.log("current_size before  ", current_size );
        ++current_size;
        //console.log("current_size after  ", current_size );
        return true;

    };


    /**
    	Fetches urls from the cache.
    	@public
    	@param {String} domain - Domain required
    	@param {number} num - number of urls to return
    */
    this.fetchURLs = function fetchURLs(domain, num) {
        //console.log(current_size,"current_size ",cache_limit);
        if (!check.assigned(num)) {
            num = 1;
        }

        if (check.assigned(store[domain])) {
            var count = 0;
            var levels = Object.keys(store[domain]);
            levels.sort();
            var output = [];

            _.each(levels, function(level, index) {
                
                var arr = store[domain][level].slice(0, num);
                store[domain][level] = store[domain][level].subtract(arr);
                var tmp = arr.toArray();
                //console.log(count_store[domain], tmp.length);
                count_store[domain][level] -= tmp.length;
                output = output.concat(tmp);
                current_size -= tmp.length;
                if (output.length >= num) {
                    return {}; //break
                }

            });

            var temp = [];

            _.each(output, function(item) {
                temp.push(JSON.parse(item));
            });


            return temp;



        } else {
            return [];
        }



    }
};

module.exports = BucketProxy;