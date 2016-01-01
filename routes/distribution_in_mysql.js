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
            this.dbf_log_table_information = undefined;
            this.buffer_log_table_information = undefined;
            this.buffer_region_table_information = undefined;
            this.start_stage = 0;
            this.stage = 0;
            this.finish_stage = 0;
            this.query_limit = 0;

            this.socrase_table_information = undefined;
            this.dbf_tables = {
                log: 'aa_record_time_log',
                socrbase: 'socrbase',
                kladr: 'kladr',
                street: 'street',
                doma: 'doma'
            };
            this.buffer_main_tables = {
                log: 'aa_record_time_log',
                socrbase: 'aa_socrbase',
                regions: 'aa_regions'
            };

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
                            _this.validate_main_tables(_this.DBF_MySQL_DB);
                        }

                    } else if (database === _this.bufferMySQL_DB) {
                        _this.bufferMySQL_Tables = (dataLength > 0) ? data : [];
                        console.log('show_tables:', 'В базе: ' + database + ' найденно таблиц: ' + dataLength, 'event', event);
                        if (event === 'update') {
                            _this.validate_main_tables(_this.bufferMySQL_DB);
                        }
                    }
                }
            })(this));
        };

        Distribution.prototype.validate_main_tables = function (name_database) {
            var data, dbListLength, keyObject, key, i, dfb_table_index = 0;
            var buffer_log_index = 0, buffer_socrbase_index = 0, buffer_region_index = 0;

            if (name_database === undefined) return false;
            if (name_database == this.DBF_MySQL_DB) {
                data = this.DBF_MySQL_Tables;
            } else if (name_database == this.bufferMySQL_DB) {
                data = this.bufferMySQL_Tables;
            }
            dbListLength = data.length;

            //Получение ключа объекта
            for (keyObject in data[0]) key = keyObject;

            //Создание главной таблицы в базе
            //console.log('validate_main_tables: ', dbListLength, data.length, data); //Число объектов в массиве
            if ((data.length === 0) && (name_database == this.bufferMySQL_DB)) {
                console.log('validate_main_tables', 'Приступаю к созданию первой таблицы в базе: ' + name_database);
                this.create_log_table();
                this.stage = 0;
                return false;
            } else if (this.DBF_MySQL_DB == name_database) {
                for (i = 0; i < dbListLength; i++) {
                    switch (data[i][key]) {
                        case(this.dbf_tables.log):
                            console.log('validate_main_tables:', 'Таблица найденна:', this.DBF_MySQL_DB, this.dbf_tables.log);
                            dfb_table_index++;
                            break;
                        case(this.dbf_tables.socrbase):
                            console.log('validate_main_tables:', 'Таблица найденна:', this.DBF_MySQL_DB, this.dbf_tables.socrbase);
                            dfb_table_index++;
                            break;
                        case(this.dbf_tables.kladr):
                            console.log('validate_main_tables:', 'Таблица найденна:', this.DBF_MySQL_DB, this.dbf_tables.kladr);
                            dfb_table_index++;
                            break;
                        case(this.dbf_tables.street):
                            console.log('validate_main_tables:', 'Таблица найденна:', this.DBF_MySQL_DB, this.dbf_tables.street);
                            dfb_table_index++;
                            break;
                        case(this.dbf_tables.doma):
                            console.log('validate_main_tables:', 'Таблица найденна:', this.DBF_MySQL_DB, this.dbf_tables.doma);
                            dfb_table_index++;
                            break;
                    }
                    if (i == (dbListLength - 1)) {
                        if (dfb_table_index === 5)
                            console.log('validate_main_tables:', 'Все основные таблицы на месте index =', dfb_table_index);
                        else
                            console.log('validate_main_tables:', 'Внимание! часть таблиц отсутствует index =', dfb_table_index);
                        return this.show_tables(this.bufferMySQL_DB, 'update');
                    }
                }
            } else if (this.bufferMySQL_DB == name_database) {
                for (i = 0; i < dbListLength; i++) {
                    switch (data[i][key]) {
                        case(this.buffer_main_tables.log):
                            console.log('validate_main_tables:', 'Таблица найденна:', this.bufferMySQL_DB, this.buffer_main_tables.log);
                            buffer_log_index++;
                            break;
                        case(this.buffer_main_tables.socrbase):
                            console.log('validate_main_tables:', 'Таблица найденна:', this.bufferMySQL_DB, this.buffer_main_tables.socrbase);
                            buffer_socrbase_index++;
                            break;
                        case(this.buffer_main_tables.regions):
                            console.log('validate_main_tables:', 'Таблица найденна:', this.bufferMySQL_DB, this.buffer_main_tables.regions);
                            buffer_region_index++;
                            break;
                    }
                    if (i == dbListLength - 1) {
                        if (buffer_log_index !== 1) {
                            console.log('validate_main_tables:', 'Внимание! Таблица отсутствует:', this.bufferMySQL_DB, this.buffer_main_tables.log);
                            return this.create_log_table();
                        }
                        if (buffer_socrbase_index !== 1) {
                            console.log('validate_main_tables:', 'Внимание! Таблица отсутствует:', this.bufferMySQL_DB, this.buffer_main_tables.socrbase);
                            return this.distribution_socrbase();
                        }
                        if (buffer_region_index !== 1) {
                            console.log('validate_main_tables:', 'Внимание! Таблица отсутствует:', this.bufferMySQL_DB, this.buffer_main_tables.region);
                            return this.create_regions_table();
                        }
                        if ((buffer_log_index + buffer_socrbase_index + buffer_region_index) === 3) {
                            console.log('validate_main_tables:', 'Все основные таблицы на месте index =', 3);
                            return this.stage_controller();
                        }
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
                [this.bufferMySQL_DB, this.buffer_main_tables.log],
                function (error, result) {
                    if (error !== null) {
                        console.log("MySQL CREATE TABLE Error: " + error);
                    } else {
                        eventEmitter.emit('create_log_table');
                    }
                });

            eventEmitter.once('create_log_table', (function (_this) {
                return function () {
                    console.log('create_log_table:', 'Созданна новая таблица:', _this.bufferMySQL_DB, _this.buffer_main_tables.log);
                    _this.show_tables(_this.bufferMySQL_DB, 'update'); //Обновляю данные
                }
            })(this));
        };

        Distribution.prototype.distribution_socrbase = function () {
            //SELECT ALL
            var data, bufferMySQL_DB = this.bufferMySQL_DB, socrase_table_name = this.buffer_main_tables.socrbase;
            connection.query('CREATE TABLE ??.?? LIKE ??.??;',
                [this.bufferMySQL_DB, this.buffer_main_tables.socrbase, this.DBF_MySQL_DB, this.dbf_tables.socrbase],
                function (error, result) {
                    if (error !== null) {
                        console.log("MySQL USE DATABASES Error: " + error);
                    } else {
                        console.log('distribution_socrbase:', 'Создание базы прошло успешно', bufferMySQL_DB, socrase_table_name)
                    }
                });

            connection.query('INSERT INTO ??.?? SELECT * FROM ??.??;',
                [this.bufferMySQL_DB, this.buffer_main_tables.socrbase, this.DBF_MySQL_DB, this.dbf_tables.socrbase],
                function (error, result) {
                    if (error !== null) {
                        console.log("MySQL USE DATABASES Error: " + error);
                    } else {
                        data = result;
                        eventEmitter.emit('distribution_socrbase');
                    }
                });

            eventEmitter.once('distribution_socrbase', (function (_this) {
                return function () {
                    //console.log(data);
                    console.log('distribution_socrbase:', 'Перенос данных прошел успешно', bufferMySQL_DB, socrase_table_name);
                    return _this.show_tables(_this.bufferMySQL_DB, 'update');
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
                [this.bufferMySQL_DB, this.buffer_main_tables.regions],
                function (error, result) {
                    if (error !== null) {
                        console.log("MySQL CREATE TABLE Error: " + error);
                    } else {
                        eventEmitter.emit('create_regions_table');
                    }
                });

            eventEmitter.once('create_regions_table', (function (_this) {
                return function () {
                    console.log('create_regions_table:', 'Созданна новая таблица:', _this.bufferMySQL_DB, _this.buffer_main_tables.regions);
                    _this.show_tables(_this.bufferMySQL_DB, 'update'); //Обновляю данные
                }
            })(this));
        };

        Distribution.prototype.stage_controller = function () {
            console.log('ACTIVATE STAGE_CONTROLLER');
            //Получаем информацию из таблиц с логами
            if (this.dbf_log_table_information == undefined)
                return this.select_all(this.DBF_MySQL_DB, this.dbf_tables.log);
            else if (this.buffer_log_table_information == undefined)
                return this.select_all(this.bufferMySQL_DB, this.buffer_main_tables.log);
            else if (this.socrase_table_information == undefined)
                return this.select_all(this.bufferMySQL_DB, this.buffer_main_tables.socrbase);
            else if (this.buffer_region_table_information == undefined)
                return this.select_all(this.bufferMySQL_DB, this.buffer_main_tables.regions);
            //Сбрасываем значения в зависимости от имеющихся данных
            if ((this.buffer_log_table_information == ![]) || (this.buffer_region_table_information == ![])) {
                this.start_stage = 0;
                this.stage = 0;
            }

            //Выполняем необходимые действия для нулевой стадии
            /*if ((this.start_stage == 0) && (this.stage == 0)) {
             if (this.socrase_table_information == undefined) {
             return this.distribution_socrbase();
             }
             }*/


            console.log(this.buffer_log_table_information, (this.buffer_log_table_information == ![]));
            console.log(this.buffer_region_table_information, (this.buffer_region_table_information == ![]));
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
                    if ((_this.DBF_MySQL_DB === name_database) && (_this.dbf_tables.log === name_table)) {
                        _this.dbf_log_table_information = data;
                        _this.stage_controller();
                        return false;

                    } else if ((_this.bufferMySQL_DB === name_database) && (_this.buffer_main_tables.log === name_table)) {
                        _this.buffer_log_table_information = data;
                        _this.stage_controller();
                        return false;
                    } else if ((_this.bufferMySQL_DB === name_database) && (_this.buffer_main_tables.socrbase === name_table)) {
                        _this.socrase_table_information = data;
                        _this.stage_controller();
                        return false;
                    } else if ((_this.bufferMySQL_DB === name_database) && (_this.buffer_main_tables.regions === name_table)) {
                        _this.buffer_region_table_information = data;
                        _this.stage_controller();
                        return false;
                    }

                }
            })(this));
        };

        Distribution.prototype.get_region = function () {
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
                    if ((_this.DBF_MySQL_DB === name_database) && (_this.dbf_tables.log === name_table)) {
                        _this.dbf_log_table_information = data;
                        _this.stage_controller();
                        return false;

                    } else if ((_this.bufferMySQL_DB === name_database) && (_this.buffer_main_tables.log === name_table)) {
                        _this.buffer_log_table_information = data;
                        _this.stage_controller();
                        return false;
                    } else if ((_this.bufferMySQL_DB === name_database) && (_this.buffer_main_tables.regions === name_table)) {
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