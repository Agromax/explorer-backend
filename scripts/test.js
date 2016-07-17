var model = require('../lib/model');
var fs = require('fs');
var Promise = require('promise');


var Triple = model.Triple;
var TripleStore = model.TripleStore;


var q = "arid";
//
// Triple.find({
//     $or: [
//         {sub: {$regex: q, $options: "$i"}},
//         {pre: {$regex: q, $options: "$i"}},
//         {obj: {$regex: q, $options: "$i"}}
//     ]
//
// }, function (err, res) {
//     if (err) {
//         return console.log(err);
//     }
//     console.log(res);
// });

function shuffle(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}

var goodOnes = [];
var count = 10;
Triple.find().then(function (ts) {
    ts.forEach(function (t) {
        var sub = t.sub;
        var pre = t.pre;
        var obj = t.obj;
        if (sub.length > 10 && pre.length > 10 && obj.length > 10) {
            if (count > 0) {
                goodOnes.push(t);
            }
            else {
                return;
            }
        }
    })
    goodOnes = shuffle(goodOnes);
    var test = goodOnes.slice(1, 101);

    // fs.writeFileSync("test.txt", test.toSource());
    console.log(test);
});


