var express = require('express');
var crypto = require('crypto');
var path = require('path');
var fs = require('fs');
var multer = require('multer');

var Promise = require('promise');
var mongoose = require('mongoose');
var sanitizer = require('sanitizer');

var models = require('../lib/model');
var hash = require('../lib/hash');

var router = express.Router();

var Triple = models.Triple;
var User = models.User;
var MetaStore = models.MetaStore;


function getExtension(name) {
    var dot = name.lastIndexOf('.');
    if (dot >= 0) {
        return name.slice(dot + 1);
    }
    return null;
}

var storage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, path.join(process.cwd(), 'public', 'uploads'));
    },
    filename: function (req, file, callback) {
        var md5sum = crypto.createHash('md5');
        md5sum.update(file.originalname);
        console.log("Original name: " + file.originalname);
        var ext = getExtension(file.originalname) || "";
        callback(null, Math.random().toString(36).slice(2, 10) + '_' + md5sum.digest('hex') + '_' + Date.now() + "." + ext);
    }
});

// Set the upload limit to 2 MiB and the field name to payload
// TODO: add more filters on the file
var upload = multer({storage: storage, fileSize: 10 * 1024 * 1024}).single('image');


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
 * This route tries to connect two concepts by finding triples whose edges contain the concepts
 */
router.get('/connect', function (req, res, next) {
    var p = req.query.p;
    var q = req.query.q;
    if (!p) {
        return res.json({
            code: -1,
            msg: "Invalid request, parameter 'p' not specified"
        });
    }
    if (!q) {
        return res.json({
            code: -1,
            msg: "Invalid request, parameter 'q' not specified"
        });
    }

    Triple.find({
        $and: [
            {sub: {$regex: p, $options: "$i"}},
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


/**
 * Parameters: id, type: string, desc: id of the triple
 */
router.get('/text', function (req, res, next) {
    var tripleId = req.query.id;
    if (!tripleId) {
        return res.json({
            code: -1,
            msg: 'Invalid request, "triple-id" not provided'
        });
    }

    MetaStore.find({
        tripleId: tripleId
    }, function (err, triples) {
        if (err) {
            console.log(err);
            return res.json({
                code: -1,
                msg: err
            });
        }
        res.json({
            code: 0,
            msg: triples
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


router.get('/image', function (req, res, next) {
    var tripleId = req.query.id;
    if (!tripleId) {
        return res.json({
            code: -1,
            msg: 'Invalid request, "triple-id" not provided'
        });
    }

    MetaStore.find({
        tripleId: tripleId
    }, function (err, t) {
        if (err) {
            console.log(err);
            return res.json({
                code: -1,
                msg: err
            });
        }
        return res.json({
            code: -1,
            msg: t.filter(function (tt) {
                return tt.contentType !== 'text';
            })
        });
    });
});


router.post('/image', function (req, res, next) {
    upload(req, res, function (err) {
        if (err) {
            console.log("Beginners luck");
            console.log(err);
            return res.json({code: -1, msg: err});
        }

        var userId = req.body.user;
        var token = req.body.sessionToken;
        var tripleId = req.body.triple;

        console.log("User", userId);

        User.findOne({
            _id: userId
        }).then(function (u) {
            if (u) {
                if (u.sessionToken === token) {
                    var storagePath = req.file.path;
                    console.log("sp::" + storagePath);

                    var ms = new MetaStore({
                        tripleId: mongoose.Types.ObjectId(tripleId),
                        userId: mongoose.Types.ObjectId(userId),
                        contentType: req.file.mimetype,
                        content: storagePath,
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
                    return res.json({
                        code: -1,
                        msg: "Not authorized"
                    });
                }
            } else {
                return res.json({
                    code: -1,
                    msg: "Invalid User"
                });
            }
        });
    });
});

module.exports = router;
