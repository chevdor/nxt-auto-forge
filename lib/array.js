Array.prototype.equals = function(array) { // jshint ignore:line
    // if the other array is a falsy value, return
    if (!array)
        return false;

    // compare lengths - can save a lot of time 
    if (this.length !== array.length)
        return false;

    for (var i = 0, l = this.length; i < l; i++) {
        // Check if we have nested arrays
        if (this[i] instanceof Array && array[i] instanceof Array) {
            // recurse into the nested arrays
            if (!this[i].equals(array[i]))
                return false;
        } else if (this[i] !== array[i]) {
            // Warning - two different object instances 
            // will never be equal: {x:20} != {x:20}
            return false;
        }
    }
    return true;
};

Array.prototype.contains = function(obj) { // jshint ignore:line
    var i = this.length;
    while (i--) {
        if (this[i] === obj) {
            return true;
        }
    }
    return false;
};

Array.prototype.same = function(obj) { // jshint ignore:line
    var i = this.length;
    while (i--) {
        if (obj.contains(this[i])) {
            // todo
        }
    }
    return false;
};

Array.prototype.remove = function(elem) { // jshint ignore:line
    var index = this.indexOf(elem);
    if (index > -1) {
        this.splice(index, 1);
    }
};
