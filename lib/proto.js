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

/**
    Provides absolute path of the file, from where it is called.
    @static
    @param {String} dirname - pass the __dirname
    @returns {String}
*/
Proto.getAbsolutePath=function(dirname){
  var temp=dirname.split("/");
  temp.pop();
  var parent_dir=temp.join("/");
  return parent_dir;
}

module.exports = Proto


