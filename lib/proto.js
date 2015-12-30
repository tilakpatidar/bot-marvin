
var JSONX={};
JSONX.replacer=function (key, value) {
	  if (value instanceof RegExp)
	    return ("__REGEXP " + value.toString());
	  else
	    return value;
};
JSONX.reviver=function(key, value) {
	  if (value.toString().indexOf("__REGEXP ") == 0) {
	    var m = value.split("__REGEXP ")[1].match(/\/(.*)\/(.*)?/);
	    return new RegExp(m[1], m[2] || "");
	  } else
	    return value;
};
JSONX.stringify=function(js){
	return JSON.stringify(js, JSONX.replacer, 2);
};
JSONX.parse=function(js){
	return JSON.parse(js, JSONX.reviver);
};

if (!Array.prototype.find) {
  Array.prototype.find = function(predicate) {
    if (this === null) {
      throw new TypeError('Array.prototype.find called on null or undefined');
    }
    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }
    var list = Object(this);
    var length = list.length >>> 0;
    var thisArg = arguments[1];
    var value;

    for (var i = 0; i < length; i++) {
      value = list[i];
      if (predicate.call(thisArg, value, i, list)) {
        return value;
      }
    }
    return undefined;
  };
}
function isEquivalent(a, b) {
  if (typeof a !== typeof b){
    return false;
  }
  if(typeof a==="number"){
    if(a===b){
      return true;
    }
    else{
      return false;
    }
  }
  else if(typeof a ==="string"){
    if(a===b){
      return true;
    }
    else{
      return false;
    }
  }
    // Create arrays of property names
    var aProps = Object.getOwnPropertyNames(a);
    var bProps = Object.getOwnPropertyNames(b);

    // If number of properties is different,
    // objects are not equivalent
    if (aProps.length != bProps.length) {
        return false;
    }

    for (var i = 0; i < aProps.length; i++) {
        var propName = aProps[i];

        // If values of same property are not equal,
        // objects are not equivalent
        if(typeof a[propName] ==="object"){
          if (!isEquivalent(a[propName],b[propName])){
            return false;
          }
        }
        else{
          if (a[propName] !== b[propName]) {
              return false;
          }
        }
        
    }

    // If we made it this far, objects
    // are considered equivalent
    return true;
};
var d={
  'isEquivalent':isEquivalent
};
module.exports.JSONX=JSONX;
module.exports.ObjectX=d;
module.exports.getAbsolutePath=function(dirname){
  var temp=dirname.split("/");
  temp.pop();
  var parent_dir=temp.join("/");
  return parent_dir;
}