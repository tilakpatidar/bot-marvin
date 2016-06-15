var assert = require('chai').assert;

var ObjectX = require("../../lib/ObjectX.js");

describe('Testing ObjectX', function() {

    it('check equivalent for number number', function () {
    	var status = ObjectX.isEquivalent(5,5);
        assert(status, "Number are not getting equivalent");
    });

    it('check equivalent for float float', function () {
        var status = ObjectX.isEquivalent(5.0,5.0);
        assert(status, "Float are not getting equivalent");
    });
    it('check equivalent for number float', function () {
        var status = ObjectX.isEquivalent(5.0,5);
        assert(status, "Number Float are not getting equivalent");
    });

    it('check equivalent for string', function () {
        var status = ObjectX.isEquivalent("hell","hell");
        assert(status, "String are not getting equivalent");
    });

    it('check equivalent for arrays', function () {
        var status = ObjectX.isEquivalent([1,2,3],[3,1,2]);
        assert(status, "arrays order are not getting equivalent");
        var status = ObjectX.isEquivalent([1,2,3],[1,2,3]);
        assert(status, "arrays are not getting equivalent");
    });

    it('check equivalent for nested objects', function () {
        var status = ObjectX.isEquivalent({"hell":"bells","t":[1,2]},{"hell":"bells","t":[1,2]});
        assert(status, "Nested objects are not getting equivalent");
    });
    it("check null and undefined",function(){
        assert(ObjectX.isEquivalent(undefined, null), "undefined and null case not working");
        assert(ObjectX.isEquivalent(null, undefined), "null and undefined case not working");
        assert(ObjectX.isEquivalent(null, null), "null and null case not working");
        assert(ObjectX.isEquivalent(undefined, undefined), "undefined and undefined case not working");
    });


 
});