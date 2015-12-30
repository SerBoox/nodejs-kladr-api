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
var Promise = require('promise');

var dbfParser;
var cluster = require('cluster');
var numCPUs = require('os').cpus().length;
var dbLock = 0;
var dataBuffer, recordsCount, record;
var rowsNumder = 0;

router.get('/', function (req, res, next) {
    res.render('api', {title: 'KLADR-API'});
});

router.get('/cluster', function (req, res, next) {
    console.log(typeof(req.query.rowsnumber));
    if (!isNaN(parseInt(req.query.rowsnumber, 10)) && (parseInt(req.query.rowsnumber, 10) !== 0)) {
        //Число больше 0
        res.send("Это число: " + parseInt(req.query.rowsnumber));
    } else {
        //Не число или число равное 0
        res.send("Это не число: " + parseInt(req.query.rowsnumber));
    }

});

router.get('/import', function (req, res, next) {
    if (dbLock !== 0) {
        return res.send({
            read: i,
            write: j
        });
    }

    if (!isNaN(parseInt(req.query.rows, 10)) && (parseInt(req.query.rows, 10) !== 0)) {
        //Число больше 0
        rowsNumder = parseInt(req.query.rows);
    } else {
        //Не число или число равное 0
        rowsNumder = 0;
    }

    //var tableDBF = parameters.DBF.ALTNAMES;
    //var tableDBF = parameters.DBF.DOMA;
    //var tableDBF = parameters.DBF.FLAT;
    //var tableDBF = parameters.DBF.KLADR;
    //var tableDBF = parameters.DBF.SOCRBASE;
    //var tableDBF = parameters.DBF.STREET;

    parseDBFDocument(parameters.DBF.ALTNAMES, rowsNumder, function (data) {
        console.log('!!!Этап импорта таблицы `ALTNAMES` прошел успешно -> `DOMA`!!!');
        parseDBFDocument(parameters.DBF.DOMA, rowsNumder, function (data) {
            console.log('!!!Этап импорта таблицы `DOMA` прошел успешно-> `FLAT`!!!');
            parseDBFDocument(parameters.DBF.FLAT, rowsNumder, function (data) {
                console.log('!!!Этап импорта таблицы `FLAT` прошел успешно-> `KLADR`!!!');
                parseDBFDocument(parameters.DBF.KLADR, rowsNumder, function (data) {
                    console.log('!!!Этап импорта таблицы `KLADR` прошел успешно-> `SOCRBASE`!!!');
                    parseDBFDocument(parameters.DBF.SOCRBASE, rowsNumder, function (data) {
                        console.log('!!!Этап импорта таблицы `SOCRBASE` прошел успешно-> `STREET`!!!');
                        parseDBFDocument(parameters.DBF.STREET, rowsNumder, function (data) {
                            console.log('!!!Этап импорта таблицы `STREET` прошел успешно. THE END!!!');
                            res.send(data);
                        });
                    });
                });
            });
        });
    });

    eventEmitter.emit('parse_documents');

});
//var i = 0;
function parseDBFDocument(tableDBF, rowsNumder, callback) {
    dbfParser = new ParserDBF(tableDBF.path + tableDBF.file, tableDBF.charset, rowsNumder);

    dbfParser.on('head', function (head) {
        //return console.log(head);
        if (rowsNumder === 0)
            recordsCount = head.recordsCount;
        else if (head.recordsCount < rowsNumder)
            recordsCount = head.recordsCount;
        else
            recordsCount = rowsNumder;
        if (head.recordsCount == 0) {
            dbfParser.emit('end');
            return callback();
        }
        console.log(tableDBF.file + ': ' + 'START READ row: ' + recordsCount);

        //Указываем максимальное число эмиттеров
        if (recordsCount < 70)
            eventEmitter.setMaxListeners(70);
        else
            eventEmitter.setMaxListeners(recordsCount);


    });

    var i = 0;
    dbfParser.on('record', function (data) {
        if (recordsCount <= 0) return callback();

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
            eventEmitter.emit('record_mysql_table', tableDBF.mysql_table, object, recordsCount, callback);
        } else
            return;

        //Show result
        if (i === recordsCount) {
            dataBuffer = data;
            i = 0;
            return data;
        }
    });

    dbfParser.on('end', function () {
        console.log('Finish read file: ' + tableDBF.file);
    });

    if (dbLock === 0) dbfParser.parse();
}

var j = 0;
var startDbRecordTime; //milliseconds
var finishDbRecordTime; //milliseconds
var connection;

eventEmitter.on('record_mysql_table', function (mysql_table, data, recordsCount, callback) {
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
        if (mysql_table == parameters.DBF.ALTNAMES.mysql_table)
            eventEmitter.emit('reset_mysql_table', connection, 'aa_record_time_log');
        //Record in time log
        eventEmitter.emit('record_time_log_table', connection, 'start', mysql_table, recordsCount);
    }

    process.nextTick(function () {
        recordInMySQLTable(mysql_table, data, recordsCount, callback);
    });


});

function recordInMySQLTable(mysql_table, data, recordsCount, callback) {
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
                //Record in time log
                eventEmitter.emit('record_time_log_table', connection, 'finish', mysql_table, data.id);
                //Destroy connection
                setTimeout(connection.end(function () {
                    finishDbRecordTime = new Date().getTime();
                    console.log(mysql_table + ': ' + 'Finish MySQL connection.Record time: ' + (finishDbRecordTime - startDbRecordTime));
                    callback(data);
                }), 10);
                j = 0;
                dbLock = 0;
            }
        }
    );
}

eventEmitter.on('record_time_log_table', function (connection, event, mysql_table, recordsCount) {
    connection.query("INSERT INTO `aa_record_time_log` (`id`,`event`,`table_name`,`rows`,`start_time`) VALUES ( NULL , ? , ? , ? , NOW( ))", [event, mysql_table, recordsCount],
        function (error) {
            if (error !== null) {
                console.log("MySQL `record_time_log` Table Error: " + error);
            }
        }
    );
});

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
