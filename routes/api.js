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
var async = require('async');

var dbfParser;
var cluster = require('cluster');
var numCPUs = require('os').cpus().length;
var dbLock = 0;
var dataBuffer;

router.get('/', function (req, res, next) {
    res.render('api', {title: 'KLADR-API'});
});

router.get('/cluster', function (req, res, next) {
    console.log(cluster);
    if (cluster.isMaster) {
        // Fork workers.
        for (var i = 0; i < numCPUs; i++) {
            cluster.fork();
        }

        cluster.on('exit', function (worker, code, signal) {
            console.log('worker ' + worker.process.pid + ' died');
        });
    } else {
        // Workers can share any TCP connection
        // In this case it is an HTTP server
        console.log('worker else!');

    }
    res.send('Готово');
});

router.get('/import', function (req, res, next) {
    var record, recordsCount;
    var i = 0;
    var request = [];
    var rowsNumder = 1;

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

        console.log(tableDBF.file + ': ' + 'START READ row: ' + recordsCount);

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

            console.log(tableDBF.file + ': ' + "fs success read id: " + i);

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
        console.log('Finish read file: ' + tableDBF.file);
    });

    if (dbLock === 0) dbfParser.parse();
});

var j = 0;
var startDbRecordTime; //milliseconds
var finishDbRecordTime; //milliseconds
var connection;

eventEmitter.on('record_mysql_table', function (mysql_table, data, recordsCount) {
    j++;
    dbLock++;
    if (j == 1) {
        startDbRecordTime = new Date().getTime();
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
            console.log('START MySQL CONNECTION');
        });
        //Clear table
        eventEmitter.emit('reset_mysql_table', connection, mysql_table);
    }

    process.nextTick(function () {
        recordInMySQLTable(mysql_table, data, recordsCount);
    });


});

function recordInMySQLTable(mysql_table, data, recordsCount) {
    connection.query('INSERT INTO ?? SET ?', [mysql_table, data],
        function (error) {
            if (error !== null) {
                console.log(mysql_table + ': ' + 'mysql success record id:' + data.id);
                console.log(mysql_table + ': ' + "text error: " + error);
            } else {
                console.log(mysql_table + ': ' + 'mysql success record id:' + data.id);
                //if (recordsCount == data.id) process.exit();  //Завершить работу сервера по окончанию работы
            }
            if (recordsCount == data.id) {

                connection.end(function () {
                    finishDbRecordTime = new Date().getTime();
                    console.log(mysql_table + ': ' + 'Finish MySQL connection.Record time: ' + (finishDbRecordTime - startDbRecordTime));
                });

                j = 0;
                dbLock = 0;
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
