var express = require('express');
var router = express.Router();
var events = require('events');
var eventEmitter = new events.EventEmitter();
var merge = require('merge'), original, cloned;
var mysql = require('mysql');
var parameters = require('../config/parameters.json');
var getMySQLObject = require('../controllers/getMySQLObject.js');
var async = require('async');
var Promise = require('promise');


router.get('/test', function (req, res, next) {
    var startDbRecordTime = new Date().getTime();
    var Distribution, connection,
        __bind = function (fn, me) {
            return function () {
                return fn.apply(me, arguments);
            };
        },
        __hasProp = {}.hasOwnProperty,
        __extends = function (child, parent) {
            for (var key in parent) {
                if (__hasProp.call(parent, key)) child[key] = parent[key];
            }
            function ctor() {
                this.constructor = child;
            }

            ctor.prototype = parent.prototype;
            child.prototype = new ctor();
            child.__super__ = parent.prototype;
            return child;
        };


    Distribution = (function (_super) {
        __extends(Distribution, _super);

        function Distribution() {
            this.tableMySQL = parameters.DataBase.kladr_buffer;
            this.bufferMySQL_DB = parameters.DataBase.kladr_buffer.name;
            this.bufferMySQL_Tables = {};
            this.DBF_MySQL_DB = parameters.DataBase.kladr_dbf.name;
            this.DBF_MySQL_Tables = {};
            this.databases = {};
        }


        Distribution.prototype.open_connection = function () {
            //Parameters MySQL connection
            connection = mysql.createConnection({
                host: this.tableMySQL.host,
                port: this.tableMySQL.port,
                connectTimeout: 120000,
                //database: this.tableMySQL.name,
                user: this.tableMySQL.user,
                password: this.tableMySQL.password
            });

            //MySQL Connection
            connection.connect(function (error) {
                if (error !== null) {
                    console.log('MySQL connection Error: ' + error);
                } else {
                    console.log('START MySQL CONNECTION');
                    eventEmitter.emit('show_databases');
                }
            });

            eventEmitter.on('show_databases', (function (_this) {
                return function () {
                    _this.show_databases();
                }
            })(this));

        };

        Distribution.prototype.show_databases = function () {
            //SHOW DATABASES
            var data;
            connection.query('SHOW DATABASES',
                function (error, result) {
                    if (error !== null) {
                        console.log("MySQL SHOW DATABASES Error: " + error);
                    } else {
                        data = result;
                        eventEmitter.emit('save_show_databases');
                    }
                });

            eventEmitter.on('save_show_databases', (function (_this) {
                return function () {
                    _this.databases = data;
                    console.log('Найденно баз: ' + data.length);
                    _this.find_database(_this.tableMySQL.name);
                }
            })(this));
        };

        Distribution.prototype.find_database = function (name_database) {
            var dbListLength = this.databases.length;
            for (i = 0; i < dbListLength; i++) {
                //console.log(i,name_database, this.databases[i].Database, (name_database == this.databases[i].Database));
                if (this.databases[i].Database == name_database) {
                    if (name_database == this.DBF_MySQL_DB) {
                        console.log('База с информацией для импорта найденна: ', this.DBF_MySQL_DB);
                        this.show_tables(this.DBF_MySQL_DB, '');

                    } else if (name_database == this.bufferMySQL_DB) {
                        console.log('База в которую будет произведен импорт найденна: ', name_database);
                        this.find_database(this.DBF_MySQL_DB);
                    }
                    return;
                } else if ((i === dbListLength - 1) && (this.databases[i].Database != name_database)) {
                    console.log('База данных не найденна :', name_database);
                    if (name_database == this.bufferMySQL_DB)
                        this.create_database(name_database);
                    if (name_database == this.DBF_MySQL_DB) {
                        console.log('База данных хранящая основную импортируевую информацию отсутствует в MySQL!');
                        this.close_connection();
                    }
                    return;
                }
            }
        };

        Distribution.prototype.create_database = function (name_database) {
            //USE DATABASE
            connection.query('CREATE DATABASE IF NOT EXISTS ?? CHARACTER SET utf8 COLLATE utf8_general_ci;', name_database, function (error, result) {
                if (error !== null) {
                    console.log("MySQL USE DATABASES Error: " + error);
                } else {
                    eventEmitter.emit('create_database');
                }
            });

            eventEmitter.on('create_database', (function (_this) {
                return function () {
                    console.log('Созданна новая база данных:', name_database);
                    //_this.find_database(name_database);
                    _this.close_connection();
                }
            })(this));
        };

        Distribution.prototype.use_database = function (name_database) {
            //USE DATABASE
            var data;
            connection.query('USE ??', name_database,
                function (error, result) {
                    if (error !== null) {
                        console.log("MySQL USE DATABASES Error: " + error);
                    } else {
                        data = result;
                        eventEmitter.emit('use_database');
                    }
                });

            eventEmitter.on('use_database', (function (_this) {
                return function () {
                    console.log(name_database, data);
                    return data;
                }
            })(this));
        };

        Distribution.prototype.show_tables = function (database, event) {
            //SHOW TABLES
            var data,dataLength,i=0;
            connection.query('USE ??', database,
                function (error, result) {
                    if (error !== null)
                        console.log("MySQL USE TABLES Error: " + error);
                    else{
                        //console.log(result);
                    }
                });

            connection.query('SHOW TABLES',
                function (error, result) {
                    if (error !== null) {
                        console.log(database);
                        console.log("MySQL SHOW TABLES Error: " + error);
                    } else {
                        console.log(result);
                        data = result;
                        dataLength = result.length;
                        eventEmitter.emit('save_show_tables');
                    }
                });

            eventEmitter.on('save_show_tables', (function (_this) {
                return function () {
                    if ((database === _this.DBF_MySQL_DB) && (i === 0)) {
                        console.log('В базе: ' + database + ' найденно таблиц: ' + dataLength);
                        if (event !== 'show') {
                            if(i === 0){
                                i++;
                                _this.show_tables(_this.bufferMySQL_DB, '');
                            }

                        }
                        _this.DBF_MySQL_Tables = data;
                    }else if ((database === _this.bufferMySQL_DB) && (i === 0)) {
                        console.log('В базе: ' + database + ' найденно таблиц: ' + dataLength);
                        if (event !== 'show') {
                            _this.find_tables(_this.tableMySQL.name);
                        }
                        _this.bufferMySQL_Tables = data;
                        _this.close_connection();
                    }
                }
            })(this));
        };


        Distribution.prototype.find_tables = function (table_array) {
            var dbListLength = table_array.length;

            /*for (i = 0; i < dbListLength; i++) {
                console.log(i,name_database, this.databases[i].Database, (name_database == this.databases[i].Database));
                if (this.databases[i].Database == name_tabele) {

                    if (name_database == this.DBF_MySQL_DB) {
                        console.log('База с информацией для импорта найденна: ', this.DBF_MySQL_DB);
                        this.close_connection();
                    } else if (name_database == this.bufferMySQL_DB) {
                        console.log('База в которую будет произведен импорт найденна: ', name_database);
                        this.find_database(this.DBF_MySQL_DB);
                    }
                    return;
                } else if ((i === dbListLength - 1) && (this.databases[i].Database != name_database)) {
                    console.log('База данных не найденна :', name_database);
                    if (name_database == this.bufferMySQL_DB)
                        this.create_database(name_database);
                    if (name_database == this.DBF_MySQL_DB) {
                        console.log('База данных хранящая основную импортируевую информацию отсутствует в MySQL!');
                        this.close_connection();
                    }
                    return;
                }
            }*/
        };


        Distribution.prototype.drop_database = function (name_database) {
            //DROP DATABASES
            connection.query('DROP DATABASE IF EXISTS ??`', name_database,
                function (error, result) {
                    if (error !== null) {
                        console.log("MySQL SHOW DATABASES Error: " + error);
                    } else {
                        eventEmitter.emit('drop_database');
                    }
                }
            );

            eventEmitter.on('drop_database', (function (_this) {
                return function () {
                    console.log('База данных' + name_database + 'удалена!');
                }
            })(this));
        };

        Distribution.prototype.close_connection = function () {
            //SHOW DATABASES
            connection.end(function () {
                console.log('CLOSE MYSQL CONNECTION');
            });
        };
        return Distribution;

    })(eventEmitter);


    var test = new Distribution();
    test.open_connection();

    // var connection = openMySQLConnection(tableMySQL, showALLDataBases(function () {
    //     closeMySQLConnection(connection);
    // }));

    res.send('Иди смотри)');
});

router.get('/distribution', function (req, res, next) {

    var startDbRecordTime = new Date().getTime();

    res.send('Иди смотри)');
});

function openMySQLConnection(tableMySQL, callback) {
    //Parameters MySQL connection
    var connection = mysql.createConnection({
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
        callback();
    });
    return connection;
}
function closeMySQLConnection(connection) {
    connection.end(function () {
        console.log('CLOSE MYSQL CONNECTION');
    });
}

function dateteMySQLTable(connection, mysql_table) {
    connection.end(function () {
        console.log('DROP DATABASE IF EXISTS ??', mysql_table);
    });
}

module.exports = router;

var showALLDataBases = function (callback) {
    //SHOW ALL DATABASES
    var result = connection.query('SHOW DATABASES',
        function (error) {
            if (error !== null) {
                console.log("MySQL Clear Table Error: " + error);
            } else {
                console.log(result._results);
                callback();
            }
        });
};