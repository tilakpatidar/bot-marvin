/**
    Provides all the prototype classes.
    @author Tilak Patidar<tilakpatidar@gmail.com>
    @constructor
*/
var Proto = function(){

};


var JSONX = require("./JSONX.js");
var ObjectX = require("./ObjectX.js");


/**
    Static link to JSONX class
    @static
    @type {JSONX}
*/
Proto.JSONX = JSONX;
/**
    Static link to ObjectX class
    @static
    @type {ObjectX}
*/
Proto.ObjectX = ObjectX;

module.exports = Proto


