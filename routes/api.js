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
var iconv = require('iconv-lite');
var now = new Date();
eventEmitter.setMaxListeners(50000);

var api_main_tables = {
    log: '000_record_time_log',
    socrbase: '000_socrbase',
    regions: '000_regions',
    city: '000_city',
    street: '000_street',
    home: '000_home'
};

var city_prefix = '_city';
var street_prefix = '_street';
var home_prefix = '_home';

var pageLimit = 50;

router.get('/test', function (req, res, next) {


    console.log(query);
    console.log(parameters);

    res.send(query);
});

router.get('/', function (req, res, next) {
    res.render('api', {title: 'Express'});
});

router.get('/region', function (req, res, next) {
    var Region, connection,
        __hasProp = {}.hasOwnProperty,
        __extends = function (child, parent) {
            for (var key in parent) {
                if (__hasProp.call(parent, key)) child[key] = parent[key];
            }
            function ctor() {
                this.constructor = child;
            }

            child.__super__ = parent.prototype;
            return child;
        };

    Region = (function (_super) {
        __extends(Region, _super);

        function Region() {
            this.tableMySQL = parameters.DataBase.kladr_api;
            this.API_MySQL_DB_Name = parameters.DataBase.kladr_api.name;

            this.stage = 0;
        }

        Region.prototype.query_controller = function () {
            if (this.stage === 0) {
                return this.open_connection();
            } else if (this.stage === 1) {
                return this.find_all_region(this.API_MySQL_DB_Name, api_main_tables.regions);
            }

            this.close_connection();
        };

        Region.prototype.open_connection = function () {
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
                    eventEmitter.emit('connection');
                }
            });

            eventEmitter.once('connection', (function (_this) {
                return function () {
                    _this.stage++;
                    _this.query_controller();
                }
            })(this));

        };

        Region.prototype.find_all_region = function (name_database, name_table) {
            var data = [], dataLength, query, parameters, regions = [], response = {}, i;
            var start_time = new Date().getTime();

            var page = (parseInt(req.query.page, 10) > 0) ? parseInt(req.query.page, 10) : 0;
            var pageNumber = (page > 1) ? ((page - 1) * pageLimit) : 0;

            query = "SELECT `id`,`number`,`name`,`socr`,`code`,`index`,`gninmb`,`ocatd`"
                + "FROM  ??.?? LIMIT ? , ?";
            parameters = [name_database, name_table, pageNumber, pageLimit];


            connection.query(query, parameters,
                function (error, result, fields) {
                    if (error !== null) {
                        console.log("MySQL find all region Error: " + error);
                    } else {

                        data = result;
                        //console.log(result);
                        dataLength = result.length;
                        eventEmitter.emit('find_all_region');
                    }
                }
            );


            eventEmitter.once('find_all_region', (function (_this) {
                return function () {

                    for (i = 0; i < dataLength; i++) {
                        regions[i] = {
                            id: data[i].id,
                            number: (data[i].number.slice(2, 2) == 0) ? parseInt(data[i].number.slice(0, 2), 10) : parseInt(data[i].number, 10),
                            name: data[i].name,
                            socr: data[i].socr,
                            kladr_code: data[i].code,
                            index: data[i].index,
                            gninmb: data[i].gninmb,
                            ocatd: data[i].ocatd
                        }
                    }

                    response = {
                        time: new Date().getTime() - start_time,
                        page: (page == 0) ? 1 : page,
                        regions: regions
                    };

                    res.send(response);
                    _this.stage++;
                    _this.query_controller();
                }
            })(this));
        };

        Region.prototype.close_connection = function () {
            //SHOW DATABASES
            connection.end(function () {
                console.log('CLOSE MYSQL CONNECTION');
            });
        };

        return Region;

    })(eventEmitter);

    var region = new Region();
    region.query_controller();
});

router.get('/region/name', function (req, res, next) {
    var Region_name, connection,
        __hasProp = {}.hasOwnProperty,
        __extends = function (child, parent) {
            for (var key in parent) {
                if (__hasProp.call(parent, key)) child[key] = parent[key];
            }
            function ctor() {
                this.constructor = child;
            }

            child.__super__ = parent.prototype;
            return child;
        };

    Region_name = (function (_super) {
        __extends(Region_name, _super);

        function Region_name() {
            this.tableMySQL = parameters.DataBase.kladr_api;
            this.API_MySQL_DB_Name = parameters.DataBase.kladr_api.name;

            this.stage = 0;
        }

        Region_name.prototype.query_controller = function () {
            if (this.stage === 0) {
                return this.open_connection();
            } else if (this.stage === 1) {
                return this.find_region_where_name(this.API_MySQL_DB_Name, api_main_tables.regions);
            }

            this.close_connection();
        };

        Region_name.prototype.open_connection = function () {
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
                    eventEmitter.emit('connection');
                }
            });

            eventEmitter.once('connection', (function (_this) {
                return function () {
                    _this.stage++;
                    _this.query_controller();
                }
            })(this));

        };

        Region_name.prototype.find_region_where_name = function (name_database, name_table) {
            var data = [], dataLength, query, parameters, regions = [], response = {}, i;
            var name = (req.query.name == undefined) ? '%' : req.query.name + '%';
            var start_time = new Date().getTime();

            var nameLength = (req.query.name == undefined) ? 0 : req.query.name.length;
            var page = (parseInt(req.query.page, 10) > 0) ? parseInt(req.query.page, 10) : 0;
            var pageNumber = (page > 1) ? ((page - 1) * pageLimit) : 0;

            if (nameLength > 0) {
                query = "SELECT `id`,`number`,`name`,`socr`,`code`,`index`,`gninmb`,`ocatd`" +
                    " FROM  ??.?? WHERE `name` LIKE  ? LIMIT ? , ?";
                parameters = [name_database, name_table, name, pageNumber, pageLimit];
            } else {
                query = "SELECT `id`,`number`,`name`,`socr`,`code`,`index`,`gninmb`,`ocatd`"
                    + "FROM  ??.?? LIMIT ? , ?";
                parameters = [name_database, name_table, pageNumber, pageLimit];
            }

            connection.query(query, parameters,
                function (error, result, fields) {
                    if (error !== null) {
                        console.log("MySQL find region where name Error: " + error);
                    } else {

                        data = result;
                        //console.log(result);
                        dataLength = result.length;
                        eventEmitter.emit('find_region_where_name');
                    }
                }
            );


            eventEmitter.once('find_region_where_name', (function (_this) {
                return function () {

                    for (i = 0; i < dataLength; i++) {
                        regions[i] = {
                            id: data[i].id,
                            number: (data[i].number.slice(2, 2) == 0) ? parseInt(data[i].number.slice(0, 2), 10) : parseInt(data[i].number, 10),
                            name: data[i].name,
                            socr: data[i].socr,
                            kladr_code: data[i].code,
                            index: data[i].index,
                            gninmb: data[i].gninmb,
                            ocatd: data[i].ocatd
                        }
                    }

                    response = {
                        time: new Date().getTime() - start_time,
                        page: (page == 0) ? 1 : page,
                        regions: regions
                    };

                    res.send(response);
                    _this.stage++;
                    _this.query_controller();
                }
            })(this));
        };

        Region_name.prototype.close_connection = function () {
            //SHOW DATABASES
            connection.end(function () {
                console.log('CLOSE MYSQL CONNECTION');
            });
        };

        return Region_name;

    })(eventEmitter);

    var region_name = new Region_name();
    region_name.query_controller();
});

router.get('/region/number', function (req, res, next) {
    var Region_number, connection,
        __hasProp = {}.hasOwnProperty,
        __extends = function (child, parent) {
            for (var key in parent) {
                if (__hasProp.call(parent, key)) child[key] = parent[key];
            }
            function ctor() {
                this.constructor = child;
            }

            child.__super__ = parent.prototype;
            return child;
        };

    Region_number = (function (_super) {
        __extends(Region_number, _super);

        function Region_number() {
            this.tableMySQL = parameters.DataBase.kladr_api;
            this.API_MySQL_DB_Name = parameters.DataBase.kladr_api.name;

            this.stage = 0;
        }

        Region_number.prototype.query_controller = function () {
            if (this.stage === 0) {
                return this.open_connection();
            } else if (this.stage === 1) {
                return this.find_region_where_number(this.API_MySQL_DB_Name, api_main_tables.regions);
            }

            this.close_connection();
        };

        Region_number.prototype.open_connection = function () {
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
                    eventEmitter.emit('connection');
                }
            });

            eventEmitter.once('connection', (function (_this) {
                return function () {
                    _this.stage++;
                    _this.query_controller();
                }
            })(this));

        };

        Region_number.prototype.find_region_where_number = function (name_database, name_table) {
            var data = [], dataLength, query, parameters, regions = [], response = {}, i;
            var parseNumber = parseInt(req.query.number, 10);
            var number = (parseNumber > 0) ? parseNumber : 0;
            var start_time = new Date().getTime();

            var page = (parseInt(req.query.page, 10) > 0) ? parseInt(req.query.page, 10) : 0;
            var pageNumber = (page > 1) ? ((page - 1) * pageLimit) : 0;

            if (number > 0) {
                query = "SELECT `id`,`number`,`name`,`socr`,`code`,`index`,`gninmb`,`ocatd`" +
                    " FROM  ??.?? WHERE `number` LIKE  ? LIMIT ? , ?";
                parameters = [name_database, name_table, number + '%', pageNumber, pageLimit];
            } else {
                query = "SELECT `id`,`number`,`name`,`socr`,`code`,`index`,`gninmb`,`ocatd`"
                    + "FROM  ??.?? LIMIT ? , ?";
                parameters = [name_database, name_table, pageNumber, pageLimit];
            }

            connection.query(query, parameters,
                function (error, result, fields) {
                    if (error !== null) {
                        console.log("MySQL find region where number Error: " + error);
                    } else {
                        data = result;
                        //console.log(result);
                        dataLength = result.length;
                        eventEmitter.emit('find_region_where_number');
                    }
                }
            );

            eventEmitter.once('find_region_where_number', (function (_this) {
                return function () {

                    for (i = 0; i < dataLength; i++) {
                        regions[i] = {
                            id: data[i].id,
                            number: (data[i].number.slice(2, 2) == 0) ? parseInt(data[i].number.slice(0, 2), 10) : parseInt(data[i].number, 10),
                            name: data[i].name,
                            socr: data[i].socr,
                            kladr_code: data[i].code,
                            index: data[i].index,
                            gninmb: data[i].gninmb,
                            ocatd: data[i].ocatd
                        }
                    }

                    response = {
                        time: new Date().getTime() - start_time,
                        page: (page == 0) ? 1 : page,
                        regions: regions
                    };

                    res.send(response);
                    _this.stage++;
                    _this.query_controller();
                }
            })(this));
        };

        Region_number.prototype.close_connection = function () {
            //SHOW DATABASES
            connection.end(function () {
                console.log('CLOSE MYSQL CONNECTION');
            });
        };

        return Region_number;

    })(eventEmitter);

    var region_number = new Region_number();
    region_number.query_controller();
});

router.get('/region/id', function (req, res, next) {
    var Region_id, connection,
        __hasProp = {}.hasOwnProperty,
        __extends = function (child, parent) {
            for (var key in parent) {
                if (__hasProp.call(parent, key)) child[key] = parent[key];
            }
            function ctor() {
                this.constructor = child;
            }

            child.__super__ = parent.prototype;
            return child;
        };

    Region_id = (function (_super) {
        __extends(Region_id, _super);

        function Region_id() {
            this.tableMySQL = parameters.DataBase.kladr_api;
            this.API_MySQL_DB_Name = parameters.DataBase.kladr_api.name;

            this.stage = 0;
        }

        Region_id.prototype.query_controller = function () {
            if (this.stage === 0) {
                return this.open_connection();
            } else if (this.stage === 1) {
                return this.find_region_where_id(this.API_MySQL_DB_Name, api_main_tables.regions);
            }

            this.close_connection();
        };

        Region_id.prototype.open_connection = function () {
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
                    eventEmitter.emit('connection');
                }
            });

            eventEmitter.once('connection', (function (_this) {
                return function () {
                    _this.stage++;
                    _this.query_controller();
                }
            })(this));

        };

        Region_id.prototype.find_region_where_id = function (name_database, name_table) {
            var data = [], dataLength, query, parameters, regions = [], response = {}, i;
            var parseId = parseInt(req.query.id, 10);
            var id = (parseId > 0) ? parseId : 0;
            var start_time = new Date().getTime();

            var page = (parseInt(req.query.page, 10) > 0) ? parseInt(req.query.page, 10) : 0;
            var pageNumber = (page > 1) ? ((page - 1) * pageLimit) : 0;

            if (id > 0) {
                query = "SELECT `id`,`number`,`name`,`socr`,`code`,`index`,`gninmb`,`ocatd`" +
                    " FROM  ??.?? WHERE `id` = ? LIMIT ? , ?";
                parameters = [name_database, name_table, id, pageNumber, pageLimit];
            } else {
                query = "SELECT `id`,`number`,`name`,`socr`,`code`,`index`,`gninmb`,`ocatd`"
                    + "FROM  ??.?? LIMIT ? , ?";
                parameters = [name_database, name_table, pageNumber, pageLimit];
            }

            connection.query(query, parameters,
                function (error, result, fields) {
                    if (error !== null) {
                        console.log("MySQL find region where number Error: " + error);
                    } else {
                        data = result;
                        //console.log(result);
                        dataLength = result.length;
                        eventEmitter.emit('find_region_where_id');
                    }
                }
            );

            eventEmitter.once('find_region_where_id', (function (_this) {
                return function () {
                    if (id > 0) {
                        response = data[0];
                    } else {
                        for (i = 0; i < dataLength; i++) {
                            regions[i] = {
                                id: data[i].id,
                                number: (data[i].number.slice(2, 2) == 0) ? parseInt(data[i].number.slice(0, 2), 10) : parseInt(data[i].number, 10),
                                name: data[i].name,
                                socr: data[i].socr,
                                kladr_code: data[i].code,
                                index: data[i].index,
                                gninmb: data[i].gninmb,
                                ocatd: data[i].ocatd
                            }
                        }

                        response = {
                            time: new Date().getTime() - start_time,
                            page: (page == 0) ? 1 : page,
                            regions: regions
                        };
                    }

                    res.send(response);
                    _this.stage++;
                    _this.query_controller();
                }
            })(this));
        };

        Region_id.prototype.close_connection = function () {
            //SHOW DATABASES
            connection.end(function () {
                console.log('CLOSE MYSQL CONNECTION');
            });
        };

        return Region_id;

    })(eventEmitter);

    var region_id = new Region_id();
    region_id.query_controller();
});

router.get('/city', function (req, res, next) {
    var City, connection,
        __hasProp = {}.hasOwnProperty,
        __extends = function (child, parent) {
            for (var key in parent) {
                if (__hasProp.call(parent, key)) child[key] = parent[key];
            }
            function ctor() {
                this.constructor = child;
            }

            child.__super__ = parent.prototype;
            return child;
        };

    City = (function (_super) {
        __extends(City, _super);

        function City() {
            this.tableMySQL = parameters.DataBase.kladr_api;
            this.API_MySQL_DB_Name = parameters.DataBase.kladr_api.name;

            this.stage = 0;
        }

        City.prototype.query_controller = function () {
            if (this.stage === 0) {
                return this.open_connection();
            } else if (this.stage === 1) {
                return this.find_all_city(this.API_MySQL_DB_Name, api_main_tables.city);
            }

            this.close_connection();
        };

        City.prototype.open_connection = function () {
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
                    eventEmitter.emit('connection');
                }
            });

            eventEmitter.once('connection', (function (_this) {
                return function () {
                    _this.stage++;
                    _this.query_controller();
                }
            })(this));

        };

        City.prototype.find_all_city = function (name_database, name_table) {
            var data = [], dataLength, query, parameters, cities = [], response = {}, i, region_number = 0;
            var start_time = new Date().getTime();

            var page = (parseInt(req.query.page, 10) > 0) ? parseInt(req.query.page, 10) : 0;
            var pageNumber = (page > 1) ? ((page - 1) * pageLimit) : 0;

            query = "SELECT `dbf_id`,`region_number`,`name`,`socr`,`code`,`index`,`gninmb`,`ocatd`"
                + "FROM  ??.?? LIMIT ? , ?";
            parameters = [name_database, name_table, pageNumber, pageLimit];


            connection.query(query, parameters,
                function (error, result, fields) {
                    if (error !== null) {
                        console.log("MySQL find all city Error: " + error);
                    } else {

                        data = result;
                        //console.log(result);
                        dataLength = result.length;
                        eventEmitter.emit('find_all_city');
                    }
                }
            );


            eventEmitter.once('find_all_city', (function (_this) {
                return function () {

                    for (i = 0; i < dataLength; i++) {
                        console.log(data[i].region_number.toString().slice(2, 3));
                        region_number = (data[i].region_number.toString().slice(2, 3) == 0) ? data[i].region_number.toString().slice(0, 2) : data[i].region_number;
                        cities[i] = {
                            id: data[i].dbf_id,
                            region_number: region_number,
                            name: data[i].name,
                            socr: data[i].socr,
                            kladr_code: data[i].code,
                            index: data[i].index,
                            gninmb: data[i].gninmb,
                            ocatd: data[i].ocatd
                        }
                    }

                    response = {
                        time: new Date().getTime() - start_time,
                        page: (page == 0) ? 1 : page,
                        regions: cities
                    };

                    res.send(response);
                    _this.stage++;
                    _this.query_controller();
                }
            })(this));
        };

        City.prototype.close_connection = function () {
            //SHOW DATABASES
            connection.end(function () {
                console.log('CLOSE MYSQL CONNECTION');
            });
        };

        return City;

    })(eventEmitter);

    var city = new City();
    city.query_controller();
});

router.get('/city/name', function (req, res, next) {
    var City_name, connection,
        __hasProp = {}.hasOwnProperty,
        __extends = function (child, parent) {
            for (var key in parent) {
                if (__hasProp.call(parent, key)) child[key] = parent[key];
            }
            function ctor() {
                this.constructor = child;
            }

            child.__super__ = parent.prototype;
            return child;
        };

    City_name = (function (_super) {
        __extends(City_name, _super);

        function City_name() {
            this.tableMySQL = parameters.DataBase.kladr_api;
            this.API_MySQL_DB_Name = parameters.DataBase.kladr_api.name;

            this.stage = 0;
        }

        City_name.prototype.query_controller = function () {
            if (this.stage === 0) {
                return this.open_connection();
            } else if (this.stage === 1) {
                return this.find_city_where_name(this.API_MySQL_DB_Name, api_main_tables.city);
            }

            this.close_connection();
        };

        City_name.prototype.open_connection = function () {
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
                    eventEmitter.emit('connection');
                }
            });

            eventEmitter.once('connection', (function (_this) {
                return function () {
                    _this.stage++;
                    _this.query_controller();
                }
            })(this));

        };

        City_name.prototype.find_city_where_name = function (name_database, name_table) {
            var data = [], dataLength, cities = [], response = {}, i, sendRegionNumber = 0, sendRegionNumberLength = 0;
            var start_time = new Date().getTime();

            var name = (req.query.name == undefined) ? undefined : req.query.name + '%';
            console.log('name=', name);
            var nameLength = (req.query.name == undefined) ? 0 : req.query.name.length;

            var region_id = ((req.query.region_id !== undefined) && (req.query.region_id !== 0)) ? parseInt(req.query.region_id, 10) : undefined;
            console.log('region_id=', region_id);
            var region_number = ((req.query.region_number !== undefined) && (parseInt(req.query.region_number, 10) !== 0)) ? parseInt(req.query.region_number, 10) * 10 : undefined;
            console.log('region_number=', region_number);

            var page = (parseInt(req.query.page, 10) > 0) ? parseInt(req.query.page, 10) : 0;
            var pageNumber = (page > 1) ? ((page - 1) * pageLimit) : 0;

            var query = '';
            var queryHeader = "SELECT `dbf_id`,`region_id`,`region_number`,`name`,`socr`,`code`,`index`,`gninmb`,`ocatd` FROM  ??.?? WHERE ";
            var queryTail = " LIMIT ? , ?";
            var parameters = [];
            var parametersHeader = [name_database, name_table];
            var parametersTail = [pageNumber, pageLimit];

            query += queryHeader;
            parameters = parameters.concat(parametersHeader);
            if ((region_id !== undefined) && (region_number === undefined) && (name === undefined)) {
                query += " `region_id` = ? ";
                parameters = parameters.concat([region_id]);
            } else if (region_id !== undefined) {
                query += " `region_id` =  ? ";
                parameters = parameters.concat([region_id]);
            }

            if ((region_id === undefined) && (region_number !== undefined)) {
                query += " `region_number` = ?";
                parameters = parameters.concat([region_number]);
            }else if ((region_id === undefined) && (region_number !== undefined)) {
                query += "AND `region_number` = ? ";
                parameters = parameters.concat([region_number]);
            }

            if ((region_id !== undefined) && (region_number === undefined) && (name !== undefined)) {
                query += " `name` LIKE ? ";
                parameters = parameters.concat([name]);
            } else if (name !== undefined) {
                query += " AND `name` LIKE ? ";
                parameters = parameters.concat([name]);
            }

            if ((region_id === undefined) && (region_number === undefined) && (name === undefined)) {
                query = "SELECT `dbf_id`,`region_id`,`region_number`,`name`,`socr`,`code`,`index`,`gninmb`,`ocatd`"
                    + "FROM  ??.?? ";
            }
            query += queryTail;
            parameters = parameters.concat(parametersTail);

            console.log(query);
            console.log(parameters);

            connection.query(query, parameters,
                function (error, result, fields) {
                    if (error !== null) {
                        console.log("MySQL find region where name Error: " + error);
                    } else {

                        data = result;
                        //console.log(result);
                        dataLength = result.length;
                        eventEmitter.emit('find_city_where_name');
                    }
                }
            );

            eventEmitter.once('find_city_where_name', (function (_this) {
                return function () {

                    for (i = 0; i < dataLength; i++) {
                        sendRegionNumberLength = data[i].region_number.toString().length;
                        sendRegionNumber = (data[i].region_number.toString().slice(sendRegionNumberLength - 1, sendRegionNumberLength) == 0) ? data[i].region_number.toString().slice(0, sendRegionNumberLength - 1) : data[i].region_number;

                        cities[i] = {
                            id: data[i].dbf_id,
                            region_id: data[i].region_id,
                            region_number: sendRegionNumber,
                            name: data[i].name,
                            socr: data[i].socr,
                            kladr_code: data[i].code,
                            index: data[i].index,
                            gninmb: data[i].gninmb,
                            ocatd: data[i].ocatd
                        }
                    }

                    response = {
                        time: new Date().getTime() - start_time,
                        page: (page == 0) ? 1 : page,
                        cities: cities
                    };

                    res.send(response);
                    _this.stage++;
                    _this.query_controller();
                }
            })(this));
        };

        City_name.prototype.close_connection = function () {
            //SHOW DATABASES
            connection.end(function () {
                console.log('CLOSE MYSQL CONNECTION');
            });
        };

        return City_name;

    })(eventEmitter);

    var city_name = new City_name();
    city_name.query_controller();
});

router.get('/city/id', function (req, res, next) {
    var City_id, connection,
        __hasProp = {}.hasOwnProperty,
        __extends = function (child, parent) {
            for (var key in parent) {
                if (__hasProp.call(parent, key)) child[key] = parent[key];
            }
            function ctor() {
                this.constructor = child;
            }

            child.__super__ = parent.prototype;
            return child;
        };

    City_id = (function (_super) {
        __extends(City_id, _super);

        function City_id() {
            this.tableMySQL = parameters.DataBase.kladr_api;
            this.API_MySQL_DB_Name = parameters.DataBase.kladr_api.name;

            this.stage = 0;
        }

        City_id.prototype.query_controller = function () {
            if (this.stage === 0) {
                return this.open_connection();
            } else if (this.stage === 1) {
                return this.find_city_where_id(this.API_MySQL_DB_Name, api_main_tables.city);
            }

            this.close_connection();
        };

        City_id.prototype.open_connection = function () {
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
                    eventEmitter.emit('connection');
                }
            });

            eventEmitter.once('connection', (function (_this) {
                return function () {
                    _this.stage++;
                    _this.query_controller();
                }
            })(this));

        };

        City_id.prototype.find_city_where_id = function (name_database, name_table) {
            var data = [], dataLength, query, parameters, cities = [], response = {}, i;
            var sendRegionNumber = 0, sendRegionNumberLength = 0 ;
            var parseId = parseInt(req.query.id, 10);
            var id = (parseId > 0) ? parseId : 0;
            var start_time = new Date().getTime();

            var page = (parseInt(req.query.page, 10) > 0) ? parseInt(req.query.page, 10) : 0;
            var pageNumber = (page > 1) ? ((page - 1) * pageLimit) : 0;

            if (id > 0) {
                query = "SELECT `dbf_id`,`region_number`,`name`,`socr`,`code`,`index`,`gninmb`,`ocatd`" +
                    " FROM  ??.?? WHERE `dbf_id` = ? LIMIT ? , ?";
                parameters = [name_database, name_table, id, pageNumber, pageLimit];
            } else {
                query = "SELECT `dbf_id`,`region_number`,`name`,`socr`,`code`,`index`,`gninmb`,`ocatd`"
                    + "FROM  ??.?? LIMIT ? , ?";
                parameters = [name_database, name_table, pageNumber, pageLimit];
            }

            connection.query(query, parameters,
                function (error, result, fields) {
                    if (error !== null) {
                        console.log("MySQL find city where id Error: " + error);
                    } else {
                        data = result;
                        //console.log(result);
                        dataLength = result.length;
                        eventEmitter.emit('find_city_where_id');
                    }
                }
            );

            eventEmitter.once('find_city_where_id', (function (_this) {
                return function () {
                    if (id > 0) {
                        response = data[0];
                    } else {
                        for (i = 0; i < dataLength; i++) {
                            sendRegionNumberLength = data[i].region_number.toString().length;
                            sendRegionNumber = (data[i].region_number.toString().slice(sendRegionNumberLength - 1, sendRegionNumberLength) == 0) ? data[i].region_number.toString().slice(0, sendRegionNumberLength - 1) : data[i].region_number;
                            cities[i] = {
                                id: data[i].dbf_id,
                                region_number: sendRegionNumber,
                                name: data[i].name,
                                socr: data[i].socr,
                                kladr_code: data[i].code,
                                index: data[i].index,
                                gninmb: data[i].gninmb,
                                ocatd: data[i].ocatd
                            }
                        }

                        response = {
                            time: new Date().getTime() - start_time,
                            page: (page == 0) ? 1 : page,
                            cities: cities
                        };
                    }

                    res.send(response);
                    _this.stage++;
                    _this.query_controller();
                }
            })(this));
        };

        City_id.prototype.close_connection = function () {
            //SHOW DATABASES
            connection.end(function () {
                console.log('CLOSE MYSQL CONNECTION');
            });
        };

        return City_id;

    })(eventEmitter);

    var city_id = new City_id();
    city_id.query_controller();
});

module.exports = router;
