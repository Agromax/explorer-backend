var express = require('express');
var crypto = require('crypto');
var path = require('path');
var fs = require('fs');

var Promise = require('promise');
var mongoose = require('mongoose');
var sanitizer = require('sanitizer');

var models = require('../lib/model');
var hash = require('../lib/hash');

var router = express.Router();

var Triple = models.Triple;
var User = models.User;
var MetaStore = models.MetaStore;


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


/**
 * Returns a triple s a json object
 *
 * Parameters: as: queryString, name: id, paramType: string, desc: id of the triple
 * Returns: triple description, type: json
 */
router.get('/', function (req, res, next) {
    var id = req.query.id;
    if (!id) {
        return res.json({
            code: -1,
            msg: "Invalid request. Triple id not supplied"
        });
    }

    Triple.findOne({
        _id: id
    }, function (err, t) {
        if (err) {
            console.log(err);
            return res.json({
                code: -1,
                msg: err
            });
        }
        res.json({
            code: 0,
            msg: t
        });
    });
});


router.post('/text', function (req, res, next) {
    var content = req.body.content;
    var userId = req.body.user;
    var token = req.body.sessionToken;
    var tripleId = req.body.triple;

    if (!content || !userId || !token || !tripleId) {
        return res.json({
            code: -1,
            msg: 'Invalid request. Some parameters not specified'
        });
    }

    User.findOne({
        _id: userId
    }).then(function (u) {
        if (u) {
            if (u.sessionToken === token) {
                var ms = new MetaStore({
                    tripleId: mongoose.Types.ObjectId(tripleId),
                    userId: mongoose.Types.ObjectId(userId),
                    contentType: "text",
                    content: sanitizer.sanitize(content),
                    date: Date.now()
                });
                ms.save(function (err, ms1) {
                    if (err) {
                        return res.json({
                            code: -1,
                            msg: err
                        });
                    }
                    return res.json({
                        code: 0,
                        msg: ms1
                    });
                });
            } else {
                res.json({
                    code: -1,
                    msg: "Not authorized"
                });
            }
        } else {
            res.json({
                code: -1,
                msg: "Invalid User"
            });
        }
    });
});

module.exports = router;
