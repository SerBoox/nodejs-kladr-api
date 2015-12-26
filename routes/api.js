var express = require('express');
var router = express.Router();
DBFParser = require('dbfkit-fork/lib/DBFParser');
var events = require('events');
var eventEmitter = new events.EventEmitter();
var merge = require('merge'), original, cloned;

/* GET home page. */
router.get('/', function (req, res, next) {

    var data = [];
    var i = 0;
    var recordsCount = 0;

    var pathName = './public/dbf/';

    //var fileName = 'ALTNAMES.DBF'; //62 655 строк
    //var fileName = 'DOMA.DBF'; //2 657 477 строк
    //var fileName = 'FLAT.DBF'; //0 строк
    //var fileName = 'KLADR.DBF'; //220 186 строк
    var fileName = 'SOCRBASE.DBF'; //167 строк
    //var fileName = 'STREET.DBF'; //1 103 363 строк

    dbfParser = new DBFParser(pathName + fileName, "CP866");

    dbfParser.on('head', function (head) {
        //return console.log(head);
        recordsCount = head.recordsCount;
    });

    dbfParser.on('record', function (record) {
        //console.log(record);
        //eventEmitter.emit('dataModified', record);
    });

    dbfParser.on('end', function () {
        //return console.log('finish');
    });

    dbfParser.parse();

    eventEmitter.on('dataModified', function (record) {
        i++;
        if (Array.isArray(record)){
            if(record[0].id === undefined)
                record.unshift({id:i});
            else
                record[0] = {id:i};
            //Buffering
            data.push(record);
        }
        //Show result
        if (i === recordsCount) {
            //data = JSON.stringify(data);
            res.send(data);
            //res.send(record);
        }
    });
    i = 0;
});

module.exports = router;
