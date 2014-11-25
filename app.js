'use strict';

var _ = require('lodash');
var async = require('async');
var log = require('npmlog');
var Rates = require('./lib/rates');

log.debug = log.verbose;
log.level = 'info';


var rates = new Rates();

rates.getRate('BitPay', 'USD', 1416923589, function(err, res) {
  console.log('Result', res);
});
rates.getRate('BitPay', 'USD', 1316923588, function(err, res) {
  console.log('Result', res);
});
