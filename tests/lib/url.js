var assert = require('chai').assert;

var URL = require("../../lib/url.js");
var Message = require("../../lib/message.js");
var JSONX = require("../../lib/JSONX.js");
var conf = require("../../config/config.js").load();
var check = require('check-types');

process.RUN_ENV = "TEST";
var message_obj = new Message();

var config = {};

config.getConfig = function(){
        //console.log(DB_CONFIG,"WHEN called");
        var val = conf;
        if (!check.assigned(arguments[0])) {
            return conf;
        }
        for (var i = 0; i < arguments.length; i++) {

            
            val = val[arguments[i]];
            

        };
        return val;
    
};

message_obj.set('config', config);
message_obj.set('links_store', {"http://www.google.com":{"limit_depth": 3}});

var regex_urlfilter = {};
regex_urlfilter["accept"] = config.getConfig("accept_regex");
regex_urlfilter["reject"] = config.getConfig("reject_regex");

//console.log(regex_urlfilter);
message_obj.set('regex_urlfilter', regex_urlfilter);

var url_obj  = new URL(message_obj);



describe('Testing URL', function() {

    it('getFileType -> webpage', function () {
    	
        var u = url_obj.url("http://www.google.com");
        assert.equal(u.details.file_type, 'webpage');

    });


    it('getFileType -> file', function () {
        
        var u = url_obj.url("http://www.google.com/tilak.docx");
        assert.equal(u.details.file_type, 'file');

    });

    it('extractDomain',function(){

        var u = url_obj.url("http://www.google.com/tilak.docx");
        assert.equal(u.details.domain, 'http://www.google.com');

        var u = url_obj.url("http://www.google.com/tilak");
        assert.equal(u.details.domain, 'http://www.google.com');

        var u = url_obj.url("/tilak"); //relative url with no domain or parent info will be rejected
        assert.equal(u.details.accepted, false);
        assert.equal(u.details.domain, undefined);

    });

    it("normalize protocol", function(){


        var u = url_obj.url("https://www.google.com/tilak.docx");
        assert.equal(u.details.url, "http://www.google.com/tilak.docx");
        var u = url_obj.url("http://www.google.com/tilak.docx");
        assert.equal(u.details.url, "http://www.google.com/tilak.docx");
        var u = url_obj.url("www.google.com/tilak.docx"); //no protocol present rejected
        assert.equal(u.details.accepted, false);
        assert.equal(u.details.url, "http://www.google.com/tilak.docx");
    

    });

    it("sorted params",function(){
        var u = url_obj.url("https://www.google.com/tilak.docx?z=20&a=5");
        assert.equal(u.details.url, "http://www.google.com/tilak.docx?a=5&z=20");
        var u = url_obj.url("https://www.google.com/tilak.docx?z=20&a=tilak patidar");
        assert.equal(u.details.url, "http://www.google.com/tilak.docx?a=tilak%20patidar&z=20");
    });

    it("normalizeURL", function(){
        var u = url_obj.url("http://www.google.com/tilak.docx/#home");
        assert.equal(u.details.url, "http://www.google.com/tilak.docx");

        var u = url_obj.url("http://www.google.com/tilak.docx/");
        assert.equal(u.details.url, "http://www.google.com/tilak.docx");
    });

    it("nutchStyleUrl", function(){

        var u = url_obj.url("http://www.google.com/tilak.docx");
        assert.equal(u.details.nutch_key, "com.google.www:http/tilak.docx");


    });

    it("isAccepted", function(){

        var u = url_obj.url("http://www.yahoo.com/tilak.docx", "http://www.google.com");
        assert.equal(u.details.accepted, false, "different domain and url check failed");

        var u = url_obj.url("http://www.google.com/tilak.docx", "http://www.google.com");
        assert.equal(u.details.accepted, true, "tika accepted regex check failed");

        var u = url_obj.url("http://www.google.com/tilak.gif", "http://www.google.com");
        assert.equal(u.details.accepted, false, "tika reject regex check failed");

        var u = url_obj.url("http://www.google.com/a/b/c", "http://www.google.com");
        assert.equal(u.details.accepted, true, "limit depth till equal value failed");

        //limit_depth check
        var u = url_obj.url("http://www.google.com/a/b/c/d", "http://www.google.com");
        assert.equal(u.details.accepted, false, "limit depth check failed");
	var u = url_obj.url("http://www.telegraphindia.com/1160812/jsp/northeast/story_102047.jsp", "http://www.telegraphindia.com");
	console.log(u.details.accepted);

    });
    
 
});
