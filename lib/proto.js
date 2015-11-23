
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

exports.init=JSONX;