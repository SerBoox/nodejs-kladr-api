//Модуль сборки статистики c API
(function () {
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

        function Statistics(ip,url,query) { //Все переменные которые нужно принять

            this.MySQL_Settings = parameters.DataBase.kladr_statistics;
            this.Statistics_DB_Name = parameters.DataBase.kladr_statistics.name;

            this.statistics_tables = {
                ip: 'ip_statistics',
                hour: 'hour_statistics',
                api_use: 'api_use_statistics',
                region: 'region_statistics',
                city: 'city_statistics',
                street: 'street_statistics',
                home: 'home_statistics'
            };

            this.ip = ip;
            this.url = url;
            this.query = query;

            this.stage = 0;
            this.finish_stage = 15;

        }

        //++++++++++++++++++++++++++++++++++++++++++++++++++++++++++//

        Statistics.prototype.statistics_controller = function () {
            //console.log('ACTIVATE STATISTICS_CONTROLLER', 'STAGE:', this.stage);
            //Выполняем основные стадии процесса
            if ((this.stage === 0) && (this.stage <= this.finish_stage)) {
                //Усланавливаем соединение
                return this.open_connection();
            } else if ((this.stage === 1) && (this.stage <= this.finish_stage)) {
                //Проверям существует ли база `kladr_api_statistics`, если нет то создаем
                return this.create_database(this.Statistics_DB_Name);
            }else if ((this.stage === 2) && (this.stage <= this.finish_stage)) {
                //Проверям существует ли таблица `ip_statistics`, если нет то создаем
                return this.create_ip_statistics_table();
            } else if ((this.stage === 3) && (this.stage <= this.finish_stage)) {
                //Производим запись `kladr_api_statistics`
               return this.record_in_ip_statistics_table();
            }

            return this.close_connection();
        };

        //++++++++++++++++++++++++++++++++++++++++++++++++++++++++++//

        Statistics.prototype.open_connection = function () {
            //Parameters MySQL connection
            connection = mysql.createConnection({
                host: this.MySQL_Settings.host,
                port: this.MySQL_Settings.port,
                connectTimeout: 9999999999,
                //database: this.Statistics_DB_Name,
                user: this.MySQL_Settings.user,
                password: this.MySQL_Settings.password
            });

            //MySQL Connection
            connection.connect(function (error) {
                if (error !== null) {
                    console.log('MySQL connection Error: ' + error);
                } else {
                    //console.log('START MySQL CONNECTION');
                    eventEmitter.emit('open_connection');
                }
            });

            eventEmitter.once('open_connection', (function (_this) {
                return function () {
                    _this.stage++;
                    _this.statistics_controller();
                }
            })(this));

        };

        Statistics.prototype.create_database = function (name_database) {
            //USE DATABASE
            connection.query('CREATE DATABASE IF NOT EXISTS ?? CHARACTER SET utf8 COLLATE utf8_general_ci;', name_database, function (error, result) {
                if (error !== null) {
                    console.log("MySQL CREATE DATABASES Error: " + error);
                } else {
                    eventEmitter.emit('create_database');
                }
            });

            eventEmitter.once('create_database', (function (_this) {
                return function () {
                    _this.stage++;
                    _this.statistics_controller();
                }
            })(this));
        };

        Statistics.prototype.create_ip_statistics_table = function () {
            //CREATE IP STATISTIC TABLE
            connection.query(
                "CREATE TABLE IF NOT EXISTS ??.?? (" +
                "`id` int(11) NOT NULL AUTO_INCREMENT, " +
                "`ip` varchar(70) NOT NULL DEFAULT '', " +
                "`url` varchar(70) NOT NULL DEFAULT '', " +
                "`query` varchar(400) NOT NULL DEFAULT '', " +
                "`date_time` datetime NOT NULL, " +
                "PRIMARY KEY (`id`) " +
                ") ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;",
                [this.Statistics_DB_Name, this.statistics_tables.ip],
                function (error, result) {
                    if (error !== null) {
                        console.log("MySQL CREATE IP STATISTIC TABLE Error: " + error);
                    } else {
                        eventEmitter.emit('create_ip_statistics_table');
                    }
                });

            eventEmitter.once('create_ip_statistics_table', (function (_this) {
                return function () {
                    _this.stage++;
                    _this.statistics_controller();
                }
            })(this));
        };

        Statistics.prototype.record_in_ip_statistics_table = function () {
            var date_time = dateFormat(now, "yyyy-mm-dd HH:MM:ss");
           // console.log(this.Statistics_DB_Name,this.statistics_tables.ip, this.ip, this.url, this.query);
            //Зносим данные в статистику
            connection.query("INSERT INTO ??.?? " +
                "(`id`, `ip`, `url`, `query`, `date_time`) " +
                "VALUES (NULL, ?, ?, ?, NOW());",
                [this.Statistics_DB_Name,this.statistics_tables.ip, this.ip, this.url, this.query],
                function (error, result) {
                    if (error !== null) {
                        console.log("MySQL INSERT ip statistic information Error: " + error);
                    }else{
                        eventEmitter.emit('create_ip_statistics_table');
                    }
                });

            eventEmitter.once('create_ip_statistics_table', (function (_this) {
                return function () {
                    _this.stage++;
                    _this.statistics_controller();
                }
            })(this));

        };

        Statistics.prototype.close_connection = function () {
            //SHOW DATABASES
            connection.end(function () {
                //console.log('CLOSE MYSQL CONNECTION');
            });
        };

        return Statistics;

    })(eventEmitter);


    module.exports = Statistics;

}).call(this);