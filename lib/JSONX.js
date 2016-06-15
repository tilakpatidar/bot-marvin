
/**
	JSON implementation which supports RegExp storage.
	@author Tilak Patidar <tilakpatidar@gmail.com>
	@constructor
	@param {Object} json_obj

*/
var JSONX = function(json_obj){

	var obj = json_obj;
	var that = this;

	/**
		Returns Object representation
		@public
		@returns {Object}
	*/
	this.get = function (){
		return obj;
	};

	/**
		Sets object
		@public
	*/
	this.set = function(ob){
		obj = ob;
	};

	/**
		Returns regex safe json.
		@public
		@returns {String}

	*/
	this.toString = function(){
		return that.stringify();
	};

	/**
		Replaces regex with __REGEXP
		@private
		@param {Object} key
		@param {Object} value
	*/
	var replacer=function (key, value) {
		  if (value instanceof RegExp)
		    return ("__REGEXP " + value.toString());
		  else
		    return value;
	};

	/**
		Returns regex safe json.
		@public
		@returns {String}

	*/
	this.stringify=function(){
		return JSON.stringify(obj, replacer, 2);
	};


	
};

/**
	Parses a jsonx string to Object
	@static
	@param {String} js_str
*/
JSONX.parse=function(js_str){

			var reviver=function(key, value) {
				  if (value.toString().indexOf("__REGEXP ") == 0) {
				    var m = value.split("__REGEXP ")[1].match(/\/(.*)\/(.*)?/);
				    return new RegExp(m[1], m[2] || "");
				  } else
				    return value;
			};
		return JSON.parse(js_str, reviver);
};


module.exports = JSONX;
