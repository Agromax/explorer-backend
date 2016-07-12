var model = require('../lib/model');
var fs = require('fs');
var Promise = require('promise');


var Triple = model.Triple;
var TripleStore = model.TripleStore;


var content = fs.readFileSync('E:\\Thesis Data\\Scripts\\out.json');
var json = JSON.parse(content);

json.forEach(function (tobj) {
    var triplePromises = [];
    tobj.triplets.forEach(function (t) {
        var triple = new Triple({
            sub: t.sub,
            pre: t.pre,
            obj: t.obj
        });
        triplePromises.push(
            triple.save(function (err, tt) {
                if (err) {
                    console.log(err);
                }
            })
        );
    });

    Promise.all(triplePromises).then(function (done) {
        console.log("All done!");
    });
});


