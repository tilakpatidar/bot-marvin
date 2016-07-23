/**
	
	Creates a lock. Using semaphore concept.
	Not for multiprocessing but for single entry, while executing code in setInterval.
	@constructor
	@author Tilak Patidar <tilakpatidar@gmail.com>

*/

var Lock = function() {


    /**
    	Semaphore counter.
    	@private
    	@type {Number}
    */
    var semaphore = 0;
    var that = this;

    /**
    	Last lock time.
    	@private
    	@type {Date}

    */
    var date_obj = null;


    /**
    	Request access.
    	@public
    	@returns {boolean} - status if allowed or not

    */
    this.enter = function() {

        if (semaphore == 0) {
            semaphore++;
            date_obj = new Date();
            return true;
        }

        return !that.isLocked();

    };


    /**
    	Check if resource locked
    	@public
    	@returns {boolean} - status if locked or not

    */
    this.isLocked = function() {

        return semaphore !== 0;
    };


    /**
    	Release the resource.
    	@public
    	@returns {boolean} - status if released or not

    */
    this.release = function() {
        semaphore = 0;
        date_obj = null;
        return true;
    };


    /**
    	Get last time of resource locked.
    	@public
    	@returns {Date} - last lock acquire timestamp

    */
    this.getLastLockTime = function() {
        if (date_obj == null) return null;
        return date_obj.getTime();
    };


    /**
        Lock or unlocks the resource.
        @public
        @param {boolean} status - true to lock, false to unlock 

    */
    this.setLocked = function(status) {
        if (status) {
            semaphore = 1;
            date_obj = new Date();
        } else {
            semaphore = 0;
            date_obj = null;
        }
    }

};


module.exports = Lock;