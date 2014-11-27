'use strict';

var _ = require('lodash');
var async = require('async');
var log = require('npmlog');
var Rates = require('./lib/rates');
var express = require('express');

log.debug = log.verbose;
log.level = 'info';

var rates = new Rates();


function startCronJob(minutes) {
  setInterval(function() {
    log.debug('Fetching rates');
    rates.fetch();
  }, minutes * 60 * 1000);
};

function returnError(error, res) {
  res.status(error.code).json({
    error: error.message,
  }).end();
};

var app = express();
app.use(function(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,Content-Type,Authorization');
  next();
});
var allowCORS = function(req, res, next) {
  if ('OPTIONS' == req.method) {
    res.send(200);
    res.end();
    return;
  }
  next();
}
app.use(allowCORS);

var port = process.env.RATES_PORT || 3001;
var router = express.Router();

router.get('/rates/:code', function(req, res) {
  var source = req.param('source') || 'BitPay';
  var ts = req.param('ts');
  if (_.isString(ts) && ts.indexOf(',') !== -1) {
    ts = ts.split(',');
  }
  rates.getRate(source, req.params.code, ts, function(err, result) {
    if (err) returnError({
      code: 500,
      message: err,
    });
    res.json(result);
  });
});

app.use('/api/v1', router);

startCronJob(1);
app.listen(port);
console.log('Rates service running on port ' + port);
