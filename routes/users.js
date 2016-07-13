var express = require('express');
var multer = require('multer');
var crypto = require('crypto');
var path = require('path');
var fs = require('fs');
var Promise = require('promise');

var models = require('../lib/model');
var hash = require('../lib/hash');

var router = express.Router();

var User = models.User;
var ImageStore = models.ImageStore;


var storage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, path.join(process.cwd(), 'uploads'));
    },
    filename: function (req, file, callback) {
        var md5sum = crypto.createHash('md5');
        md5sum.update(file.originalname);
        callback(null, Math.random().toString(36).slice(2, 10) + '_' + md5sum.digest('hex') + '_' + Date.now());
    }
});

// Set the upload limit to 2 MiB and the field name to payload
// TODO: add more filters on the file
var upload = multer({storage: storage, fileSize: 2 * 1024 * 1024}).array('payloads');


/* GET users listing. */
router.get('/', function (req, res, next) {
    var id = req.query.id;
    if (!id) {
        return res.json({
            code: -1,
            msg: "Invalid request, parameter 'user-id' not supplied"
        });
    }
    var userQuery = User.findOne({_id: id});
    userQuery.select('name email');
    userQuery.exec(function (err, user) {
        if (err) {
            return res.json({
                code: -1,
                msg: err
            });
        }
        delete user["password"];
        res.json({
            code: 0,
            msg: user
        });
    });
});

/* POST create a new user */
router.post('/', function (req, res, next) {
    var email = req.body.email;
    var name = req.body.name;
    var password = req.body.password;

    var errors = [];
    if (!email) {
        errors.push("Email not provided");
    }

    if (!name) {
        errors.push("Name not provided");
    }

    if (!password || password.length < 6) {
        errors.push("Invalid password. Password length must be greater than 6");
    }

    if (errors.length === 0) {
        User.findByEmail(email, function (u) {
            if (u) {
                res.json({
                    code: -1,
                    msg: ["Email already present in our databases"]
                });
            } else {
                var user = new User({
                    name: name,
                    email: email,
                    password: hash(password)
                });
                user.save(function (err, u) {
                    if (err) {
                        res.json({
                            code: -1,
                            msg: err
                        });
                    } else {
                        res.json({
                            code: 0,
                            msg: u
                        });
                    }
                });
            }
        });
    } else {
        res.json({
            code: -1,
            msg: errors
        });
    }
});


router.post('/login', function (req, res, next) {
    var email = req.body.email;
    var password = req.body.password;
    var errors = [];

    if (!email) {
        errors.push("Email not provided");
    }

    if (!password) {
        errors.push("Password not provided");
    }

    if (errors.length === 0) {
        User.findOne({
            email: email,
            password: hash(password)
        }, function (err, u) {
            if (err) {
                console.log(err);
                res.json({
                    code: -1,
                    msg: err
                });

            } else {
                if (u) {
                    u.sessionToken = u.generateToken();
                    u.save(function (err, u) {
                        if (err) {
                            res.json({
                                code: -1,
                                msg: err
                            });
                        } else {
                            res.json({
                                code: 0,
                                msg: u
                            });
                        }
                    });
                } else {
                    res.json({
                        code: -1,
                        msg: "Invalid username or password"
                    });
                }
            }
        });
    } else {
        res.json({
            code: -1,
            msg: errors
        });
    }

});


router.post('/logout', function (req, res, next) {
    var email = req.body.email;
    var token = req.body.sessionToken;

    if (email && token) {
        User.findOne({
            email: email
        }, function (err, u) {
            if (err) {
                console.log(err);
                res.json({
                    code: -1,
                    msg: err
                });
            } else {
                if (u.sessionToken === token) {
                    u.sessionToken = "";
                    u.save(function (err, u) {
                        if (err) {
                            console.log(err);
                            res.json({
                                code: -1,
                                msg: err
                            });
                        } else {
                            res.json({
                                code: 0,
                                msg: "Done"
                            });
                        }
                    });
                } else {
                    res.json({
                        code: -1,
                        msg: "Not a valid token"
                    });
                }
            }
        })
    } else {
        res.json({
            code: -1,
            msg: 'Invalid request. Parameters missing'
        });
    }
});


router.post('/upload', function (req, res, next) {
    upload(req, res, function (err) {
        if (err) {
            console.log(err);
            return res.json({code: -1, msg: err});
        }
        var token = req.body.sessionToken;
        var userId = req.body.user;

        if (!token || !userId) {
            return res.json({
                code: -1,
                msg: "Invalid request, either session-token or user-id is not specified"
            });
        }

        User.findOne({
            _id: userId
        }).then(function (user) {
            if (user) {
                if (user.sessionToken === token) {
                    var uploadTasks = [];
                    req.files.forEach(function (file) {
                        var image = new ImageStore({
                            storagePath: file.path,
                            fileSize: file.size,
                            imageType: file.mimetype,
                            date: Date.now(),
                            belongsTo: user._id
                        });
                        uploadTasks.push(image.save());
                    });

                    Promise.all(uploadTasks).then(function (u) {
                        res.json({
                            code: 0,
                            msg: {
                                filesUploaded: req.files.length,
                                belongsTo: user._id
                            }
                        });
                    });


                } else {
                    res.json({
                        code: -1,
                        msg: "You are not authorized"
                    });
                }
            } else {
                return res.json({
                    code: -1,
                    msg: "You are not authorized"
                });
            }
        });
    });
});


router.get('/image', function (req, res, next) {
    var id = req.query.id;
    ImageStore.findOne({_id: id}).then(function (image) {
        if (image) {
            res.setHeader('Content-Type', image.imageType);
            res.send(fs.readFileSync(image.storagePath));
            // res.download(image.storagePath);
        } else {
            res.json({
                code: -1,
                msg: "Not found"
            });
        }
    });
});

module.exports = router;
