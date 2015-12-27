var express = require('express');
var router = express.Router();
//DBFParser = require('dbfkit-fork/lib/DBFParser');
ParserDBF = require('../controllers/ParserDBF');
var events = require('events');
var eventEmitter = new events.EventEmitter();
var merge = require('merge'), original, cloned;
var mysql = require('mysql');
var parameters = require('../config/parameters.json');
var getMySQLObject = require('../controllers/getMySQLObject.js');
var dbLock = 0;
var dataBuffer;

/* GET home page. */
router.get('/', function (req, res, next) {
    var record, recordsCount;
    var i = 0;
    var request = [];
    var rowsNumder = 10000;

    if (dbLock !== 0) {
        return res.send({
            read: i,
            write: j
        });
    }

    //var tableDBF = parameters.DBF.ALTNAMES;
    var tableDBF = parameters.DBF.DOMA;
    //var tableDBF = parameters.DBF.FLAT;
    //var tableDBF = parameters.DBF.KLADR;
    //var tableDBF = parameters.DBF.SOCRBASE;
    //var tableDBF = parameters.DBF.STREET;

    dbfParser = new ParserDBF(tableDBF.path + tableDBF.file, tableDBF.charset, rowsNumder);

    dbfParser.on('head', function (head) {
        //return console.log(head);
        if (rowsNumder === 0)
            recordsCount = head.recordsCount;
        else
            recordsCount = rowsNumder;

        console.log('Start Read File: ' + tableDBF.file + '.Row: ' + recordsCount);

        //Указываем максимальное число эмиттеров
        if (recordsCount < 70)
            eventEmitter.setMaxListeners(70);
        else
            eventEmitter.setMaxListeners(recordsCount);
    });

    dbfParser.on('record', function (data) {
        i++;
        if (Array.isArray(data) && (
                (rowsNumder === 0) || (rowsNumder >= i)
            )) {
            if (data[0].id === undefined)
                data.unshift({id: i});
            else
                data[0] = {id: i};

            console.log("record id: " + i);

            data.forEach(function (currentValue, index) {
                if (currentValue.value == null)
                    data[index].value = '';
            });

            var object = getMySQLObject(tableDBF.mysql_table, data);

            //Enable Record Emitter
            eventEmitter.emit('record_mysql_table', tableDBF.mysql_table, object, recordsCount);
        } else
            return;

        //Show result
        if (i === recordsCount) {
            dataBuffer = data;
            res.send(data); //Show data
            i = 0;
        }
    });


    dbfParser.on('end', function () {
        if (recordsCount == 0) res.send('File: ' + tableDBF.file + ' is empty.'); //Show Data
        return console.log('Finish read file: ' + tableDBF.file);
    });

    dbfParser.parse();
});

var j = 0;
var startDbRecordTime; //milliseconds
var finishDbRecordTime; //milliseconds
var connection;

eventEmitter.on('record_mysql_table', function (mysql_table, data, recordsCount) {
    j++;
    dbLock++;
    if (j == 1) {
        //Parameters MySQL connection
        var tableMySQL = parameters.DataBase.kladr_dbf;
        connection = mysql.createConnection({
            host: tableMySQL.host,
            port: tableMySQL.port,
            connectTimeout: 120000,
            database: tableMySQL.name,
            user: tableMySQL.user,
            password: tableMySQL.password
        });
        //MySQL Connection
        connection.connect(function () {
            console.log('Start MySQL connection');
        });
    }

    if (j == 1) {
        eventEmitter.emit('reset_mysql_table', connection, mysql_table);
        startDbRecordTime = new Date().getTime();
        recordInMySQLTable(mysql_table, data);
    } else
        recordInMySQLTable(mysql_table, data);

    if (j == recordsCount) {
        connection.end(function () {
            finishDbRecordTime = new Date().getTime();
            console.log('Finish MySQL connection.Record time: ' + (finishDbRecordTime - startDbRecordTime));
        });
        j = 0;
        dbLock = 0;
    }
});
function recordInMySQLTable(mysql_table, data) {
    connection.query('INSERT INTO ?? SET ?', [mysql_table, data],
        function (error) {
            if (error !== null) {
                console.log("MySQL id: " + j);
                console.log("MySQL Error: " + error);
            }
        }
    );
}

eventEmitter.on('reset_mysql_table', function (connection, mysql_table) {
    //Clear Table "TRUNCATE TABLE  `socrbase`"
    connection.query('TRUNCATE TABLE  ??', mysql_table,
        function (error) {
            if (error !== null) {
                console.log("MySQL Clear Table Error: " + error);
            } else
                console.log('Очистка базы: `' + mysql_table + '` прошла успено!');
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

module.exports = router;
