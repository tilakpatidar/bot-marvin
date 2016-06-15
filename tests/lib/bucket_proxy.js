var assert = require('chai').assert;

var bucket = require("../../lib/bucket_proxy.js");

describe('Testing Bucket Proxy', function() {

    it('check cache limit', function () {
    	var b = new bucket(1000);
    	var arr = [];
    	var yes =[];
    	var no = [];
    	for (var i = 0; i < 1200; i++) {
    		var url = {url: "http://www.google.com/"+i, domain: "http://www.google.com", level: 1};
    		var status = b.pushURL(url);
    		status ? yes.push(status) : no.push(status);
    	};

    	assert(no.length === 200 && yes.length === 1000, "cache limit not working");

    });

    it("check fetchURLs",function(){
		var b = new bucket(1000);
    	var arr = [];
    	var yes =[];
    	var no = [];
    	for (var i = 0; i < 1200; i++) {
    		var url = {url: "http://www.google.com/"+i, domain: "http://www.google.com", level: 1};
    		var status = b.pushURL(url);
    		status ? yes.push(status) : no.push(status);
    	};

    	assert(b.fetchURLs("http://www.google.com",10000).length === 1000, "fetch not working");
    	assert(b.fetchURLs("http://www.google.com",10000).length === 0, "fetch not working");
    	
    });

});

