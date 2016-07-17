var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', {title: 'Express'});
});


router.get('/vocab', function (req, res, next) {
    res.download('./assets/vocabulary.json');
});


module.exports = router;
