'use strict';

var request = require('request');
var levelup = require('levelup');
var _ = require('lodash');
var preconditions = require('preconditions').singleton();
var async = require('async');
var log = require('npmlog');
log.debug = log.verbose;

function Rates(opts) {
  this.initialized = false;

  this._init(opts);
};

function _getCurrentTs() {
  return Math.floor(new Date() / 1000);
};

function _getKey(sourceId, code, ts) {
  var key = sourceId + '-' + code.toUpperCase();
  if (ts) {
    key += '-' + ts;
  }
  return key;
};

Rates.prototype._init = function(opts) {
  var self = this;

  opts = opts || {};

  self.db = opts.db || levelup(opts.dbPath || './db/rates.db');
  if (_.isArray(opts.sources)) {
    self.sources = opts.sources;
  } else {
    self.sources = [
      require('./sources/bitpay'),
      require('./sources/bitstamp'),
    ];
  }
  if (opts.request) {
    self.request = opts.request;
  }

  self.initialized = true;
};

Rates.prototype._retrieve = function(source, cb) {
  var self = this;

  log.debug('Fetching data for ' + source.id);
  self.request.get({
    url: source.url,
    json: true
  }, function(err, res, body) {
    if (err || !body) {
      log.warn('Error fetching data for ' + source.id, err);
      return cb(err);
    }

    log.debug('Data for ' + source.id + ' fetched successfully');

    if (!source.parseFn) return cb('No parse function for source ' + source.id);
    var rates = source.parseFn(body);

    return cb(null, rates);
  });
};

Rates.prototype._store = function(source, rates, cb) {
  var self = this;

  log.debug('Storing data for ' + source.id);
  var ts = _getCurrentTs();
  var ops = _.map(rates, function(r) {
    return {
      type: 'put',
      key: _getKey(source.id, r.code, ts),
      value: r.rate,
    };
  });

  self.db.batch(ops, function(err) {
    if (err) {
      log.warn('Error storing data for ' + source.id, err);
      return cb(err);
    }
    log.debug('Data for ' + source.id + ' stored successfully');
    return cb();
  });
};

Rates.prototype.fetch = function(cb) {
  var self = this;

  preconditions.shouldNotBeFalsey(self.initialized);
  preconditions.shouldBeFunction(cb);

  async.each(self.sources, function(source, cb) {
    self._retrieve(source, function(err, res) {
      if (err) return cb();
      self._store(source, res, function(err, res) {
        return cb();
      });
    });
  }, function(err) {
    return cb(err);
  });
};

Rates.prototype.getRate = function(sourceId, code, ts, cb) {
  var self = this;

  preconditions.shouldNotBeFalsey(self.initialized);
  preconditions.shouldBeFunction(cb);

  ts = ts || _getCurrentTs();
  var result;

  self.db.createValueStream({
    lte: _getKey(sourceId, code, ts),
    gte: _getKey(sourceId, code) + '!',
    reverse: true,
    limit: 1,
  })
    .on('data', function(data) {
      var num = parseFloat(data);
      result = _.isNumber(num) && !_.isNaN(num) ? num : undefined;
    })
    .on('error', function(err) {
      return cb(err);
    })
    .on('end', function() {
      return cb(null, result);
    });
};

module.exports = Rates;
