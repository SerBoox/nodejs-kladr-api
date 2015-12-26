var express = require('express');
var router = express.Router();
DBFParser = require('dbfkit-fork/lib/DBFParser');
var events = require('events');
var eventEmitter = new events.EventEmitter();
var merge = require('merge'), original, cloned;
var mysql = require('mysql');
var parameters = require('../config/parameters.json');
var getMySQLObject = require('../controllers/getMySQLObject.js');

/* GET home page. */
router.get('/', function (req, res, next) {

    var request = [];
    var i = 0;

    var record;
    var connection;
    var recordsCount = 0;

    //Parameters MySQL connection
    var tableMySQL = parameters.DataBase.kladr_dbf;
    connection = mysql.createConnection({
        host: tableMySQL.host,
        port: tableMySQL.port,
        database: tableMySQL.name,
        user: tableMySQL.user,
        password: tableMySQL.password
    });
    //MySQL Connection
    connection.connect(function () {
        console.log('Start MySQL connection');
    });

    //var tableDBF = parameters.DBF.ALTNAMES;
    //var tableDBF = parameters.DBF.DOMA;
    //var tableDBF = parameters.DBF.FLAT;
    //var tableDBF = parameters.DBF.KLADR;
    var tableDBF = parameters.DBF.SOCRBASE;
    //var tableDBF = parameters.DBF.STREET;

    dbfParser = new DBFParser(tableDBF.path + tableDBF.file, tableDBF.charset);

    dbfParser.on('head', function (head) {
        //return console.log(head);
        recordsCount = head.recordsCount;
        //Указываем максимальное число эмиттеров
        eventEmitter.setMaxListeners(recordsCount);
    });

    dbfParser.on('record', function (data) {
        i++;
        if (Array.isArray(data)) {
            if (data[0].id === undefined)
                data.unshift({id: i});
            else
                data[0] = {id: i};

            data.forEach(function(currentValue,index){
              if(currentValue.value == null)
                  data[index].value = '';
            });

            var object = getMySQLObject(tableDBF.mysql_table,data);

            //Enable Record Emitter
            eventEmitter.emit('record_mysql_table', connection, tableDBF.mysql_table, object, recordsCount);

            //Buffering Requesr Result
            //request.push(data);
        }

        //Show result
        if (i === recordsCount) {
            res.send(data);
        }
    });
    i = 0;

    dbfParser.on('end', function () {
        return console.log('Finish read file: ' + tableDBF.file);
    });

    dbfParser.parse();

});

eventEmitter.on('reset_mysql_table', function (connection, mysql_table) {
    //Clear Table "TRUNCATE TABLE  `socrbase`"
    connection.query('TRUNCATE TABLE  ??', mysql_table,
        function (error) {
            if (error !== null) {
                console.log("MySQL Clear Table Error: " + error);
            }
        }
    );
});

eventEmitter.on('reset_mysql_table', function (connection, mysql_table) {
    //Reset AUTO_INCREMENT values  "ALTER TABLE  `socrbase` AUTO_INCREMENT = 1;"
    connection.query('ALTER TABLE  ?? AUTO_INCREMENT = 1', mysql_table,
        function (error) {
            if (error !== null) {
                console.log("MySQL Reset AUTO_INCREMENT Error: " + error);
            }
        }
    );
});

var j = 0;
var startDbRecordTime; //milliseconds
var finishDbRecordTime; //milliseconds
eventEmitter.on('record_mysql_table', function (connection, mysql_table, data, recordsCount) {
    j++;
    if (j === 1) {
        eventEmitter.emit('reset_mysql_table', connection, mysql_table);
        startDbRecordTime = new Date().getTime();
    }

    connection.query('INSERT INTO ?? SET ?', [mysql_table, data],
        function (error) {
            if (error !== null) {
                console.log("MySQL id: " + j);
                console.log("MySQL Error: " + error);
            }
        }
    );
    if (j === recordsCount) {
        connection.end(function () {
            finishDbRecordTime = new Date().getTime();
            console.log('Finish MySQL connection.Record time: ' + (finishDbRecordTime - startDbRecordTime));
        });
        j = 0;
    }
});

module.exports = router;
