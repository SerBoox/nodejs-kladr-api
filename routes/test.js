var express = require('express');
var router = express.Router();
DBFParser = require('dbfkit-fork/lib/DBFParser');
var events = require('events');
var eventEmitter = new events.EventEmitter();
var iconv = require('iconv-lite');



/* GET home page. */
router.get('/iconv', function (req, res, next) {

    data = '';
    data += '</br>Поддержка CP852 -> ' + iconv.encodingExists('CP932');
    data += '</br>Поддержка 866 -> ' + iconv.encodingExists('866');
    data += '</br>Поддержка OEM -> ' + iconv.encodingExists('OEM');
    data += '</br>Поддержка OEM866 -> ' + iconv.encodingExists('OEM866');
    data += '</br>Поддержка OEM-866 -> ' + iconv.encodingExists('OEM-866');
    res.send(data);
});

/* POST home page. */
router.post('/region/number', function(req, res, next) {
    res.send({
        request: req.body,
        method: req.method

    });
    console.log(req);
});

module.exports = router;
