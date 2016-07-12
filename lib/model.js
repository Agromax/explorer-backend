var mongoose = require('mongoose');
var hash = require('./hash');

mongoose.connect('mongodb://localhost/intersect');
mongoose.Promise = require('promise');

var LoginHistorySchema = mongoose.Schema({
    startSession: Date,
    endSession: Date
});

var UserSchema = mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    password: String,
    sessionToken: String,
    loginHistory: [LoginHistorySchema]
});

UserSchema.methods.generateToken = function () {
    return hash(Date.now() + "_" + Math.random().toString());
};

UserSchema.statics.findByEmail = function (email, callback) {
    this.findOne({email: email}, function (err, user) {
        if (err) {
            console.error(err);
            callback(null);
        } else {
            callback(user);
        }
    });
};


var ImageStoreSchema = mongoose.Schema({
    storagePath: String,
    imageType: String,
    imageWidth: Number,
    imageHeight: Number,
    fileSize: Number,
    time: Date,
    thumbnails: [{
        storagePath: String,
        thumbHeight: Number,
        thumbWidth: Number
    }],
    belongsTo: mongoose.Schema.Types.ObjectId
});

var TripleSchema = mongoose.Schema({
    sub: String,
    pre: String,
    obj: String
});

var TripleStoreSchema = mongoose.Schema({
    srcTitle: String,
    srcURI: String,
    triplets: [TripleSchema]
});

var MetaStoreSchema = mongoose.Schema({
    tripleId: mongoose.Schema.Types.ObjectId,
    userId: mongoose.Schema.Types.ObjectId,
    contentType: String,
    content: String,
    date: Date
});


var User = mongoose.model('User', UserSchema);
var LoginHistory = mongoose.model('LoginHistory', LoginHistorySchema);
var ImageStore = mongoose.model('Images', ImageStoreSchema);
var Triple = mongoose.model('Triple', TripleSchema);
var TripleStore = mongoose.model('TripleStore', TripleStoreSchema);
var MetaStore = mongoose.model('MetaStore', MetaStoreSchema);


// console.log(mongoose.Types.ObjectId('578496babd93d5e82d3aafb5'));
module.exports.User = User;
module.exports.LoginHistory = LoginHistory;
module.exports.ImageStore = ImageStore;
module.exports.Triple = Triple;
module.exports.TripleStore = TripleStore;
module.exports.MetaStore = MetaStore;