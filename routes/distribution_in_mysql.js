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
    var i = 0;

    /*var test = function(){
     i++;
     console.log('Иди смотри): ', i);
     }; */

    //eventEmitter.addListener('test', test);
    eventEmitter.emit('test');

    eventEmitter.once('test', (function () {
        return function () {
            i++;
            console.log('Иди смотри): ', i);
        }
    })(res));


    //eventEmitter.removeListener('test',test);

    res.send('Иди смотри):');
});

router.get('/distribution', function (req, res, next) {
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
            this.bufferMySQL_Tables = [];
            this.DBF_MySQL_DB = parameters.DataBase.kladr_dbf.name;
            this.DBF_MySQL_Tables = [];
            this.databases = [];
            this.name_dbf_log_table = 'aa_record_time_log';
            this.dbf_log_table_information = undefined;
            this.name_log_table = 'aa_record_time_log';
            this.buffer_log_table_information = undefined;
            this.buffer_region_table_name = 'aa_regions';
            this.buffer_region_table_information = undefined;
            this.stage = 0;
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
                    console.log('open_connection:', 'START MySQL CONNECTION');
                    eventEmitter.emit('show_databases');
                }
            });

            eventEmitter.once('show_databases', (function (_this) {
                return function () {
                    _this.show_databases();
                }
            })(this));

        };

        Distribution.prototype.show_databases = function () {
            //SHOW DATABASES
            var data, dataLength;
            connection.query('SHOW DATABASES',
                function (error, result) {
                    if (error !== null) {
                        console.log("MySQL SHOW DATABASES Error: " + error);
                    } else {
                        data = result;
                        dataLength = result.length;
                        eventEmitter.emit('save_show_databases');
                    }
                });

            eventEmitter.once('save_show_databases', (function (_this) {
                return function () {
                    _this.databases = data;
                    console.log('show_databases:', 'Найденно баз: ' + dataLength);
                    if (dataLength !== undefined) _this.find_database(_this.tableMySQL.name);
                    else {
                        console.log('show_databases:', 'Внимание! Ни одной базы данных не найденно!');
                    }
                }
            })(this));
        };

        Distribution.prototype.find_database = function (name_database) {
            var dbListLength = this.databases.length;
            for (i = 0; i < dbListLength; i++) {
                //console.log(i,name_database, this.databases[i].Database, (name_database == this.databases[i].Database));
                if (this.databases[i].Database == name_database) {
                    if (name_database == this.DBF_MySQL_DB) {
                        console.log('find_database:', 'База с информацией для импорта найденна: ', this.DBF_MySQL_DB);
                        this.show_tables(this.DBF_MySQL_DB, 'update');
                        return;
                    } else if (name_database == this.bufferMySQL_DB) {
                        console.log('find_database:', 'База в которую будет произведен импорт найденна: ', name_database);
                        this.find_database(this.DBF_MySQL_DB);
                        return;
                    }
                } else if ((i === dbListLength - 1) && (this.databases[i].Database != name_database)) {
                    console.log('find_database:', 'База данных не найденна :', name_database);
                    if (name_database == this.bufferMySQL_DB) {
                        this.create_database(name_database);
                        return;
                    }
                    if (name_database == this.DBF_MySQL_DB) {
                        console.log('find_database:', 'База данных хранящая основную импортируевую информацию отсутствует в MySQL!');
                        this.close_connection();
                        return;
                    }

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

            eventEmitter.once('create_database', (function (_this) {
                return function () {
                    console.log('create_database:', 'Созданна новая база данных:', name_database);
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

            eventEmitter.once('use_database', (function (_this) {
                return function () {
                    console.log('use_database:', name_database, data);
                    return data;
                }
            })(this));
        };

        Distribution.prototype.show_tables = function (database, event) {
            //SHOW TABLES
            var data, dataLength;
            connection.query('USE ??', database,
                function (error, result) {
                    if (error !== null)
                        console.log("MySQL USE TABLES Error: " + error);
                    else {
                        //console.log(result);
                    }
                });

            connection.query('SHOW TABLES',
                function (error, result) {
                    if (error !== null) {
                        console.log(database);
                        console.log("MySQL SHOW TABLES Error: " + error);
                    } else {
                        //console.log(result);
                        data = result;
                        dataLength = result.length;
                        eventEmitter.emit('save_show_tables');
                    }
                });

            eventEmitter.once('save_show_tables', (function (_this) {
                return function () {
                    if (database === _this.DBF_MySQL_DB) {
                        _this.DBF_MySQL_Tables = (data.length > 0) ? data : [];
                        console.log('show_tables:', 'В базе: ' + database + ' найденно таблиц: ' + dataLength, 'event', event);
                        if (dataLength === 7) console.log('show_tables:', 'Число ' + dataLength + ' соответствует необходимому значению числа таблиц!');
                        else console.log('show_tables:', 'Внимание! ' + dataLength + ' таблиц может быть недостаточно для полного распределения данных!');
                        if (event === 'update') {
                            _this.find_main_tables(_this.DBF_MySQL_DB, _this.name_dbf_log_table);
                        }

                    } else if (database === _this.bufferMySQL_DB) {
                        _this.bufferMySQL_Tables = (dataLength > 0) ? data : [];
                        console.log('show_tables:', 'В базе: ' + database + ' найденно таблиц: ' + dataLength, 'event', event);
                        if (event === 'update') {
                            _this.find_main_tables(_this.bufferMySQL_DB, _this.name_log_table);
                        }
                    }
                }
            })(this));
        };

        Distribution.prototype.find_main_tables = function (name_database, name_table) {
            var data, dbListLength, keyObject, key, i, j;
            if (name_database === undefined) return false;
            if (name_database == this.DBF_MySQL_DB) {
                data = this.DBF_MySQL_Tables;
            } else if (name_database == this.bufferMySQL_DB) {
                data = this.bufferMySQL_Tables;
            }
            dbListLength = data.length;

            //Получение ключа объекта
            for (keyObject in data[0]) key = keyObject;

            //Создание главной таблици в базе
            //console.log('find_main_tables: ', dbListLength, data.length, data); //Число объектов в массиве
            if ((data.length === 0) && (name_database == this.bufferMySQL_DB)) {
                console.log('find_main_tables', 'Приступаю к созданию первой таблици в базе: ' + name_database);
                this.create_log_table();
                this.stage = 0;
                return false;
            }

            //Поиск по базе ести в ней есть таблицы
            for (i = 0; i < dbListLength; i++) {
                console.log('find_main_tables:', i, name_table, '==', data[i][key], (name_table == data[i][key]));
                if (data[i][key] == name_table) {
                    if ((this.DBF_MySQL_DB == name_database) && (name_table == this.name_dbf_log_table)) {
                        console.log('find_main_tables:', 'Таблица DBF логов найденна:', name_database, name_table);
                        return this.show_tables(this.bufferMySQL_DB, 'update');

                    } else if ((this.bufferMySQL_DB == name_database) && (name_table == this.name_log_table)) {
                        console.log('find_main_tables: ', 'Таблица buffer log найденна:', name_database, name_table);
                        for (j = 0; j < dbListLength; j++) {
                            if (data[j][key] == this.buffer_region_table_name) {
                                console.log('find_main_tables:', 'Таблица buffer regions найденна:', name_database, name_table);
                                return this.stage_controller();
                            }else if(j == dbListLength - 1){
                                console.log('find_main_tables:', 'Внимание! Таблица buffer regions не найденна:', name_database, name_table);
                                return this.create_regions_table();

                            }
                        }

                    } else if ((this.bufferMySQL_DB == name_database) && (name_table == this.buffer_region_table_name)) {
                        console.log('find_main_tables:', 'Таблица buffer regions найденна:', name_database, name_table);
                        for (j = 0; j < dbListLength; j++) {
                            if (data[j][key] == this.name_log_table) {
                                console.log('find_main_tables:', 'Таблица buffer log найденна:', name_database, name_table);
                                return this.stage_controller();
                            }else if(j == dbListLength - 1){
                                console.log('find_main_tables:', 'Внимание! Таблица buffer regions не найденна:', name_database, name_table);
                                return this.create_log_table();
                            }
                        }
                    }
                } else if ((i === dbListLength - 1) && (data[i][key] != name_table)) {
                    if ((this.DBF_MySQL_DB == name_database) && (name_table == this.name_dbf_log_table)) {
                        console.log('find_main_tables:', 'Внимание! Таблица DBF log не найденна:', name_database, name_table);
                        return this.show_tables(this.bufferMySQL_DB, 'update');

                    } else if ((this.bufferMySQL_DB == name_database) && (name_table == this.name_log_table)) {
                        console.log('find_main_tables:', 'Внимание! Таблица buffer log не найденна:', name_database, name_table);
                        return this.create_log_table();

                    } else if ((this.bufferMySQL_DB == name_database) && (name_table == this.buffer_region_table_name)) {
                        console.log('find_main_tables:', 'Внимание! Таблица buffer regions не найденна:', name_database, name_table);
                        return this.create_regions_table();
                    }
                }
            }
        };

        Distribution.prototype.create_log_table = function () {
            //CREATE LOG TABLE
            connection.query("CREATE TABLE IF NOT EXISTS ??.?? ( " +
                "`id` int(11) NOT NULL AUTO_INCREMENT," +
                "`event_id` int(11) NOT NULL, " +
                "`event` varchar(35) NOT NULL DEFAULT ''," +
                "`dbf_table_name` varchar(35) NOT NULL DEFAULT ''," +
                "`table_name` varchar(35) NOT NULL DEFAULT ''," +
                "`rows` int(11) NOT NULL," +
                "`date_time` datetime NOT NULL," +
                "PRIMARY KEY (`id`)" +
                ") ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;",
                [this.bufferMySQL_DB, this.name_log_table],
                function (error, result) {
                    if (error !== null) {
                        console.log("MySQL CREATE TABLE Error: " + error);
                    } else {
                        eventEmitter.emit('create_log_table');
                    }
                });

            eventEmitter.once('create_log_table', (function (_this) {
                return function () {
                    console.log('create_log_table:', 'Созданна новая таблица:', _this.bufferMySQL_DB, _this.name_log_table);
                    _this.show_tables(_this.bufferMySQL_DB, 'update'); //Обновляю данные
                }
            })(this));
        };

        Distribution.prototype.create_regions_table = function () {
            //CREATE REGION TABLE
            connection.query("CREATE TABLE IF NOT EXISTS ??.?? (" +
                "`id` int(11) NOT NULL AUTO_INCREMENT," +
                "`number` varchar(5) NOT NULL DEFAULT ''," +
                "`name` varchar(80) NOT NULL DEFAULT ''," +
                "`socr` varchar(20) NOT NULL DEFAULT ''," +
                "`code` varchar(25) NOT NULL DEFAULT ''," +
                "`index` varchar(16) NOT NULL DEFAULT ''," +
                "`gninmb` varchar(14) NOT NULL DEFAULT ''," +
                "`uno` varchar(14) NOT NULL DEFAULT ''," +
                "`ocatd` varchar(21) NOT NULL DEFAULT ''," +
                "`status` varchar(11) NOT NULL DEFAULT ''," +
                "PRIMARY KEY (`id`)" +
                ") ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;",
                [this.bufferMySQL_DB, this.buffer_region_table_name],
                function (error, result) {
                    if (error !== null) {
                        console.log("MySQL CREATE TABLE Error: " + error);
                    } else {
                        eventEmitter.emit('create_regions_table');
                    }
                });

            eventEmitter.once('create_regions_table', (function (_this) {
                return function () {
                    console.log('create_regions_table:', 'Созданна новая таблица:', _this.bufferMySQL_DB, _this.buffer_region_table_name);
                    _this.show_tables(_this.bufferMySQL_DB, 'update'); //Обновляю данные
                }
            })(this));
        };

        Distribution.prototype.stage_controller = function () {
            console.log('ACTIVATE STAGE_CONTROLLER');
            //Получаем информацию из таблиц с логами
            if (this.dbf_log_table_information == undefined)
                return this.select_all(this.DBF_MySQL_DB, this.name_dbf_log_table);
            else if (this.buffer_log_table_information == undefined)
                return this.select_all(this.bufferMySQL_DB, this.name_log_table);
            else if (this.buffer_region_table_information == undefined)
                return this.select_all(this.bufferMySQL_DB, this.buffer_region_table_name);

            console.log(this.buffer_log_table_information);
            this.close_connection();
        };

        Distribution.prototype.select_all = function (name_database, name_table) {
            //SELECT ALL
            var data;
            connection.query('SELECT * FROM ??.??', [name_database, name_table],
                function (error, result) {
                    if (error !== null) {
                        console.log("MySQL USE DATABASES Error: " + error);
                    } else {
                        data = result;
                        eventEmitter.emit('select_all');
                    }
                });

            eventEmitter.once('select_all', (function (_this) {
                return function () {
                    console.log('SELECT * FROM', name_database, name_table);
                    if ((_this.DBF_MySQL_DB === name_database) && (_this.name_dbf_log_table === name_table)) {
                        _this.dbf_log_table_information = data;
                        _this.stage_controller();
                        return false;

                    } else if ((_this.bufferMySQL_DB === name_database) && (_this.name_log_table === name_table)) {
                        _this.buffer_log_table_information = data;
                        _this.stage_controller();
                        return false;
                    } else if ((_this.bufferMySQL_DB === name_database) && (_this.buffer_region_table_name === name_table)) {
                        _this.buffer_region_table_information = data;
                        _this.stage_controller();
                        return false;
                    }

                }
            })(this));
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

            eventEmitter.once('drop_database', (function (_this) {
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

    res.send('Иди смотри)');
});
module.exports = router;