var express = require('express');
var router = express.Router();


router.get('/', function(req, res, next) {
  res.render('api', { title: 'Express' });
  //res.send('Привет тут будет API для сервиса КЛАДР');
});

module.exports = router;
