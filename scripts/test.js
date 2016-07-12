var model = require('../lib/model');
var fs = require('fs');
var Promise = require('promise');


var Triple = model.Triple;
var TripleStore = model.TripleStore;


var q = "arid";

Triple.find({
    $or: [
        {sub: {$regex: q, $options: "$i"}},
        {pre: {$regex: q, $options: "$i"}},
        {obj: {$regex: q, $options: "$i"}}
    ]

}, function (err, res) {
    if (err) {
        return console.log(err);
    }
    console.log(res);
});
