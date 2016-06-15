var assert = require('chai').assert;

var JSONX = require("../../lib/JSONX.js");

describe('Testing JSONX', function() {

    it('check getters and setters', function () {
    	var jsonx_obj = new JSONX({"tilak":/Tilak/gi});
    	assert.typeOf(jsonx_obj.get(), 'object');
    	jsonx_obj.set({"tilak":/Tilak/gi});
    	assert.typeOf(jsonx_obj.get(), 'object');
    });

    it("check jsonx regex escape",function(){
    	var jsonx_obj = new JSONX({"tilak":/Tilak/gi});
    	var jsonx_str = jsonx_obj.stringify();
    	assert.typeOf(jsonx_str, 'string');
    	assert(jsonx_str.indexOf("__REGEXP")>=0, "Not escaping regex");
    });


    it("check jsonx revive",function(){
    	var jsonx_obj = new JSONX({"tilak":/Tilak/gi});
    	var jsonx_str = jsonx_obj.stringify();
    	assert.typeOf(jsonx_str, 'string');
    	assert(jsonx_str.indexOf("__REGEXP")>=0, "Not escaping regex");

    	var js = JSONX.parse(jsonx_str);
    	assert.equal(js["tilak"].constructor.name, 'RegExp', "Not reviving jsonx_str");
    });
 
});