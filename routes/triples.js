var express = require('express');
var crypto = require('crypto');
var path = require('path');
var fs = require('fs');
var Promise = require('promise');

var models = require('../lib/model');
var hash = require('../lib/hash');

var router = express.Router();

var Triple = models.Triple;

/**
 * Searches the triple database
 * TODO Implement pagination in the queries and improvise limits on the search results
 */
router.get('/search', function (req, res, next) {
    var q = req.query.q;
    if (!q || q.length < 3) {
        return res.json({
            code: -1,
            msg: "Invalid query. Query length must be >= 3"
        });
    }
    Triple.find({
        $or: [
            {sub: {$regex: q, $options: "$i"}},
            {pre: {$regex: q, $options: "$i"}},
            {obj: {$regex: q, $options: "$i"}}
        ]
    }, function (err, u) {
        if (err) {
            console.log(err);
            res.json({
                code: -1,
                msg: err
            });
        } else {
            res.json({
                code: 0,
                msg: u
            })
        }
    });
});

module.exports = router;
