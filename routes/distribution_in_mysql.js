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
var dateFormat = require('dateformat');
var now = new Date();
//var isNum = require('isNum');

router.get('/test', function (req, res, next) {

        var date_time = dateFormat(now, "yyyy-mm-dd HH:MM:ss");
        var MySQLDate = '2016-01-02 13:32:27';

        res.send('Иди смотри)');
    }
);


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
            this.stage = 5;
            this.finish_stage = 7;
            this.socrase_table_information = undefined;
            this.dbf_tables = {
                log: 'aa_record_time_log',
                socrbase: 'socrbase',
                kladr: 'kladr',
                street: 'street',
                doma: 'doma'
            };
            this.buffer_main_tables = {
                log: '000_record_time_log',
                socrbase: '000_socrbase',
                regions: '000_regions',
                city: '000_city',
                street: '000_street',
                home: '000_home'
            };
            eventEmitter.setMaxListeners(50000);
            this.row = 0;
            this.query_limit = 25000;
            this.query_limit_error = 5000;
            this.city_prefix = '_city';
            this.street_prefix = '_street';
            this.home_prefix = '_home';

            this.buffer_city_table_information = [];
            this.buffer_home_table_information = [];
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
                        return this.close_connection();
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
                    _this.show_databases();
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
                        console.log('show_tables:', 'В базе: ' + database + ' найденно таблиц: ' + dataLength, 'event:', event);
                        if (dataLength === 7) console.log('show_tables:', 'Число ' + dataLength + ' соответствует необходимому значению числа таблиц!');
                        else console.log('show_tables:', 'Внимание! ' + dataLength + ' таблиц может быть недостаточно для полного распределения данных!');
                        if (event === 'update') {
                            _this.validate_main_tables(_this.DBF_MySQL_DB);
                        }

                    } else if (database === _this.bufferMySQL_DB) {
                        _this.bufferMySQL_Tables = (dataLength > 0) ? data : [];
                        console.log('show_tables:', 'В базе: ' + database + ' найденно таблиц: ' + dataLength, 'event:', event);
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
                            console.log('validate_main_tables:', 'Внимание! Таблица отсутствует:', this.bufferMySQL_DB, this.buffer_main_tables.regions);
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
                "`event` varchar(150) NOT NULL DEFAULT ''," +
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
                "`dbf_id` int(11) NOT NULL," +
                "`number` varchar(5) NOT NULL DEFAULT ''," +
                "`name` varchar(80) NOT NULL DEFAULT ''," +
                "`socr` varchar(20) NOT NULL DEFAULT ''," +
                "`code` varchar(25) NOT NULL DEFAULT ''," +
                "`index` varchar(16) NOT NULL DEFAULT ''," +
                "`gninmb` varchar(14) NOT NULL DEFAULT ''," +
                "`uno` varchar(14) NOT NULL DEFAULT ''," +
                "`ocatd` varchar(21) NOT NULL DEFAULT ''," +
                "`status` varchar(11) NOT NULL DEFAULT ''," +
                "PRIMARY KEY (`id`)," +
                "KEY `dbf_id` (`dbf_id`)" +
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

        //++++++++++++++++++++++++++++++++++++++++++++++++++++++++++//
        Distribution.prototype.stage_controller = function () {
            console.log('ACTIVATE STAGE_CONTROLLER', 'STAGE:', this.stage);
            //Получаем информацию из таблиц с логами
            if (this.dbf_log_table_information == undefined)
                return this.select_all(this.DBF_MySQL_DB, this.dbf_tables.log);
            else if (this.buffer_log_table_information == undefined)
                return this.select_all(this.bufferMySQL_DB, this.buffer_main_tables.log);
            else if (this.socrase_table_information == undefined)
                return this.select_all(this.bufferMySQL_DB, this.buffer_main_tables.socrbase);
            else if (this.buffer_region_table_information == undefined)
                return this.select_all(this.bufferMySQL_DB, this.buffer_main_tables.regions);
            //Выполняем основные стадии процесса
            if ((this.stage === 0) && (this.stage <= this.finish_stage)) {
                //Чистим таблицу с логами
                this.truncate_table(this.buffer_main_tables.log);
                //Удаляем все лишние таблицы
                return this.delete_all_tables_stage_0();
            } else if ((this.stage === 1) && (this.stage <= this.finish_stage)) {
                //Перенос данных по регионам
                return this.distribution_region();
                //-----------------------------------------------------------//
            } else if ((this.stage === 2) && (this.stage <= this.finish_stage)) {
                //По необходимости обновлям информацию
                if (this.buffer_region_table_information.length < 1)
                    return this.select_all(this.bufferMySQL_DB, this.buffer_main_tables.regions);
                //Паралельно создаем главную таблицу для городов,деревень и.т.д
                this.create_main_city_table();
                //Создание таблиц для городов,деревень и.т.д
                return this.create_all_city_tables();
            } else if ((this.stage === 3) && (this.stage <= this.finish_stage)) {
                //По необходимости обновлям информацию
                if (this.buffer_region_table_information.length < 1)
                    return this.select_all(this.bufferMySQL_DB, this.buffer_main_tables.regions);
                //Паралельно очищаем данные в главной таблице городов, деревень и.т.д.
                this.truncate_table(this.buffer_main_tables.city);
                //Очистка всего содержимого у таблиц городов,деревень и.т.д
                return this.truncate_all_city_tables();
            } else if ((this.stage === 4) && (this.stage <= this.finish_stage)) {
                //По необходимости обновлям информацию
                if (this.buffer_region_table_information.length < 1)
                    return this.select_all(this.bufferMySQL_DB, this.buffer_main_tables.regions);
                //Перенос данных по городам, деревням и.т.д. (Запись в главную таблицу городов производится паралельно, внутри)
                return this.distribution_all_city_tables(0, (this.buffer_region_table_information.length - 1));
                //-----------------------------------------------------------//
            } else if ((this.stage === 5) && (this.stage <= this.finish_stage)) {
                //По необходимости обновлям информацию
                if (this.buffer_region_table_information.length < 1)
                    return this.select_all(this.bufferMySQL_DB, this.buffer_main_tables.regions);
                //Паралельно создаем главную таблицу для улиц
                this.create_main_street_table();
                //Создание таблиц для улиц
                return this.create_all_street_tables();
            } else if ((this.stage === 6) && (this.stage <= this.finish_stage)) {
                //По необходимости обновлям информацию
                if (this.buffer_region_table_information.length < 1)
                    return this.select_all(this.bufferMySQL_DB, this.buffer_main_tables.regions);
                //Паралельно очищаем главную таблицу  для улиц
                this.truncate_table(this.buffer_main_tables.street);
                //Очистка всего содержимого у таблиц улиц
                return this.truncate_all_street_tables();
            } else if ((this.stage === 7) && (this.stage <= this.finish_stage)) {
                //По необходимости обновлям информацию
                if (this.buffer_region_table_information.length < 1)
                    return this.select_all(this.bufferMySQL_DB, this.buffer_main_tables.regions);
                //Перенос данных по улицам (Запись в главную таблицу улиц производится паралельно, внутри)
                return this.distribution_all_street_tables(0, (this.buffer_region_table_information.length - 1));
                //-----------------------------------------------------------//
            } else if ((this.stage === 8) && (this.stage <= this.finish_stage)) {
                //По необходимости обновлям информацию
                if (this.buffer_region_table_information.length < 1)
                    return this.select_all(this.bufferMySQL_DB, this.buffer_main_tables.regions);
                //Паралельное создание главной таблицы для домов
                this.create_main_home_table();
                //Создание таблиц для домов
                return this.create_all_home_tables();
            } else if ((this.stage === 9) && (this.stage <= this.finish_stage)) {
                //По необходимости обновлям информацию
                if (this.buffer_region_table_information.length < 1)
                    return this.select_all(this.bufferMySQL_DB, this.buffer_main_tables.regions);
                //Паралельная очистка главной таблицы для домов
                this.truncate_table(this.buffer_main_tables.home);
                //Очистка всего содержимого у таблиц домов
                return this.truncate_all_home_tables();
            } else if ((this.stage === 10) && (this.stage <= this.finish_stage)) {
                //По необходимости обновлям информацию
                if (this.buffer_region_table_information.length < 1)
                    return this.select_all(this.bufferMySQL_DB, this.buffer_main_tables.regions);
                //Перенос данных по домам (Запись в главную таблицу домов производится паралельно, внутри)
                return this.distribution_all_home_tables(0, (this.buffer_region_table_information.length - 1));
            }

            return this.close_connection();
        };
        //++++++++++++++++++++++++++++++++++++++++++++++++++++++++++//

        Distribution.prototype.select_all = function (name_database, name_table) {
            //SELECT ALL
            var data, dataLength = 0, i, j, k, deleteObjects = [];
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
                        console.log('select_all', 'Полученна инфорамция из `dbf`.`logs` в строк', data.length);
                        _this.dbf_log_table_information = data;
                        _this.stage_controller();
                        return false;

                    } else if ((_this.bufferMySQL_DB === name_database) && (_this.buffer_main_tables.log === name_table)) {
                        console.log('select_all', 'Полученна инфорамция из `buffer`.`logs` в строк', data.length);
                        _this.buffer_log_table_information = data;
                        _this.stage_controller();
                        return false;
                    } else if ((_this.bufferMySQL_DB === name_database) && (_this.buffer_main_tables.socrbase === name_table)) {
                        console.log('select_all', 'Полученна инфорамция из `buffer`.`socrbase`  в строк', data.length);
                        _this.socrase_table_information = data;
                        _this.stage_controller();
                        return false;
                    } else if ((_this.bufferMySQL_DB === name_database) && (_this.buffer_main_tables.regions === name_table)) {
                        console.log('select_all', 'Полученна инфорамция из `buffer`.`regions` в строк', data.length);
                        dataLength = data.length;
                        for (i = 0; i < dataLength; i++)
                            for (j = (i + 1); j < dataLength; j++)
                                if (data[i].number == data[j].number) {
                                    console.log('select_all:', 'В `buffer`.`region` обнаружен дубль:', data[j].id, data[j].number, data[j].socr, data[j].name);
                                    data.splice(j, 1);
                                    dataLength = data.length;
                                }
                        console.log('select_all', 'В следствии дублей инфорамция из `buffer`.`regions` сокращена до', data.length);
                        _this.buffer_region_table_information = data;
                        _this.stage_controller();
                        return false;
                    }

                }
            })(this));
        };

        Distribution.prototype.delete_all_tables_stage_0 = function () {
            var key, keyBuffer, arrayLength, i;
            console.log('delete_all_tables_stage_0:', 'Внимание! Запущенна очистка всех лишних таблиц!');
            arrayLength = this.bufferMySQL_Tables.length;
            for (keyBuffer in  this.bufferMySQL_Tables[0]) key = keyBuffer;
            for (i = 0; i < arrayLength; i++) {
                switch (this.bufferMySQL_Tables[i][key]) {
                    case(this.buffer_main_tables.log):
                        break;
                    case(this.buffer_main_tables.socrbase):
                        break;
                    case(this.buffer_main_tables.regions):
                        break;
                    default:
                        this.drop_table(this.bufferMySQL_DB, this.bufferMySQL_Tables[i][key]);
                }
                if (i == (arrayLength - 1)) {
                    this.stage++;
                    this.stage_controller();
                }
            }
        };

        Distribution.prototype.record_in_log = function (event, dbf_table_name, table_name, rows) {
            var date_time = dateFormat(now, "yyyy-mm-dd HH:MM:ss");
            //Записываем данные в лог
            connection.query("INSERT INTO ??.?? " +
                "(`id`, `event_id`, `event`, `dbf_table_name`, `table_name`, `rows`, `date_time`) " +
                "VALUES (NULL, ?, ?, ?, ?, ?, NOW());",
                [this.bufferMySQL_DB, this.buffer_main_tables.log, this.stage, event, dbf_table_name, table_name, rows],
                function (error, result) {
                    if (error !== null) {
                        console.log("MySQL INSERT log Error: " + error);
                    }
                });
        };

        Distribution.prototype.distribution_region = function (start_row, finish_row) {
            //DISTRIBUTION REGION
            var row = 0, first_row = 0, end_row = 0;
            console.log('ACTIVATE DISTRIBUTION_REGION', 'STAGE:', this.stage);
            //Получаем общее колличество строк в запросе
            connection.query("SELECT COUNT(*) " +
                "FROM  ??.??" +
                "WHERE (" +
                "`socr` =  'Респ'" +
                "OR  `socr` =  'край'" +
                "OR  `socr` =  'обл'" +
                "OR  `socr` =  'АО'" +
                "OR  `socr` =  'Аобл')" +
                "AND  `code` LIKE  '%0000000000%'" +
                "ORDER BY  `code` ASC",
                [this.DBF_MySQL_DB, this.dbf_tables.kladr],
                function (error, result) {
                    if (error !== null) {
                        console.log("MySQL DISTRIBUTION REGION Error: " + error);
                    } else {
                        row = result[0]['COUNT(*)'];
                        eventEmitter.emit('get_region_count');
                    }
                });

            eventEmitter.once('get_region_count', (function (_this) {
                return function () {
                    console.log('distribution_region:', 'В таблице строк', _this.DBF_MySQL_DB, _this.dbf_tables.kladr, row);
                    if ((start_row !== undefined) && (start_row < row) && (start_row !== finish_row)) {
                        if ((finish_row !== undefined) && (finish_row <= row)) {
                            first_row = start_row;
                            end_row = finish_row;
                        } else {
                            first_row = start_row;
                            end_row = row;
                        }
                    } else {
                        first_row = 0;
                        end_row = row;
                    }
                    _this.record_in_log('start distribution region', _this.dbf_tables.kladr, _this.buffer_main_tables.regions, end_row);
                    _this.truncate_table(_this.buffer_main_tables.regions, first_row, end_row);
                }
            })(this));

        };

        Distribution.prototype.truncate_table = function (name_table, start_row, finish_row) {
            //Truncate DATABASES
            connection.query('TRUNCATE TABLE  ??.??',
                [this.bufferMySQL_DB, name_table],
                function (error, result) {
                    if (error !== null) {
                        console.log("MySQL Truncate Table Error: " + error);
                    } else {
                        eventEmitter.emit('truncate_table')
                    }
                }
            );

            eventEmitter.once('truncate_table', (function (_this) {
                return function () {
                    console.log('truncate_table:', 'Очистка таблицы прошла успешно:', _this.bufferMySQL_DB, name_table);
                    if (name_table == _this.buffer_main_tables.regions) {
                        _this.get_region_information(start_row, finish_row);
                    }
                }
            })(this));
        };

        Distribution.prototype.get_region_information = function (start_row, finish_row) {
            var data, dataLength, row_now = start_row, end_row = finish_row, limit = 0;

            //Определяем LIMIT для текущего захода
            if ((end_row - row_now) <= this.query_limit) {
                limit = (end_row - row_now);
                console.log('get_region_information:', 'Запрашиваю все строки:', limit);
            } else if (((end_row - row_now) > this.query_limit) && ((end_row - row_now) <= (this.query_limit + this.query_limit_error))) {
                limit = (end_row - row_now);
                console.log('get_region_information:', 'Запрашиваю строки c превышением лимита:', limit);
            } else if ((end_row - row_now) > (this.query_limit + this.query_limit_error)) {
                limit = this.query_limit;
                console.log('get_region_information:', 'Запрашиваю строки упершись в лимит:', limit);
            }

            connection.query("SELECT * " +
                "FROM  ??.?? " +
                "WHERE ( " +
                "`socr` =  'Респ' " +
                "OR  `socr` =  'край' " +
                "OR  `socr` =  'обл' " +
                "OR  `socr` =  'АО' " +
                "OR  `socr` =  'Аобл') " +
                "AND  `code` LIKE  '%0000000000%' " +
                "ORDER BY  `code` ASC " +
                "LIMIT ? , ?; ",
                [this.DBF_MySQL_DB, this.dbf_tables.kladr, row_now, limit],
                function (error, result) {
                    if (error !== null) {
                        console.log("MySQL SELECT * region Error: " + error);
                    } else {
                        data = result;
                        dataLength = result.length;
                        eventEmitter.emit('get_region_information');
                    }
                });
            eventEmitter.once('get_region_information', (function (_this) {
                return function () {
                    _this.record_region_information_container(data, dataLength, row_now, end_row);
                }
            })(this));
        };

        Distribution.prototype.record_region_information = function (data, dataLength, row_now, end_row) {

            var first_row = row_now;
            //Записываем данные при помощи цикла
            for (i = 0; i < dataLength; i++) {
                connection.query("INSERT INTO ??.?? " +
                    "(`id`,`dbf_id`, `number`, `name`, `socr`, `code`, `index`, `gninmb`, " +
                    "`uno`, `ocatd`, `status`) " +
                    "VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);",
                    [this.bufferMySQL_DB, this.buffer_main_tables.regions, data[i].id, data[i].code.slice(0, 3),
                        data[i].name, data[i].socr, data[i].code, data[i].index, data[i].gninmb,
                        data[i].uno, data[i].ocatd, data[i].status],
                    function (error, result) {
                        if (error !== null) {
                            console.log("MySQL INSERT regions Error: " + error);
                        } else {
                            row_now++;
                            console.log('record_region_information:', 'Запись строки прошла успешно строка:', row_now);
                            if ((first_row + dataLength) == result.insertId) {
                                eventEmitter.emit('record_region_information');
                            }
                        }
                    });
            }

            eventEmitter.once('record_region_information', (function (_this) {
                return function () {
                    if (row_now < end_row) {
                        console.log('record_region_information:', 'Произвожу рекурсивный запрос', row_now, end_row);
                        _this.get_region_information(row_now, end_row);
                    } else {
                        _this.record_in_log('finish record region information', _this.dbf_tables.kladr, _this.buffer_main_tables.regions, end_row);
                        console.log('record_region_information:', 'Запись произведена успешно', row_now, end_row);
                        _this.stage++;
                        _this.stage_controller();
                    }
                }
            })(this));
        };

        Distribution.prototype.record_region_information_container = function (data, dataLength, row_now, end_row) {
            //Получаем единую строку запроса
            var query_body = "INSERT INTO ??.?? (`id`,`dbf_id`, `number`, `name`, `socr`, `code`, `index`, `gninmb`, " +
                "`uno`, `ocatd`, `status`) VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            var query_tail = "(NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            var query = '', i;
            if (dataLength === 1)
                query += query_body + ";";
            else {
                for (i = 0; i < dataLength; i++) {
                    if (i === 0) {
                        query += query_body;
                    } else if ((dataLength - 1) === i) {
                        query = query + ', ' + query_tail + ';';
                    } else {
                        query = query + ', ' + query_tail;
                    }
                }
            }
            //Получаем единый массив запроса
            var main_array = [this.bufferMySQL_DB, this.buffer_main_tables.regions];
            var query_values = [];
            for (i = 0; i < dataLength; i++) {
                if (i === 0)
                    query_values = main_array.concat(data[i].id, data[i].code.slice(0, 3),
                        data[i].name, data[i].socr, data[i].code, data[i].index, data[i].gninmb,
                        data[i].uno, data[i].ocatd, data[i].status);
                else
                    query_values = query_values.concat(data[i].id, data[i].code.slice(0, 3),
                        data[i].name, data[i].socr, data[i].code, data[i].index, data[i].gninmb,
                        data[i].uno, data[i].ocatd, data[i].status);
            }

            //Записываем данные единым запросом
            connection.query(query, query_values,
                function (error, result) {
                    if (error !== null) {
                        console.log("MySQL INSERT regions Error: " + error);
                    } else {
                        row_now = row_now + dataLength;
                        console.log('record_region_information:', 'всего/записанно/контейнером :', end_row, row_now, dataLength);
                        eventEmitter.emit('record_region_information');
                    }
                });

            eventEmitter.once('record_region_information', (function (_this) {
                return function () {
                    if (row_now < end_row) {
                        console.log('record_region_information:', 'Произвожу рекурсивный запрос', row_now, end_row);
                        _this.get_region_information(row_now, end_row);
                    } else {
                        _this.record_in_log('finish record region information container', _this.dbf_tables.kladr, _this.buffer_main_tables.regions, end_row);
                        console.log('record_region_information:', 'Запись произведена успешно', row_now, end_row);
                        _this.stage++;
                        _this.stage_controller();
                    }
                }
            })(this));
        };

        Distribution.prototype.create_main_city_table = function () {
            //CREATE MAIN CITY TABLE

            this.record_in_log('start create main city table', this.dbf_tables.kladr, this.buffer_main_tables.city, 0);
            //Создаю главную таблицу для городов, деревень и.т.д
            connection.query("CREATE TABLE IF NOT EXISTS ??.?? (" +
                "`id` int(11) NOT NULL AUTO_INCREMENT," +
                "`dbf_id` int(11) NOT NULL," +
                "`region_id` int(11) NOT NULL," +
                "`region_number` int(11) NOT NULL," +
                "`city_id` int(11) NOT NULL," +
                "`name` varchar(80) NOT NULL DEFAULT ''," +
                "`socr` varchar(20) NOT NULL DEFAULT ''," +
                "`code` varchar(25) NOT NULL DEFAULT ''," +
                "`index` varchar(16) NOT NULL DEFAULT ''," +
                "`gninmb` varchar(14) NOT NULL DEFAULT ''," +
                "`uno` varchar(14) NOT NULL DEFAULT ''," +
                "`ocatd` varchar(21) NOT NULL DEFAULT ''," +
                "`status` varchar(11) NOT NULL DEFAULT ''," +
                "PRIMARY KEY (`id`)," +
                "KEY `dbf_id` (`dbf_id`)," +
                "KEY `region_id` (`region_id`)," +
                "KEY `region_number` (`region_number`)," +
                "KEY `city_id` (`city_id`)" +
                ") ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;",
                [this.bufferMySQL_DB, this.buffer_main_tables.city],
                function (error, result) {
                    if (error !== null) {
                        console.log("MySQL CREATE MAIN CITY TABLE Error: " + error);
                    } else {
                        eventEmitter.emit('create_main_city_table');
                    }
                });

            eventEmitter.once('create_main_city_table', (function (_this) {
                return function () {
                    console.log('create_main_city_table:', 'Внимание! Создание главной таблицы под города прошло успешно:', _this.bufferMySQL_DB, _this.buffer_main_tables.city);
                    _this.record_in_log('finish create main city tables', _this.bufferMySQL_DB, _this.buffer_main_tables.city, 0);
                }
            })(this));
        };

        Distribution.prototype.create_all_city_tables = function () {
            //CREATE ALL CITY TABLES
            var i, j = 0, table_name;
            var data = this.buffer_region_table_information;
            var dataLength = this.buffer_region_table_information.length;
            //Создаю все таблицы для городов при помощи цикла
            this.record_in_log('start create all city tables', this.dbf_tables.kladr, this.city_prefix, dataLength);
            for (i = 0; i < dataLength; i++) {
                table_name = data[i].number + this.city_prefix;
                connection.query("CREATE TABLE IF NOT EXISTS ??.?? (" +
                    "`id` int(11) NOT NULL AUTO_INCREMENT," +
                    "`dbf_id` int(11) NOT NULL," +
                    "`region_id` int(11) NOT NULL," +
                    "`name` varchar(80) NOT NULL DEFAULT ''," +
                    "`socr` varchar(20) NOT NULL DEFAULT ''," +
                    "`code` varchar(25) NOT NULL DEFAULT ''," +
                    "`index` varchar(16) NOT NULL DEFAULT ''," +
                    "`gninmb` varchar(14) NOT NULL DEFAULT ''," +
                    "`uno` varchar(14) NOT NULL DEFAULT ''," +
                    "`ocatd` varchar(21) NOT NULL DEFAULT ''," +
                    "`status` varchar(11) NOT NULL DEFAULT ''," +
                    "PRIMARY KEY (`id`)," +
                    "KEY `dbf_id` (`dbf_id`)," +
                    "KEY `region_id` (`region_id`)" +
                    ") ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;",
                    [this.bufferMySQL_DB, table_name],
                    function (error, result) {
                        if (error !== null) {
                            console.log("MySQL CREATE TABLE Error: " + error);
                        } else {
                            j++;
                            if ((dataLength - 1) == j) {
                                eventEmitter.emit('create_all_city_tables');
                            }
                        }
                    });
            }

            eventEmitter.once('create_all_city_tables', (function (_this) {
                return function () {
                    console.log('create_all_city_tables:', 'Внимание! Под города созданно новых таблиц:', dataLength);
                    _this.stage++;
                    _this.record_in_log('finish create all city tables', _this.dbf_tables.kladr, _this.city_prefix, dataLength);
                    _this.show_tables(_this.bufferMySQL_DB, 'create_all_city_tables'); //Обновляю данные по таблицам
                    _this.stage_controller();
                }
            })(this));
        };

        Distribution.prototype.truncate_all_city_tables = function () {
            //TRUNCATE ALL CITY TABLES
            var i, j = 0, table_name;
            var data = this.buffer_region_table_information;
            var dataLength = this.buffer_region_table_information.length;
            //Очищаю все данные хранящиеся в таблицах городов
            this.record_in_log('start truncate all city tables', this.dbf_tables.kladr, this.city_prefix, dataLength);
            for (i = 0; i < dataLength; i++) {
                table_name = data[i].number + this.city_prefix;
                connection.query('TRUNCATE TABLE  ??.??',
                    [this.bufferMySQL_DB, table_name],
                    function (error, result) {
                        if (error !== null) {
                            console.log("MySQL Truncate Table Error: " + error);
                        } else {
                            j++;
                            if ((dataLength - 1) == j) {
                                eventEmitter.emit('truncate_all_city_tables');
                            }
                        }
                    }
                );
            }

            eventEmitter.once('truncate_all_city_tables', (function (_this) {
                return function () {
                    console.log('truncate_all_city_tables:', 'Внимание! Прошла очистка всего содержимого в таблицах городов.', dataLength);
                    _this.stage++;
                    _this.record_in_log('finish truncate all city tables', _this.dbf_tables.kladr, _this.city_prefix, dataLength);
                    _this.stage_controller();
                }
            })(this));
        };

        Distribution.prototype.distribution_all_city_tables = function (first_key, last_kay, start_row, finish_row) {
            //DISTRIBUTION ALL CITY TABLES
            var row = 0, first_row = 0, end_row = 0;
            var region_number = this.buffer_region_table_information[first_key].number;
            var table_name = region_number + this.city_prefix;
            if (first_key === 0) {
                console.log('ACTIVATE DISTRIBUTION_CITY', 'STAGE:', this.stage);
                this.record_in_log('start distribution all city tables', this.dbf_tables.kladr, this.city_prefix, last_kay);
            }
            //Получаем общее колличество строк в запросе
            connection.query("SELECT COUNT(*) " +
                "FROM  ??.??" +
                "WHERE (" +
                "`socr` <>  'Респ'" +
                "AND  `socr` <>  'край' " +
                "AND  `socr` <>  'обл' " +
                "AND  `socr` <>  'АО' " +
                "AND  `socr` <>  'Аобл') " +
                "AND  `code` LIKE  ? " +
                "ORDER BY  `code` ASC ;",
                [this.DBF_MySQL_DB, this.dbf_tables.kladr, region_number + '%'],
                function (error, result) {
                    if (error !== null) {
                        console.log("MySQL DISTRIBUTION ALL CITY TABLES Error: " + error);
                    } else {
                        row = result[0]['COUNT(*)'];
                        eventEmitter.emit('distribution_all_city_tables');
                    }
                });

            eventEmitter.once('distribution_all_city_tables', (function (_this) {
                return function () {
                    console.log('distribution_all_city_tables:', 'В таблице строк', _this.DBF_MySQL_DB, _this.dbf_tables.kladr, row);
                    if (row < 1) {
                        first_key++;
                        if (first_key < last_kay) {
                            console.log('distribution_all_city_tables:', 'Внимание! По запросу ничего не найденно! Запрашиваю города по следующему региону', region_number, first_key, last_kay, start_row, finish_row);
                            _this.record_in_log('empty query', _this.dbf_tables.kladr, table_name, end_row);
                            _this.distribution_all_city_tables(first_key, last_kay, start_row, finish_row);

                        } else {
                            console.log('distribution_all_city_tables:', 'Внимание! По последнему запросу ни найденно ни одной строки. Запись завершенна.', region_number, first_key, last_kay, start_row, finish_row);
                            _this.record_in_log('empty query', _this.dbf_tables.kladr, table_name, end_row);
                            _this.record_in_log('finish record all city information container', _this.dbf_tables.kladr, _this.city_prefix, end_row);
                            _this.stage++;
                            _this.stage_controller();
                        }
                    } else {
                        if ((start_row !== undefined) && (start_row < row) && (start_row !== finish_row)) {
                            if ((finish_row !== undefined) && (finish_row <= row)) {
                                first_row = start_row;
                                end_row = finish_row;
                            } else {
                                first_row = start_row;
                                end_row = row;
                            }
                        } else {
                            first_row = 0;
                            end_row = row;
                        }
                        _this.record_in_log('start record city one region', _this.dbf_tables.kladr, table_name, end_row);
                        _this.get_city_information(start_row, finish_row, first_row, end_row, region_number, table_name, first_key, last_kay);
                    }
                }
            })(this));
        };

        Distribution.prototype.get_city_information = function (start_row, finish_row, first_row, end_row, region_number, table_name, first_key, last_kay) {
            var data, dataLength, limit = 0;

            //Определяем LIMIT для текущего захода
            if ((end_row - first_row) <= this.query_limit) {
                limit = (end_row - first_row);
                console.log('get_region_information:', 'Запрашиваю все строки:', limit);
            } else if (((end_row - first_row) > this.query_limit) && ((end_row - first_row) <= (this.query_limit + this.query_limit_error))) {
                limit = (end_row - first_row);
                console.log('get_region_information:', 'Запрашиваю строки c превышением лимита:', limit);
            } else if ((end_row - first_row) > (this.query_limit + this.query_limit_error)) {
                limit = this.query_limit;
                console.log('get_region_information:', 'Запрашиваю строки упершись в лимит:', limit);
            }

            connection.query("SELECT * " +
                "FROM  ??.?? " +
                "WHERE ( " +
                "`socr` <>  'Респ'" +
                "AND  `socr` <>  'край' " +
                "AND  `socr` <>  'обл' " +
                "AND  `socr` <>  'АО' " +
                "AND  `socr` <>  'Аобл') " +
                "AND  `code` LIKE  ? " +
                "ORDER BY  `code` ASC " +
                "LIMIT ? , ?; ",
                [this.DBF_MySQL_DB, this.dbf_tables.kladr, region_number + '%', first_row, limit],
                function (error, result) {
                    if (error !== null) {
                        console.log("MySQL get city information Error: " + error);
                    } else {
                        data = result;
                        dataLength = result.length;
                        eventEmitter.emit('get_city_information');
                    }
                });
            eventEmitter.once('get_city_information', (function (_this) {
                return function () {
                    _this.record_in_log('get city information', _this.dbf_tables.kladr, table_name, end_row);
                    _this.record_main_city_information_container(data, dataLength, start_row, finish_row, first_row, end_row, region_number, table_name, first_key, last_kay);
                    _this.record_city_information_container(data, dataLength, start_row, finish_row, first_row, end_row, region_number, table_name, first_key, last_kay);
                }
            })(this));
        };

        Distribution.prototype.record_main_city_information_container = function (data, dataLength, start_row, finish_row, first_row, end_row, region_number, table_name, first_key, last_kay) {
            //Получаем единую строку запроса
            var query_body = "INSERT INTO ??.?? (`id`, `dbf_id`, `region_id`, `region_number`, `city_id`, `name`, `socr`, `code`, `index`, `gninmb`, `uno`, `ocatd`, `status`) VALUES ( NULL , ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            var query_tail = "( NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            var query = '', i;
            if (dataLength === 1)
                query += query_body + ";";
            else {
                for (i = 0; i < dataLength; i++) {
                    if (i === 0) {
                        query += query_body;
                    } else if ((dataLength - 1) === i) {
                        query = query + ', ' + query_tail + ';';
                    } else {
                        query = query + ', ' + query_tail;
                    }
                }
            }

            //Получаем единый массив запроса
            var main_array = [this.bufferMySQL_DB, this.buffer_main_tables.city];
            var query_values = [];
            for (i = 0; i < dataLength; i++) {
                if (i === 0)
                    query_values = main_array.concat(data[i].id, this.buffer_region_table_information[first_key].id,
                        this.buffer_region_table_information[first_key].number, (i + 1 + first_row), data[i].name, data[i].socr, data[i].code, data[i].index, data[i].gninmb, data[i].uno, data[i].ocatd, data[i].status);
                else
                    query_values = query_values.concat(data[i].id, this.buffer_region_table_information[first_key].id,
                        this.buffer_region_table_information[first_key].number, (i + 1 + first_row), data[i].name, data[i].socr, data[i].code, data[i].index, data[i].gninmb, data[i].uno, data[i].ocatd, data[i].status);
            }


            //Записываем данные единым запросом
            connection.query(query, query_values,
                function (error, result) {
                    if (error !== null) {
                        console.log("MySQL insert main city table Error: " + error);
                    } else {
                        first_row = first_row + dataLength;
                        console.log('record_main_city_information_container:', 'всего/записанно/контейнером :', end_row, first_row, dataLength);
                    }
                });
        };

        Distribution.prototype.record_city_information_container = function (data, dataLength, start_row, finish_row, first_row, end_row, region_number, table_name, first_key, last_kay) {
            //Получаем единую строку запроса
            var query_body = "INSERT INTO ??.?? (`id`, `dbf_id`,`region_id`, `name`, `socr`, `code`, `index`, `gninmb`, `uno`, `ocatd`, `status`) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            var query_tail = "( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            var query = '', i;
            if (dataLength === 1)
                query += query_body + ";";
            else {
                for (i = 0; i < dataLength; i++) {
                    if (i === 0) {
                        query += query_body;
                    } else if ((dataLength - 1) === i) {
                        query = query + ', ' + query_tail + ';';
                    } else {
                        query = query + ', ' + query_tail;
                    }
                }
            }

            //Получаем единый массив запроса
            var main_array = [this.bufferMySQL_DB, table_name];
            var query_values = [];
            for (i = 0; i < dataLength; i++) {
                if (i === 0)
                    query_values = main_array.concat((i + 1 + first_row), data[i].id, this.buffer_region_table_information[first_key].id,
                        data[i].name, data[i].socr, data[i].code, data[i].index, data[i].gninmb,
                        data[i].uno, data[i].ocatd, data[i].status);
                else
                    query_values = query_values.concat((i + 1 + first_row), data[i].id, this.buffer_region_table_information[first_key].id,
                        data[i].name, data[i].socr, data[i].code, data[i].index, data[i].gninmb,
                        data[i].uno, data[i].ocatd, data[i].status);
            }

            //Записываем данные единым запросом
            connection.query(query, query_values,
                function (error, result) {
                    if (error !== null) {
                        console.log("MySQL INSERT regions Error: " + error);
                    } else {
                        first_row = first_row + dataLength;
                        console.log('record_city_information_container:', 'всего/записанно/контейнером :', end_row, first_row, dataLength);
                        eventEmitter.emit('record_city_information_container');
                    }
                });

            eventEmitter.once('record_city_information_container', (function (_this) {
                return function () {
                    if (first_row < end_row) {
                        console.log('record_city_information_container:', 'Запрашиваю очередные строки', region_number, first_row, end_row);
                        _this.get_city_information(start_row, finish_row, first_row, end_row, region_number, table_name, first_key, last_kay);

                    } else if ((first_row === end_row) && (first_key < last_kay)) {
                        first_key++;
                        console.log('record_city_information_container:', 'Запрашиваю города по очередному региону', region_number, first_key, last_kay, start_row, finish_row);
                        _this.record_in_log('finish record city one region', _this.dbf_tables.kladr, table_name, end_row);
                        _this.distribution_all_city_tables(first_key, last_kay, start_row, finish_row);

                    } else {
                        console.log('record_city_information_container:', 'Перенос всей информации по городам прошел успешно', first_key, last_kay, start_row, finish_row);
                        _this.record_in_log('finish record city one region', _this.dbf_tables.kladr, table_name, end_row);
                        _this.record_in_log('finish record all city information container', _this.dbf_tables.kladr, _this.city_prefix, end_row);
                        _this.stage++;
                        _this.stage_controller();
                    }
                }
            })(this));
        };

        Distribution.prototype.create_main_street_table = function () {
            //CREATE MAIN STREET TABLE
            this.record_in_log('start create main street table', this.dbf_tables.street, this.buffer_main_tables.street, 0);
            //Создаю главную таблицу для улиц
            connection.query("CREATE TABLE IF NOT EXISTS ??.?? (" +
                "`id` int(11) NOT NULL AUTO_INCREMENT," +
                "`dbf_id` int(11) NOT NULL," +
                "`region_id` int(11) NOT NULL," +
                "`region_number` int(11) NOT NULL," +
                "`city_id` int(11) NOT NULL," +
                "`street_id` int(11) NOT NULL," +
                "`name` varchar(80) NOT NULL DEFAULT ''," +
                "`socr` varchar(20) NOT NULL DEFAULT ''," +
                "`code` varchar(28) NOT NULL DEFAULT ''," +
                "`index` varchar(16) NOT NULL DEFAULT ''," +
                "`gninmb` varchar(14) NOT NULL DEFAULT ''," +
                "`uno` varchar(14) NOT NULL DEFAULT ''," +
                "`ocatd` varchar(21) NOT NULL DEFAULT ''," +
                "PRIMARY KEY (`id`)," +
                "KEY `dbf_id` (`dbf_id`)," +
                "KEY `region_id` (`region_id`)," +
                "KEY `region_number` (`region_number`)," +
                "KEY `city_id` (`city_id`)," +
                "KEY `street_id` (`street_id`) " +
                ") ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;",
                [this.bufferMySQL_DB, this.buffer_main_tables.street],
                function (error, result) {
                    if (error !== null) {
                        console.log("MySQL CREATE MAIN STREET TABLE Error: " + error);
                    } else {
                        eventEmitter.emit('create_main_street_table');
                    }
                });

            eventEmitter.once('create_main_street_table', (function (_this) {
                return function () {
                    console.log('create_main_street_table:', 'Внимание! Создание главной таблицы под улицы прошло успешно:', _this.bufferMySQL_DB, _this.buffer_main_tables.street);
                    _this.record_in_log('finish create main street table', _this.bufferMySQL_DB, _this.buffer_main_tables.street, 0);
                }
            })(this));
        };

        Distribution.prototype.create_all_street_tables = function () {
            //CREATE ALL STREET TABLES
            var i, j = 0, table_name;
            var data = this.buffer_region_table_information;
            var dataLength = this.buffer_region_table_information.length;
            //Создаю все таблицы для городов при помощи цикла
            this.record_in_log('start create all street tables', this.dbf_tables.street, this.street_prefix, dataLength);
            for (i = 0; i < dataLength; i++) {
                table_name = data[i].number + this.street_prefix;
                connection.query("CREATE TABLE IF NOT EXISTS ??.?? (" +
                    "`id` int(11) NOT NULL AUTO_INCREMENT," +
                    "`dbf_id` int(11) NOT NULL," +
                    "`region_id` int(11) NOT NULL," +
                    "`region_number` int(11) NOT NULL," +
                    "`city_id` int(11) NOT NULL," +
                    "`name` varchar(80) NOT NULL DEFAULT ''," +
                    "`socr` varchar(20) NOT NULL DEFAULT ''," +
                    "`code` varchar(28) NOT NULL DEFAULT ''," +
                    "`index` varchar(16) NOT NULL DEFAULT ''," +
                    "`gninmb` varchar(14) NOT NULL DEFAULT ''," +
                    "`uno` varchar(14) NOT NULL DEFAULT ''," +
                    "`ocatd` varchar(21) NOT NULL DEFAULT ''," +
                    "PRIMARY KEY (`id`)," +
                    "KEY `dbf_id` (`dbf_id`)," +
                    "KEY `region_id` (`region_id`)," +
                    "KEY `region_number` (`region_number`)," +
                    "KEY `city_id` (`city_id`) " +
                    ") ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;",
                    [this.bufferMySQL_DB, table_name],
                    function (error, result) {
                        if (error !== null) {
                            console.log("MySQL CREATE TABLE Error: " + error);
                        } else {
                            j++;
                            if ((dataLength - 1) == j) {
                                eventEmitter.emit('create_all_street_tables');
                            }
                        }
                    });
            }
            eventEmitter.once('create_all_street_tables', (function (_this) {
                return function () {
                    console.log('create_all_street_tables:', 'Внимание! Под улицы созданно новых таблиц:', dataLength);
                    _this.stage++;
                    _this.record_in_log('finish create all street tables', _this.dbf_tables.street, _this.street_prefix, dataLength);
                    _this.show_tables(_this.bufferMySQL_DB, 'create_all_street_tables'); //Обновляю данные по таблицам
                    _this.stage_controller();
                }
            })(this));
        };

        Distribution.prototype.truncate_all_street_tables = function () {
            //TRUNCATE ALL STREET TABLES
            var i, j = 0, table_name;
            var data = this.buffer_region_table_information;
            var dataLength = this.buffer_region_table_information.length;
            //Очищаю все данные в таблицах улиц
            this.record_in_log('start truncate all street tables', this.dbf_tables.street, this.street_prefix, dataLength);
            for (i = 0; i < dataLength; i++) {
                table_name = data[i].number + this.street_prefix;
                connection.query('TRUNCATE TABLE  ??.??',
                    [this.bufferMySQL_DB, table_name],
                    function (error, result) {
                        if (error !== null) {
                            console.log("MySQL Truncate STREET Tables Error: " + error);
                        } else {
                            j++;
                            if ((dataLength - 1) == j) {
                                eventEmitter.emit('truncate_all_street_tables');
                            }
                        }
                    }
                );
            }

            eventEmitter.once('truncate_all_street_tables', (function (_this) {
                return function () {
                    console.log('truncate_all_street_tables:', 'Внимание! Прошла очистка всего содержимого в таблицах улиц.', dataLength);
                    _this.stage++;
                    _this.record_in_log('finish truncate all street tables', _this.dbf_tables.street, _this.street_prefix, dataLength);
                    _this.stage_controller();
                }
            })(this));
        };

        Distribution.prototype.distribution_all_street_tables = function (first_key, last_kay, start_row, finish_row) {
            //DISTRIBUTION ALL STREET TABLES
            var city_data = [], cityDataLength = 0, first_city_key = 0;
            var region_number = this.buffer_region_table_information[first_key].number;
            var city_table_name = region_number + this.city_prefix;
            if (first_key === 0) {
                console.log('ACTIVATE DISTRIBUTION_STREET', 'STAGE:', this.stage);
                this.record_in_log('start distribution all street tables', this.dbf_tables.street, this.street_prefix, last_kay);
            }
            //Получаем общее число городов, деревень... в регионе
            connection.query('SELECT * FROM ??.??', [this.bufferMySQL_DB, city_table_name],
                function (error, result) {
                    if (error !== null) {
                        console.log("MySQL USE DATABASES Error: " + error);
                    } else {
                        city_data = result;
                        cityDataLength = result.length;
                        eventEmitter.emit('select_all_one_city_table');
                    }
                });

            eventEmitter.once('select_all_one_city_table', (function (_this) {
                return function () {
                    if (cityDataLength == 0) {//Если в регионе НЕТ городов, деревень...
                        if (first_key < last_kay) {//Если это НЕ последний регион
                            first_key++;
                            console.log('distribution_all_street_tables:', 'Внимание! В таблице', city_table_name, 'колличество городов', cityDataLength);
                            console.log('distribution_all_street_tables:', 'Произвожу запрос по следующему региону', first_key, last_kay);
                            _this.record_in_log('empty city table', _this.bufferMySQL_DB, city_table_name, cityDataLength);
                            _this.distribution_all_street_tables(first_key, last_kay, start_row, finish_row);
                        } else {//Если это последний регион
                            console.log('get_street_count_information:', 'ПРОЦЕСС ЗАПИСИ ЗАВЕРШЕН.', region_number, first_key, last_kay, start_row, finish_row);
                            _this.record_in_log('not found city in region', region_number, city_table_name, cityDataLength);
                            _this.record_in_log('finish record all street information container', _this.dbf_tables.street, _this.street_prefix);
                            _this.stage++;
                            _this.stage_controller();
                        }
                    } else {//Если в регионе ЕСТЬ городова, деревени...
                        console.log('distribution_all_street_tables:', 'В таблице', city_table_name, 'колличество городов', cityDataLength);
                        console.log('distribution_all_street_tables:', 'Перехожу к запросу числа улиц по городу', first_key, last_kay);
                        _this.buffer_city_table_information = city_data;
                        _this.record_in_log('city table capacity', _this.bufferMySQL_DB, city_table_name, cityDataLength);
                        _this.get_street_count_information(first_key, last_kay, start_row, finish_row, region_number, first_city_key, (cityDataLength - 1));
                    }
                }
            })(this));
        };

        Distribution.prototype.get_street_count_information = function (first_key, last_kay, start_row, finish_row, region_number, first_city_key, last_city_key) {
            var row = 0, first_row = 0, end_row = 0;
            var city_name = this.buffer_city_table_information[first_city_key].name;
            var city_code = this.buffer_city_table_information[first_city_key].code;
            var table_name = region_number + this.street_prefix;
            //Получаем общее колличество улиц по городу
            connection.query("SELECT COUNT(*) " +
                "FROM  ??.?? " +
                "WHERE  `code` LIKE  ? " +
                "ORDER BY  `code` ASC ;",
                [this.DBF_MySQL_DB, this.dbf_tables.street, city_code + '%'],
                function (error, result) {
                    if (error !== null) {
                        console.log("MySQL GET STREET COUNT INFORMATION Error: " + error);
                    } else {
                        row = result[0]['COUNT(*)'];
                        eventEmitter.emit('get_street_count_information');
                    }
                });

            eventEmitter.once('get_street_count_information', (function (_this) {
                return function () {
                    console.log('get_street_count_information:', 'регион/город/улиц', region_number, city_name, row);
                    if (row < 1) { //Если по городу, деревне... нет ни одной улицы
                        first_city_key++;
                        if (first_city_key < last_city_key) { //Если это НЕ последний город, село... в регионе
                            console.log('get_street_count_information:', 'Внимание! Запрашиваю число улиц по следующему городу,деревне...', region_number, first_city_key, last_city_key);
                            _this.record_in_log('not found street in city', _this.dbf_tables.street, city_code, row);
                            _this.get_street_count_information(first_key, last_kay, start_row, finish_row, region_number, first_city_key, last_city_key);
                        } else if (first_key < last_kay) { //Если это последний город, село... в НЕ последнем регионе
                            console.log('get_street_count_information:', 'Внимание! Запрашиваю число городов,деревень... по следующему региону', region_number, first_key, last_kay, start_row, finish_row);
                            _this.record_in_log('not found street in city', _this.dbf_tables.street, city_code, row);
                            _this.record_in_log('finish record all city information container', _this.dbf_tables.kladr, _this.city_prefix);
                            _this.distribution_all_street_tables(first_key, last_kay, start_row, finish_row);
                        } else { //Если это последний город, село... в последнем регионе
                            console.log('get_street_count_information:', 'ПРОЦЕСС ЗАПИСИ ЗАВЕРШЕН.', region_number, first_key, last_kay, start_row, finish_row);
                            _this.record_in_log('not found street in city', _this.dbf_tables.street, city_code, row);
                            _this.record_in_log('finish record all street information container', _this.dbf_tables.street, _this.street_prefix);
                            _this.stage++;
                            _this.stage_controller();
                        }
                    } else { //Если по городу, деревне... найденны улицы
                        if ((start_row !== undefined) && (start_row < row) && (start_row !== finish_row)) {
                            if ((finish_row !== undefined) && (finish_row <= row)) {
                                first_row = start_row;
                                end_row = finish_row;
                            } else {
                                first_row = start_row;
                                end_row = row;
                            }
                        } else {
                            first_row = 0;
                            end_row = row;
                        }
                        _this.record_in_log('start record street in one city', _this.dbf_tables.street, table_name, end_row);
                        _this.get_street_information(start_row, finish_row, first_row, end_row, region_number, table_name, first_key, last_kay);
                    }
                }
            })(this));
        };

        Distribution.prototype.get_street_information = function (start_row, finish_row, first_row, end_row, region_number, table_name, first_key, last_kay) {
            var data, dataLength, limit = 0;

            //Определяем LIMIT для текущего захода
            if ((end_row - first_row) <= this.query_limit) {
                limit = (end_row - first_row);
                console.log('get_region_information:', 'Запрашиваю все строки:', limit);
            } else if (((end_row - first_row) > this.query_limit) && ((end_row - first_row) <= (this.query_limit + this.query_limit_error))) {
                limit = (end_row - first_row);
                console.log('get_region_information:', 'Запрашиваю строки c превышением лимита:', limit);
            } else if ((end_row - first_row) > (this.query_limit + this.query_limit_error)) {
                limit = this.query_limit;
                console.log('get_region_information:', 'Запрашиваю строки упершись в лимит:', limit);
            }

            connection.query("SELECT * " +
                "FROM  ??.?? " +
                "WHERE ( " +
                "`socr` <>  'Респ'" +
                "AND  `socr` <>  'край' " +
                "AND  `socr` <>  'обл' " +
                "AND  `socr` <>  'АО' " +
                "AND  `socr` <>  'Аобл') " +
                "AND  `code` LIKE  ? " +
                "ORDER BY  `code` ASC " +
                "LIMIT ? , ?; ",
                [this.DBF_MySQL_DB, this.dbf_tables.kladr, region_number + '%', first_row, limit],
                function (error, result) {
                    if (error !== null) {
                        console.log("MySQL get city information Error: " + error);
                    } else {
                        data = result;
                        dataLength = result.length;
                        eventEmitter.emit('get_city_information');
                    }
                });
            eventEmitter.once('get_city_information', (function (_this) {
                return function () {
                    _this.record_in_log('get city information', _this.dbf_tables.kladr, table_name, end_row);
                    _this.record_main_city_information_container(data, dataLength, start_row, finish_row, first_row, end_row, region_number, table_name, first_key, last_kay);
                    _this.record_city_information_container(data, dataLength, start_row, finish_row, first_row, end_row, region_number, table_name, first_key, last_kay);
                }
            })(this));
        };

        Distribution.prototype.record_main_street_information_container = function (data, dataLength, start_row, finish_row, first_row, end_row, region_number, table_name, first_key, last_kay) {
            //Получаем единую строку запроса
            var query_body = "INSERT INTO ??.?? (`id`, `dbf_id`, `region_id`, `region_number`, `city_id`, `name`, `socr`, `code`, `index`, `gninmb`, `uno`, `ocatd`, `status`) VALUES ( NULL , ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            var query_tail = "( NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            var query = '', i;
            if (dataLength === 1)
                query += query_body + ";";
            else {
                for (i = 0; i < dataLength; i++) {
                    if (i === 0) {
                        query += query_body;
                    } else if ((dataLength - 1) === i) {
                        query = query + ', ' + query_tail + ';';
                    } else {
                        query = query + ', ' + query_tail;
                    }
                }
            }

            //Получаем единый массив запроса
            var main_array = [this.bufferMySQL_DB, this.buffer_main_tables.city];
            var query_values = [];
            for (i = 0; i < dataLength; i++) {
                if (i === 0)
                    query_values = main_array.concat(data[i].id, this.buffer_region_table_information[first_key].id,
                        this.buffer_region_table_information[first_key].number, (i + 1 + first_row), data[i].name, data[i].socr, data[i].code, data[i].index, data[i].gninmb, data[i].uno, data[i].ocatd, data[i].status);
                else
                    query_values = query_values.concat(data[i].id, this.buffer_region_table_information[first_key].id,
                        this.buffer_region_table_information[first_key].number, (i + 1 + first_row), data[i].name, data[i].socr, data[i].code, data[i].index, data[i].gninmb, data[i].uno, data[i].ocatd, data[i].status);
            }


            //Записываем данные единым запросом
            connection.query(query, query_values,
                function (error, result) {
                    if (error !== null) {
                        console.log("MySQL insert main city table Error: " + error);
                    } else {
                        first_row = first_row + dataLength;
                        console.log('record_main_city_information_container:', 'всего/записанно/контейнером :', end_row, first_row, dataLength);
                    }
                });
        };

        Distribution.prototype.record_street_information_container = function (data, dataLength, start_row, finish_row, first_row, end_row, region_number, table_name, first_key, last_kay) {
            //Получаем единую строку запроса
            var query_body = "INSERT INTO ??.?? (`id`, `dbf_id`,`region_id`, `name`, `socr`, `code`, `index`, `gninmb`, `uno`, `ocatd`, `status`) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            var query_tail = "( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            var query = '', i;
            if (dataLength === 1)
                query += query_body + ";";
            else {
                for (i = 0; i < dataLength; i++) {
                    if (i === 0) {
                        query += query_body;
                    } else if ((dataLength - 1) === i) {
                        query = query + ', ' + query_tail + ';';
                    } else {
                        query = query + ', ' + query_tail;
                    }
                }
            }

            //Получаем единый массив запроса
            var main_array = [this.bufferMySQL_DB, table_name];
            var query_values = [];
            for (i = 0; i < dataLength; i++) {
                if (i === 0)
                    query_values = main_array.concat((i + 1 + first_row), data[i].id, this.buffer_region_table_information[first_key].id,
                        data[i].name, data[i].socr, data[i].code, data[i].index, data[i].gninmb,
                        data[i].uno, data[i].ocatd, data[i].status);
                else
                    query_values = query_values.concat((i + 1 + first_row), data[i].id, this.buffer_region_table_information[first_key].id,
                        data[i].name, data[i].socr, data[i].code, data[i].index, data[i].gninmb,
                        data[i].uno, data[i].ocatd, data[i].status);
            }

            //Записываем данные единым запросом
            connection.query(query, query_values,
                function (error, result) {
                    if (error !== null) {
                        console.log("MySQL INSERT regions Error: " + error);
                    } else {
                        first_row = first_row + dataLength;
                        console.log('record_city_information_container:', 'всего/записанно/контейнером :', end_row, first_row, dataLength);
                        eventEmitter.emit('record_city_information_container');
                    }
                });

            eventEmitter.once('record_city_information_container', (function (_this) {
                return function () {
                    if (first_row < end_row) {
                        console.log('record_city_information_container:', 'Запрашиваю очередные строки', region_number, first_row, end_row);
                        _this.get_city_information(start_row, finish_row, first_row, end_row, region_number, table_name, first_key, last_kay);

                    } else if ((first_row === end_row) && (first_key < last_kay)) {
                        first_key++;
                        console.log('record_city_information_container:', 'Запрашиваю города по очередному региону', region_number, first_key, last_kay, start_row, finish_row);
                        _this.record_in_log('finish record city one region', _this.dbf_tables.kladr, table_name, end_row);
                        _this.distribution_all_city_tables(first_key, last_kay, start_row, finish_row);

                    } else {
                        console.log('record_city_information_container:', 'Перенос всей информации по городам прошел успешно', first_key, last_kay, start_row, finish_row);
                        _this.record_in_log('finish record city one region', _this.dbf_tables.kladr, table_name, end_row);
                        _this.record_in_log('finish record all city information container', _this.dbf_tables.kladr, _this.city_prefix, end_row);
                        _this.stage++;
                        _this.stage_controller();
                    }
                }
            })(this));
        };

        Distribution.prototype.create_main_home_table = function () {
            //CREATE MAIN HOME TABLE
            this.record_in_log('start create main home table', this.bufferMySQL_DB, this.buffer_main_tables.home, 0);
            //Создаю главную таблицу для домов
            connection.query("CREATE TABLE IF NOT EXISTS ??.?? (" +
                "`id` int(11) NOT NULL AUTO_INCREMENT," +
                "`dbf_id` int(11) NOT NULL," +
                "`region_id` int(11) NOT NULL," +
                "`region_number` int(11) NOT NULL," +
                "`city_id` int(11) NOT NULL," +
                "`street_id` int(11) NOT NULL," +
                "`home_id` int(11) NOT NULL," +
                "`name` varchar(80) NOT NULL DEFAULT ''," +
                "`socr` varchar(20) NOT NULL DEFAULT ''," +
                "`code` varchar(28) NOT NULL DEFAULT ''," +
                "`index` varchar(16) NOT NULL DEFAULT ''," +
                "`gninmb` varchar(14) NOT NULL DEFAULT ''," +
                "`uno` varchar(14) NOT NULL DEFAULT ''," +
                "`ocatd` varchar(21) NOT NULL DEFAULT ''," +
                "PRIMARY KEY (`id`)," +
                "KEY `dbf_id` (`dbf_id`)," +
                "KEY `region_id` (`region_id`)," +
                "KEY `region_number` (`region_number`)," +
                "KEY `city_id` (`city_id`)," +
                "KEY `street_id` (`street_id`)," +
                "KEY `home_id` (`home_id`) " +
                ") ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;",
                [this.bufferMySQL_DB, this.buffer_main_tables.home],
                function (error, result) {
                    if (error !== null) {
                        console.log("MySQL CREATE MAIN HOME TABLE Error: " + error);
                    } else {
                        eventEmitter.emit('create_main_home_table');
                    }
                });

            eventEmitter.once('create_main_home_table', (function (_this) {
                return function () {
                    console.log('create_main_home_table:', 'Внимание! Создание главной таблицы под дома прошло успешно:', _this.bufferMySQL_DB, _this.buffer_main_tables.home);
                    _this.record_in_log('finish create main home table', _this.bufferMySQL_DB, _this.buffer_main_tables.home, 0);
                }
            })(this));
        };

        Distribution.prototype.create_all_home_tables = function () {
            //CREATE ALL STREET TABLES
            var i, j = 0, table_name;
            var data = this.buffer_region_table_information;
            var dataLength = this.buffer_region_table_information.length;
            //Создаю все таблицы для городов при помощи цикла
            this.record_in_log('start create all home tables', this.dbf_tables.doma, this.home_prefix, dataLength);
            for (i = 0; i < dataLength; i++) {
                table_name = data[i].number + this.home_prefix;
                connection.query("CREATE TABLE IF NOT EXISTS ??.?? (" +
                    "`id` int(11) NOT NULL AUTO_INCREMENT," +
                    "`dbf_id` int(11) NOT NULL," +
                    "`region_id` int(11) NOT NULL," +
                    "`region_number` int(11) NOT NULL," +
                    "`city_id` int(11) NOT NULL," +
                    "`street_id` int(11) NOT NULL," +
                    "`name` varchar(80) NOT NULL DEFAULT ''," +
                    "`socr` varchar(20) NOT NULL DEFAULT ''," +
                    "`code` varchar(28) NOT NULL DEFAULT ''," +
                    "`index` varchar(16) NOT NULL DEFAULT ''," +
                    "`gninmb` varchar(14) NOT NULL DEFAULT ''," +
                    "`uno` varchar(14) NOT NULL DEFAULT ''," +
                    "`ocatd` varchar(21) NOT NULL DEFAULT ''," +
                    "PRIMARY KEY (`id`)," +
                    "KEY `dbf_id` (`dbf_id`)," +
                    "KEY `region_id` (`region_id`)," +
                    "KEY `region_number` (`region_number`)," +
                    "KEY `city_id` (`city_id`)," +
                    "KEY `street_id` (`street_id`) " +
                    ") ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;",
                    [this.bufferMySQL_DB, table_name],
                    function (error, result) {
                        if (error !== null) {
                            console.log("MySQL CREATE ALL DOME TABLE Error: " + error);
                        } else {
                            j++;
                            if ((dataLength - 1) == j) {
                                eventEmitter.emit('create_all_home_tables');
                            }
                        }
                    });
            }
            eventEmitter.once('create_all_home_tables', (function (_this) {
                return function () {
                    console.log('create_all_city_tables:', 'Внимание! Под дома созданно новых таблиц:', dataLength);
                    _this.stage++;
                    _this.record_in_log('finish create all home tables', _this.dbf_tables.doma, _this.home_prefix, dataLength);
                    _this.show_tables(_this.bufferMySQL_DB, 'create_all_home_tables'); //Обновляю данные по таблицам
                    _this.stage_controller();
                }
            })(this));
        };

        Distribution.prototype.truncate_all_home_tables = function () {
            //TRUNCATE ALL HOME TABLES
            var i, j = 0, table_name;
            var data = this.buffer_region_table_information;
            var dataLength = this.buffer_region_table_information.length;
            //Очищаю все данные в таблицах домов
            this.record_in_log('start truncate all home tables', this.dbf_tables.doma, this.home_prefix, dataLength);
            for (i = 0; i < dataLength; i++) {
                table_name = data[i].number + this.home_prefix;
                connection.query('TRUNCATE TABLE  ??.??',
                    [this.bufferMySQL_DB, table_name],
                    function (error, result) {
                        if (error !== null) {
                            console.log("MySQL Truncate Home Tables Error: " + error);
                        } else {
                            j++;
                            if ((dataLength - 1) == j) {
                                eventEmitter.emit('truncate_all_home_tables');
                            }
                        }
                    }
                );
            }

            eventEmitter.once('truncate_all_home_tables', (function (_this) {
                return function () {
                    console.log('truncate_all_home_tables:', 'Внимание! Прошла очистка всего содержимого в таблицах домов.', dataLength);
                    _this.stage++;
                    _this.record_in_log('finish truncate all home tables', _this.dbf_tables.doma, _this.home_prefix, dataLength);
                    _this.stage_controller();
                }
            })(this));
        };

        Distribution.prototype.distribution_all_home_tables = function () {
            //DISTRIBUTION ALL HOME TABLES

            this.stage++;
            this.stage_controller();

            /*eventEmitter.emit('distribution_all_home_tables');
             eventEmitter.once('distribution_all_home_tables', (function (_this) {
             return function () {
             _this.stage++;
             //_this.record_in_log('finish distribution all home tables', _this.dbf_tables.kladr, _this.city_prefix, dataLength);
             _this.stage_controller();
             }
             })(this));*/
        };

        Distribution.prototype.drop_table = function (name_database, name_table) {
            //DROP DATABASES
            connection.query('DROP TABLE IF EXISTS ??.??',
                [name_database, name_table],
                function (error, result) {
                    if (error !== null) {
                        console.log("MySQL DROP TABLE Error: " + error);
                    } else {
                        eventEmitter.emit('drop_table');
                    }
                }
            );

            eventEmitter.once('drop_table', (function (_this) {
                return function () {
                    console.log('drop_table:', 'Внимание! Таблица Удалена', name_database, name_table);
                }
            })(this));
        };

        Distribution.prototype.drop_database = function (name_database) {
            //DROP DATABASES
            connection.query('DROP DATABASE IF EXISTS ??`', name_database,
                function (error, result) {
                    if (error !== null) {
                        console.log("MySQL DROP DATABASES Error: " + error);
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