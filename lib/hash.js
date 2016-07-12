var crypto = require('crypto');

function hash(x) {
    var sum = crypto.createHash('sha1');
    sum.update(x);
    return sum.digest('hex');
}

module.exports = hash;
