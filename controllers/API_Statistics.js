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


var Statistics, connection,
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


Statistics = (function (_super) {
    __extends(Statistics, _super);

    function Statistics() {

        this.tableMySQL = parameters.DataBase.kladr_buffer;
        this.bufferMySQL_DB = parameters.DataBase.kladr_buffer.name;
        this.bufferMySQL_Tables = [];
        this.DBF_MySQL_DB = parameters.DataBase.kladr_dbf.name;
        this.DBF_MySQL_Tables = [];
        this.databases = [];
        this.stage = 0;
        this.finish_stage = 77;
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
            home: '000_home',
            home_parse: '000_home_parse'
        };

        this.KLADR_API_DB = 'kladr_api';
        this.KLADR_API_Tables = [];
        eventEmitter.setMaxListeners(50000);
        this.row = 0;
        this.query_limit = 5000;
        this.query_limit_error = 5000;
        this.city_prefix = '_city';
        this.street_prefix = '_street';
        this.home_prefix = '_home';
        this.home_parse_prefix = '_home_parse';

        this.MEMORY_DB_NAME = 'kladr_buffer_memory';
        this.Buffer_MEMORY_MySQL_Tables = [];
        this.memory_street_table_name = '000_street_dbf';
        this.memory_doma_table_name = '000_doma_dbf';

        this.backup_api_db = '';
    }

    Statistics.prototype.open_connection = function () {
        //Parameters MySQL connection
        connection = mysql.createConnection({
            host: this.tableMySQL.host,
            port: this.tableMySQL.port,
            connectTimeout: 9999999999,
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
                _this.search_mysql_global_variables();
                _this.show_databases();
            }
        })(this));

    };

    Statistics.prototype.search_mysql_global_variables = function () {
        //SEARCH_MySQL_Global_variables
        var data;
        connection.query('SHOW GLOBAL VARIABLES',
            function (error, result) {
                if (error !== null) {
                    console.log("MySQL Search MySQL Global Variables Error: " + error);
                } else {
                    data = result;
                    eventEmitter.emit('search_mysql_global_variables');
                }
            }
        );

        eventEmitter.once('search_mysql_global_variables', (function (_this) {
            return function () {
                console.log('ПОЛУЧЕНЫ ЗНАЧЕНИЯ ГЛОБАЛЬНЫХ ПЕРЕМЕННЫХ MySQL');
                _this.MySQL_Global_Variables = data;
                //Поиск ключа `max heap table size`
                _this.search_mysql_global_values('max_heap_table_size');
            }
        })(this));
    };

    Statistics.prototype.search_mysql_global_values = function (variable) {
        //SEARCH MYSQL GLOBAL VARIABLES
        var dataLength = this.MySQL_Global_Variables.length;
        var variableValue = undefined, i;

        if (dataLength < 1) {
            return console.log('search_max_heap_table_size', 'Внимание! MySQL_Global_Variables length', dataLength);
        }

        eventEmitter.once('search_mysql_global_values', (function (_this) {
            return function () {
                if (variableValue != undefined) {
                    console.log('Найденна MySQL переменная:', variable, variableValue);
                    if (variable === 'max_heap_table_size') {
                        _this.max_heap_table_size = parseInt(variableValue, 10);
                    } else {

                    }
                } else {
                    console.log('Глобальная Переменная MySQL НЕ найденна:', variable);
                }

            }
        })(this));

        for (i = 0; i < dataLength; i++) {
            //console.log(this.MySQL_Global_Variables[i][this.MySQL_Global_Variables_variable_name], '==', variable);
            if (this.MySQL_Global_Variables[i][this.MySQL_Global_Variables_variable_name] == variable) {
                variableValue = this.MySQL_Global_Variables[i][this.MySQL_Global_Variables_value];
            }
            if (i === (dataLength - 1)) {
                return eventEmitter.emit('search_mysql_global_values');
            }
        }

    };

    Statistics.prototype.show_databases = function (event) {
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
                console.log('show_databases:', 'Список баз данных обновлен! Найденно баз: ' + dataLength);
                if (event === 'nothing') {
                    return false;
                } else if (event === 'show_and_next') {
                    _this.stage++;
                    _this.stage_controller();
                } else if (dataLength !== undefined) {
                    _this.find_database(_this.tableMySQL.name);
                } else {
                    console.log('show_databases:', 'Внимание! Ни одной базы данных не найденно!');
                }
            }
        })(this));
    };

    Statistics.prototype.find_database = function (name_database) {
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

    Statistics.prototype.create_database = function (name_database, event) {
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
                if (event === 'nothing') {
                } else if (event === 'street_memory_distribution') {
                    _this.stage_street_distribution++;
                    return _this.stage_controller_all_street_memory_distribution();
                } else if (event === 'home_memory_distribution') {
                    _this.stage_home_distribution++;
                    return _this.stage_controller_all_home_memory_distribution();
                } else {
                    _this.show_databases();
                }
            }
        })(this));
    };

    Statistics.prototype.use_database = function (name_database) {
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

    Statistics.prototype.show_tables = function (database, event) {
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
                    if (event === 'nothing') {
                    } else if (event === 'show_and_next') {
                        _this.stage++;
                        _this.stage_controller();
                    } else if (event === 'update') {
                        _this.validate_main_tables(_this.DBF_MySQL_DB);
                    }

                } else if (database === _this.bufferMySQL_DB) {
                    _this.bufferMySQL_Tables = (dataLength > 0) ? data : [];
                    console.log('show_tables:', 'В базе: ' + database + ' найденно таблиц: ' + dataLength, 'event:', event);
                    if (event === 'nothing') {
                    } else if (event === 'show_and_next') {
                        _this.stage++;
                        _this.stage_controller();
                    } else if (event === 'update') {
                        _this.validate_main_tables(_this.bufferMySQL_DB);
                    }
                } else if (database === _this.MEMORY_DB_NAME) {
                    _this.Buffer_MEMORY_MySQL_Tables = (dataLength > 0) ? data : [];
                    console.log('show_tables:', 'В базе: ' + database + ' найденно таблиц: ' + dataLength, 'event:', event);
                    if (event === 'nothing') {
                    } else if (event === 'street_memory_distribution') {
                        _this.stage_street_distribution++;
                        _this.stage_controller_all_street_memory_distribution();
                    } else if (event === 'home_memory_distribution') {
                        _this.stage_home_distribution++;
                        _this.stage_controller_all_home_memory_distribution();
                    }
                } else if (database === _this.KLADR_API_DB) {
                    _this.KLADR_API_Tables = (dataLength > 0) ? data : [];
                    console.log('show_tables:', 'В базе: ' + database + ' найденно таблиц: ' + dataLength, 'event:', event);
                    if (event === 'nothing') {
                    } else if (event === 'show_and_next') {
                        _this.stage++;
                        _this.stage_controller();
                    }
                }
            }
        })(this));
    };

    Statistics.prototype.validate_main_tables = function (name_database) {
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

    Statistics.prototype.create_log_table = function () {
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
            ") ENGINE=MyISAM DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;",
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

    Statistics.prototype.distribution_socrbase = function () {
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

    Statistics.prototype.create_regions_table = function () {
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
            ") ENGINE=MyISAM DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;",
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
    Statistics.prototype.stage_controller = function () {
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
        } else if ((this.stage === 7) && (this.stage <= this.finish_stage) &&
            (this.max_heap_table_size < this.need_heap_size)) {
            //По необходимости обновлям информацию
            if (this.buffer_region_table_information.length < 1)
                return this.select_all(this.bufferMySQL_DB, this.buffer_main_tables.regions);
            //Перенос данных по улицам (Запись в главную таблицу улиц производится паралельно, внутри)
            return this.distribution_all_street_tables(0, (this.buffer_region_table_information.length - 1));
        } else if ((this.stage === 7) && (this.stage <= this.finish_stage) &&
            (this.max_heap_table_size >= this.need_heap_size)) {
            //По необходимости обновлям информацию
            if (this.buffer_region_table_information.length < 1)
                return this.select_all(this.bufferMySQL_DB, this.buffer_main_tables.regions);
            //Перенос данных по улицам (Запись в главную таблицу улиц производится паралельно, внутри)
            return this.stage_controller_all_street_memory_distribution(0, (this.buffer_region_table_information.length - 1));
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
        } else if ((this.stage === 10) && (this.stage <= this.finish_stage) &&
            (this.max_heap_table_size < this.need_heap_size)) {
            //По необходимости обновлям информацию
            if (this.buffer_region_table_information.length < 1)
                return this.select_all(this.bufferMySQL_DB, this.buffer_main_tables.regions);
            //Перенос данных по домам (Запись в главную таблицу домов производится паралельно, внутри)
            return this.distribution_all_home_tables(0, (this.buffer_region_table_information.length - 1));
        } else if ((this.stage === 10) && (this.stage <= this.finish_stage) &&
            (this.max_heap_table_size >= this.need_heap_size)) {
            //По необходимости обновлям информацию
            if (this.buffer_region_table_information.length < 1)
                return this.select_all(this.bufferMySQL_DB, this.buffer_main_tables.regions);
            //Перенос данных по домам (Запись в главную таблицу домов производится паралельно, внутри)
            return this.stage_controller_all_home_memory_distribution(0, (this.buffer_region_table_information.length - 1));
            //-----------------------------------------------------------//
        } else if ((this.stage === 11) && (this.stage <= this.finish_stage)) {
            //По необходимости обновлям информацию
            if (this.buffer_region_table_information.length < 1)
                return this.select_all(this.bufferMySQL_DB, this.buffer_main_tables.regions);
            //Паралельное создание главной таблицы для распарсенных домов
            this.create_main_home_parse_table();
            //Создание таблиц для распарсенных домов
            return this.create_all_home_parse_tables();
        } else if ((this.stage === 12) && (this.stage <= this.finish_stage)) {
            //По необходимости обновлям информацию
            if (this.buffer_region_table_information.length < 1)
                return this.select_all(this.bufferMySQL_DB, this.buffer_main_tables.regions);
            //Паралельная очистка главной таблицы для домов
            this.truncate_table(this.buffer_main_tables.home_parse);
            //Очистка всего содержимого у таблиц распарсенных домов
            return this.truncate_all_home_parse_tables();
        } else if ((this.stage === 13) && (this.stage <= this.finish_stage)) {
            //По необходимости обновлям информацию
            if (this.buffer_region_table_information.length < 1)
                return this.select_all(this.bufferMySQL_DB, this.buffer_main_tables.regions);
            //Перенос данных по домам (Запись в главную таблицу домов производится паралельно, внутри)
            return this.distribution_all_home_parse_tables(0, (this.buffer_region_table_information.length - 1));
            //-----------------------------------------------------------//
        } else if ((this.stage === 14) && (this.stage <= this.finish_stage)) {
            //Обновляем список таблиц в базе `kladr_api`
            this.show_tables(this.KLADR_API_DB, 'nothing');
            //Обновляем список баз данных
            return this.show_databases('show_and_next');
        } else if ((this.stage === 15) && (this.stage <= this.finish_stage)) {
            //Обновляем список таблиц в базе `kladr_buffer`
            return this.show_tables(this.bufferMySQL_DB, 'show_and_next');
        } else if ((this.stage === 16) && (this.stage <= this.finish_stage)) {
            //Проверяем существует ли база с именем kladr_api + текущий год + текущий месяц, например "kladr_api_2016_01", если да то удаляем создаем заново и делам бекап базы `kladr_api`
            return this.drop_old_and_backup_api_db();
        } else if ((this.stage === 17) && (this.stage <= this.finish_stage)) {
            //Перемещаем все `kladr_buffer` таблицы в базу `kladr_api`
            return this.distribution_buffer_db_in_api_db();
        }

        return this.close_connection();
    };

    //++++++++++++++++++++++++++++++++++++++++++++++++++++++++++//

    Statistics.prototype.select_all = function (name_database, name_table) {
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

    Statistics.prototype.delete_all_tables_stage_0 = function () {
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

    Statistics.prototype.record_in_log = function (event, dbf_table_name, table_name, rows) {
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

    //++++++++++++++++++++++++++++++++++++++++++++++++++++++++++//OTHER METHODS

    Statistics.prototype.MYSQL_RECCONECTION = function (event) {
        //Parameters MySQL connection
        connection = mysql.createConnection({
            host: this.tableMySQL.host,
            port: this.tableMySQL.port,
            connectTimeout: 9999999999,
            //database: this.tableMySQL.name,
            user: this.tableMySQL.user,
            password: this.tableMySQL.password
        });

        //MySQL Connection
        connection.connect(function (error) {
            if (error !== null) {
                console.log('MySQL reconnection Error: ' + error);
            } else {
                console.log('RESTART MySQL CONNECTION');
                eventEmitter.emit('MYSQL_RECCONECTION');
            }
        });

        eventEmitter.once('MYSQL_RECCONECTION', (function (_this) {
            return function () {
                if (event == 'nothing') {

                }
            }
        })(this));

    };

    Statistics.prototype.cutHomeName = function (name) {
        var request = '';
        var requestLength = 0;
        var strIndexOf = 0;
        var nameLength = name.length;
        var value_1 = '', value_2 = '';

        if (name.indexOf('двлд') !== -1) {
            strIndexOf = name.indexOf('двлд');
            request = name.substring((strIndexOf + 4), nameLength);
            if (request.indexOf('сооружение') !== -1) {
                strIndexOf = request.indexOf('сооружение'); //Если нет то -1
                request = request.substring(0, strIndexOf);
            } else if (request.indexOf('литер') !== -1) {
                requestLength = request.length;
                strIndexOf = request.indexOf('литер'); //Если нет то -1
                request = request.substring(0, strIndexOf) + request.substring(strIndexOf + 5, requestLength);
            }
        } else if (name.indexOf('влд') !== -1) {
            strIndexOf = name.indexOf('влд'); //Если нет то -1
            request = name.substring((strIndexOf + 3), nameLength);
            if (request.indexOf('сооружение') !== -1) {
                strIndexOf = request.indexOf('сооружение'); //Если нет то -1
                request = request.substring(0, strIndexOf);
            } else if (request.indexOf('литер') !== -1) {
                requestLength = request.length;
                strIndexOf = request.indexOf('литер'); //Если нет то -1
                request = request.substring(0, strIndexOf) + request.substring(strIndexOf + 5, requestLength);
            }
        } else if (name.indexOf('стр') !== -1) {
            strIndexOf = name.indexOf('стр'); //Если нет то -1
            value_1 = name.substring(0, strIndexOf);
            value_2 = name.substring((strIndexOf + 3), nameLength);
            if ((value_1 == value_2) || (value_1 == ''))
                request = name.substring((strIndexOf + 3), nameLength);
            else
                request = name;

        } else if (name.indexOf('сооружение') !== -1) {
            strIndexOf = name.indexOf('сооружение'); //Если нет то -1
            request = name.substring((strIndexOf + 10), nameLength);
        } else if (name.indexOf('литер') !== -1) {
            strIndexOf = name.indexOf('литер'); //Если нет то -1
            request = name.substring(0, strIndexOf) + name.substring(strIndexOf + 5, nameLength);
        } else {
            request = name;
        }
        return request;
    };

    Statistics.prototype.charge_engine_on_engine_for_all_memory_tables = function (first_key, last_kay, ENGINE, event) {
        //CHANGE ENGINE ON MEMORY
        var keyObject, tableObjectKey, memory_table_name;
        if ((first_key === undefined) || (last_kay === undefined) || (ENGINE === undefined)) {
            console.log('charge_engine_on_engine_for_all_memory_tables:', 'Значения необходимые для работы метода отсутствуют', first_key, last_kay, ENGINE);
        }

        //Получение ключа объекта
        for (keyObject in this.Buffer_MEMORY_MySQL_Tables[0]) tableObjectKey = keyObject;
        //Получение названия таблицы
        memory_table_name = this.Buffer_MEMORY_MySQL_Tables[first_key][tableObjectKey];

        connection.query('ALTER TABLE  ??.?? ENGINE =' + ENGINE + ';',
            [this.MEMORY_DB_NAME, memory_table_name],
            function (error, result) {
                if (error !== null) {
                    console.log("MySQL charge engine on engine memory for all street tables Error: " + error);
                } else {
                    eventEmitter.emit('charge_engine_on_engine_for_all_memory_tables');
                }
            });

        eventEmitter.once('charge_engine_on_engine_for_all_memory_tables', (function (_this) {
            return function () {
                console.log(first_key, last_kay, event);
                console.log('charge_engine_on_engine_for_all_memory_tables:', 'Смена ENGINE успешна', _this.MEMORY_DB_NAME, memory_table_name, 'ENGINE=' + ENGINE);
                if (event === 'nothing') {
                } else if (event === 'street_memory_distribution') {
                    if (first_key < last_kay) {
                        first_key++;
                        _this.charge_engine_on_engine_for_all_memory_tables(first_key, last_kay, ENGINE, event);
                    } else if (first_key === last_kay) {
                        _this.stage_street_distribution++;
                        _this.stage_controller_all_street_memory_distribution();
                    }
                } else if (event === 'home_memory_distribution') {
                    if (first_key < last_kay) {
                        first_key++;
                        _this.charge_engine_on_engine_for_all_memory_tables(first_key, last_kay, ENGINE, event);
                    } else if (first_key === last_kay) {
                        _this.stage_home_distribution++;
                        _this.stage_controller_all_home_memory_distribution();
                    }
                }
            }
        })(this));

    };

    Statistics.prototype.charge_engine_on_engine_for_one_memory_tables = function (table_name, ENGINE, event) {
        //CHANGE ENGINE ON MEMORY
        if ((table_name === undefined) || (ENGINE === undefined)) {
            console.log('charge_engine_on_engine_for_all_memory_tables:', 'Значения необходимые для работы метода отсутствуют', table_name, ENGINE);
        }

        connection.query('ALTER TABLE  ??.?? ENGINE =' + ENGINE + ';',
            [this.MEMORY_DB_NAME, table_name],
            function (error, result) {
                if (error !== null) {
                    console.log("MySQL charge engine on engine for one memory tables Error: " + error);
                } else {
                    eventEmitter.emit('charge_engine_on_engine_for_one_memory_tables');
                }
            });

        eventEmitter.once('charge_engine_on_engine_for_one_memory_tables', (function (_this) {
            return function () {
                console.log('charge_engine_on_engine_for_one_memory_tables:', 'Смена ENGINE успешна', _this.MEMORY_DB_NAME, table_name, 'ENGINE=' + ENGINE);
                if (event === 'nothing') {
                } else if (event === 'street_memory_distribution') {
                    _this.stage_street_distribution++;
                    _this.stage_controller_all_street_memory_distribution();
                } else if (event === 'home_memory_distribution') {
                    _this.stage_home_distribution++;
                    _this.stage_controller_all_home_memory_distribution();
                }
            }
        })(this));

    };

    Statistics.prototype.drop_table = function (name_database, name_table) {
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

    Statistics.prototype.drop_database = function (name_database, event) {
        //DROP DATABASES
        connection.query('DROP DATABASE IF EXISTS ??', name_database,
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
                console.log('drop_database:', 'База данных', name_database, 'удалена!');
                if (event === 'nothing') {
                    return false;
                } else if (event === 'street_memory_distribution') {
                    _this.stage_street_distribution++;
                    return _this.stage_controller_all_street_memory_distribution();
                } else if (event === 'home_memory_distribution') {
                    _this.stage_home_distribution++;
                    return _this.stage_controller_all_home_memory_distribution();
                } else {
                    _this.show_databases('nothing');
                }
            }
        })(this));
    };

    Statistics.prototype.close_connection = function () {
        //SHOW DATABASES
        connection.end(function () {
            console.log('CLOSE MYSQL CONNECTION');
        });
    };

    return Statistics;

})(eventEmitter);

var statistics = new Statistics();
statistics.open_connection();