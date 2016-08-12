var check = require("check-types")
var parent_dir = process.getAbsolutePath(__dirname);
var _ = require("underscore");
/**
	Represent scoring for buckets.
	@author Tilak Patidar <tilakpatidar@gmail.com>
	@constructor
	@param {Message} message_obj

*/
var Score = function(message_obj) {
    var message = message_obj;
    var config = message.get('config');

    /**
    	Returns the bucket with added score field.
    	@param {Object} hashes

    */
    this.getScore = function(hashes) {
        var domain_priorities = message.get('links_store');
        _.each(hashes, function(obj){
            var links = obj["links"];
            var numOfLinks = links.length;
            if (!check.assigned(links)) {
                hashes[key]["score"] = parseInt(0);
                return;
            }
            var len = links.length;
            var added = 0;
            for (var i = 0; i < links.length; i++) {
                var link = links[i]['url'];
                //console.log(links[i]);
                var splits = link.split("/");
                if (check.emptyString(splits[splits.length - 1])) {
                    splits.pop();
                }
                var new_mul = 101 - domain_priorities[links[i]['domain']]["priority"];
                if (!check.assigned(new_mul) || !check.number(new_mul)) {
                    new_mul = 100; //lowest priority 1
                }



                added += (splits.length * new_mul);

            };
            var nLinks = config.getConfig("batch_size") / len;
            hashes[key]["score"] = parseInt((added / len) * nLinks);
            if (!check.number(hashes[key]["score"])) {
                hashes[key]["score"] = 0;
            }
        };
        return hashes;
    }



};

module.exports = Score;