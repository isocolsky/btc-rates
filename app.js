'use strict';

var _ = require('lodash');
var async = require('async');
var log = require('npmlog');
var Rates = require('./lib/rates');
var express = require('express');

log.debug = log.verbose;
log.level = 'info';

var rates = new Rates();

setInterval(function() {
  console.log('Fetching rates');
  rates.fetch();
}, 60 * 1000);


var app = express();
var port = process.env.RATES_PORT || 3001;
var router = express.Router();

router.get('/rate/:code', function(req, res) {
  var source = req.param('source') || 'BitPay';
  var ts = req.param('ts');
  rates.getRate(source, req.params.code, ts, function(err, rate) {
    if (err) returnError({
      code: 500,
      message: err,
    });
    res.json({
      rate: rate,
    });
  });
});

function returnError(error, res) {
  res.status(error.code).json({
    error: error.message,
  }).end();
};

app.use('/api/v1', router);

app.listen(port);
console.log('Rates service running on port ' + port);
