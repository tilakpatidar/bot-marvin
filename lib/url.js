var urllib = require('url');
var ObjectX = require(__dirname + "/proto.js").ObjectX;
var check = require('check-types');

/**
	Represents URL and it's crawled details.
	has parsing functions.
	@author Tilak Patidar <tilakpatidar@gmail.com>
	@constructor
	@param {Message} message_obj

*/
var URLCreator = function(message_obj) {
    var message = message_obj;
    var config = message.get('config');
    var regex_urlfilter = message.get('regex_urlfilter');
    var log = message.get('log');


    /**
    	Returns 'file' or 'webpage' based on URL and tika config.
    	@private
    	@param {String} url

    */
    function getFileType(url) {
        //tika vs normal webpage
        if (config.getConfig("tika")) {
            if (check.assigned(url.match(config.getConfig("tika_supported_files")))) {
                //file type matched use tika instead
                return "file";
            } else {
                //#debug#(url,domain)
                return "webpage";
            }
        } else {
            return "webpage";
        }
    }


    /**
    	Extractes the domain from url.
    	@private
    	@param {String} url

    */
    function extractDomain(url) {
        return url.split("/").slice(0, 3).join("/");
    }


    /**
    	Normalizes protocol to http:
    	@param {String} url
    	@private
    */
    function normalizeProtocol(url) {
        return "http://" + url.replace("https://", "").replace("http://", "");
    }

    /**
    	Normalizes domain.
    	@param {String} url
    	@private
    */
    function normalizeDomain(url) {
        url = sortedParams(url);
        if (url[url.length - 1] == "/") {
            url = url.slice(0, -1);
        }
        url = "http://" + url.replace("https://", "").replace("http://", "");

        return url;
    }

    /**
    	Sorts param from the url.
    	@param {String} url
    	@private
    */
    function sortedParams(url) {
        var url_parts = urllib.parse(url, true);
        var sorted = "";
        if (check.assigned(url_parts.query) && !check.emptyObject(url_parts.query)) {
            var keys = Object.keys(url_parts.query);
            keys.sort();
            sorted = [];
            for (var key in keys) {
                sorted.push(keys[key] + "=" + encodeURIComponent(url_parts.query[keys[key]]) );
            }
            sorted = "?" + sorted.join("&");
        }
        url = url_parts.protocol + "//" + url_parts.hostname + url_parts.pathname + sorted;
        return url;
    }

    /**
    	Normalize a url.
    	@param {String} url
    	@private
    */
    function normalizeURL(url) {
        url = normalizeProtocol(url);
        if (url[url.length - 1] == "/") {
            url = url.slice(0, -1);
        }

        a = url.split("/");
        var last_part = a[a.length - 1];
        last_part = last_part.replace(/#.*/gi, '').trim();
        if (last_part === "") {
            //if urls is like /#home it would end up being / after replace
            a.pop();
        } else {
            a[a.length - 1] = last_part;
        }
        url = a.join("/");





        return url;
    }

    /**
    	Returns nutch style url.
    	@private
    	@param {String} url
    */
    function nutchStyleURLKey(url) {
        var type = "http://";
        var type1 = ":http";
        var domain = url.replace(type, "");
        var temp = domain.split('/')[0].split(".");
        var tt = temp.join(".");
        domain = temp.reverse().join(".");
        var path = url.replace(type, "").replace(tt, "");
        var id = domain + type1 + path;
        return id;
    }

    /**
    	Returns accepted or rejected status based on the regexes in config.
    	@private
    	@param {String} url
    	@param {String} domain
    	@return {boolean}
    */
    function isAccepted(url, domain) {
        //console.log("in isAccepted", message.get('links_store'));

        var dir_length = url.replace("http://","").replace("https://").split('/').length - 1; //remove slash of domain

        var domain_data = message.get('links_store')[domain];
        
        if(check.assigned(domain_data)){
            var allowed = domain_data['limit_depth'];
            //console.log("allowed  ", allowed, "  ",url);
            if( allowed !== -1 ){
                if(dir_length > allowed ){

                    //console.log('rejected ', url, ' dir_length ', dir_length, '  allowed   ', allowed);
                    return false;
                }
            }
        }


        if (!check.assigned(url.match(regex_urlfilter.accept))) { //user give acceptance
            if (!config.getConfig("external_links")) {
                if (url.indexOf(domain) < 0) {
                    return false;
                }
            }
        }

        for (var i = 0; i < regex_urlfilter.reject.length; i++) {
            if (check.assigned(url.match(regex_urlfilter.reject[i]))) {
                if (check.assigned(url.match(config.getConfig("tika_supported_files")))) {
                    if (!config.getConfig("tika")) {
                        return false;
                    }
                } else {
                    return false;

                }
            }

        };

        return true;
    }

    /**
    	Returns a URL object. With url details and helper methods.
    	@param {String} url_input
    	@param {String} d - domain
    	@param {String} p - parent
    	@public

    */
    this.url = function(url_input, d, p) {
        var domain = d;
        var url = url_input;
        var parent = p;
        /**
        	Returns JSON having url details
        	@private
        	@constructor
        	@param {String} url

        */
        function URL(url) {
            if (typeof(url) !== 'string') {
                return null;
            }
            var url_obj = {};
            url_obj["accepted"] = true;
            //check if absolute and relative
            if (url.indexOf("https://") < 0 && url.indexOf("http://") < 0) {
                //relative
                if (!check.assigned(domain)) {
                    //if given url is relative and no domain is specified then reject the url
                    url_obj["accepted"] = false;
                } else {
                    url = urllib.resolve(domain, url);
                }

            } else {
                //absolute
                if (!check.assigned(domain)) {
                    domain = normalizeDomain(extractDomain(url));
                } else {
                    domain = normalizeDomain(d);
                }
            }
            url = normalizeURL(url);
            url_obj["url"] = url;
            url_obj["domain"] = domain;
            if (!check.assigned(parent)) {
                url_obj["parent"] = null;
            } else {
                url_obj["parent"] = normalizeURL(parent);
            }

            url_obj["nutch_key"] = nutchStyleURLKey(url);
            if (url_obj["accepted"]) {
                //if not rejected by above code then run isAccepted()
                url_obj["accepted"] = isAccepted(url, domain);
                
            }

            if(!url_obj["accepted"]){
                //console.log("failed");
                    msg(url_obj["url"] + " got rejected by filters", "error");
            }

            url_obj["status_code"] = null;
            url_obj["response_time"] = null;
            url_obj["content"] = null;
            url_obj["parsed_content"] = null;
            url_obj["isParsed"] = false;
            url_obj["isIndexed"] = false;
            url_obj["file_type"] = getFileType(url);
            url_obj['redirect'] = null;
            url_obj['bucket_id'] = null;
            url_obj['urlID'] = null;
            url_obj['alternate_urls'] = [];
            url_obj['canonical_url'] = null;
            url_obj["content_md5"] = null;
            url_obj["header_content_type"] = null;
            url_obj["normal_queue"] = true;
            url_obj['level'] = url_obj["url"].replace('http://', '').split('/').length;
            var rep = ObjectX.clone(url_obj);
            Object.seal(rep);
            this.details = rep;


            //setters
            /**
            	Set normal queue
            	@public
            */
            this.setNormalQueue = function() {
                url_obj["normal_queue"] = true;
                rep = ObjectX.clone(url_obj);
                Object.seal(rep);
                this.details = rep;
            };
            /**
            	Set failed queue
            	@public
            */
            this.setFailedQueue = function() {
                url_obj["normal_queue"] = false;
                rep = ObjectX.clone(url_obj);
                Object.seal(rep);
                this.details = rep;
            };
            /**
            	Set header content type
            	@public
            	@param {String} header
            */
            this.setHeaderContentType = function(header) {
                url_obj["header_content_type"] = header;
                rep = ObjectX.clone(url_obj);
                Object.seal(rep);
                this.details = rep;
            };

            /**
            	Add alternate language urls
            	@public
            	@param {String} l - url
            	@param {String} lang - language
            */
            this.addAlternateUrl = function(l, lang) {
                if (l.indexOf("http://") === 0 || l.indexOf("https://") === 0) {
                    l = new URL(l); //parsing the url
                } else {
                    //relative link provide domain;
                    l = new URL(l, this.details.domain); //parsing the url

                }
                if (!check.assigned(l) || !check.assigned(l.details)) {
                    return;
                }
                l = l.details.url;
                url_obj["alternate_urls"].push(l);
                rep = ObjectX.clone(url_obj);
                Object.seal(rep);
                this.details = rep;

            };

            /**
            	Set Canonical urls, which points the page having same content
            	@public
            	@param {String} l - url
            */
            this.setCanonicalUrl = function(l) {
                if (l.indexOf("http://") === 0 || l.indexOf("https://") === 0) {
                    l = new URL(l); //parsing the url
                } else {
                    //relative link provide domain;
                    l = new URL(l, this.details.domain); //parsing the url

                }
                if (!check.assigned(l) || !check.assigned(l.details)) {
                    return;
                }
                l = l.details.url;
                url_obj["canonical_url"] = l;
                rep = ObjectX.clone(url_obj);
                Object.seal(rep);
                this.details = rep;
            };

            /**
            	Set md5 hash of content this URL has.
            	@public
            	@param {String} l - string rep of hash
            */
            this.setContentMd5 = function(l) {
                url_obj["content_md5"] = l;
                rep = ObjectX.clone(url_obj);
                Object.seal(rep);
                this.details = rep;
            };

            /**
            	Set urlId
            	@public
            	@param {String} code - the urlId assigned by mongodb on insert
            */
            this.setUrlId = function(code) {
                url_obj["urlID"] = code;
                rep = ObjectX.clone(url_obj);
                Object.seal(rep);
                this.details = rep;
            };

            /**
            	Set redirectUrl
            	@public
            	@param {String} url
            */
            this.setRedirectedURL = function(url) {
                url_obj["redirect"] = normalizeURL(url);
                rep = ObjectX.clone(url_obj);
                Object.seal(rep);
                this.details = rep;

            };

            /**
            	Set bucketId
            	@public
            	@param {String} idd
            */
            this.setBucketId = function(idd) {
                url_obj["bucket_id"] = idd;
                rep = ObjectX.clone(url_obj);
                Object.seal(rep);
                this.details = rep;

            };

            /**
            	Set response time
            	@public
            	@param {String} response
            */
            this.setResponseTime = function(response) {
                url_obj["response_time"] = response;
                rep = ObjectX.clone(url_obj);
                Object.seal(rep);
                this.details = rep;

            };

            /**
            	Set crawled content
            	@public
            	@param {Object} content
            */
            this.setContent = function(content) {
                url_obj["content"] = content;
                rep = ObjectX.clone(url_obj);
                Object.seal(rep);
                this.details = rep;


            };
            /**
            	Set parsed content
            	@public
            	@param {Object} content
            */
            this.setParsed = function(parsed) {
                url_obj["parsed_content"] = parsed;
                url_obj["isParsed"] = true;
                rep = ObjectX.clone(url_obj);
                Object.seal(rep);
                this.details = rep;

            };
            /**
            	Set status code recieved on this url
            	@public
            	@param {String} code
            */
            this.setStatusCode = function(code) {
                url_obj["status_code"] = code;
                rep = ObjectX.clone(url_obj);
                Object.seal(rep);
                this.details = rep;

            };
            /**
            	Get md5 content.
            	@public
            */
            this.getContentMd5 = function() {
                    return url_obj["content_md5"];
                }
                /**
                	Get bucket id.
                	@public
                */
            this.getBucketId = function() {
                    return url_obj['bucket_id'];
                }
                /**
                	Get status code.
                	@public
                */
            this.getStatusCode = function() {
                return url_obj["status_code"];
            };
            /**
            	Get url.
            	@public
            */
            this.getURL = function() {
                return url_obj["url"];
            };

            /**
            	Get urlId.
            	@public
            */
            this.getUrlId = function() {
                return url_obj["urlID"];
            };
            /**
            	Get redirect url.
            	@public
            */
            this.getRedirectedURL = function() {
                return url_obj["redirect"];
            };
            /**
            	Get domain.
            	@public
            */
            this.getDomain = function() {
                return url_obj["domain"];
            };
            /**
            	Get nutch style url rep.
            	@public
            */
            this.getNutchKey = function() {
                return url_obj["nutch_key"];
            };
            /**
            	Get accepted or rejected status.
            	@public
            */
            this.isAccepted = function() {
                return url_obj["accepted"];
            };
            /**
            	Get parent of this url.
            	@public
            */
            this.getParent = function() {
                return url_obj["parent"];
            };
            /**
            	Get response time.
            	@public
            */
            this.getResponseTime = function() {
                return url_obj["response_time"];
            };
            /**
            	Get HTML content.
            	@public
            */
            this.getHTMLContent = function() {
                return url_obj["content"];
            };
            /**
            	Get parsed content.
            	@public
            */
            this.getParsedContent = function() {
                return url_obj["parsed_content"];
            };
            /**
            	Returns indexed status.
            	@public
            */
            this.isIndexed = function() {
                return url_obj["isIndexed"];
            };
            /**
            	Returns parsed status.
            	@public
            */
            this.isParsed = function() {
                return url_obj["isParsed"];
            };
        };
        return new URL(url);
    };

    function msg() {
        log.put(arguments[0], arguments[1], __filename.split('/').pop());
    }


};

module.exports = URLCreator;