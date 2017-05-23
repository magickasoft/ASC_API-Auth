'use strict';

// local paths
var SRC_PATH = __dirname + '/../';

var fs = require('fs');
var async = require('async');

var mongoose = require('mongoose');

var seeder = require('mongoose-seeder');
var data = require('./data.json');
var config = require('../config/config');

var path = require('path');

async.series(
  [function(next) {
    console.log('Connecting to database');

    mongoose.connect('mongodb://' + config.MONGODB_HOST + '/' + config.MONGODB_NAME, {
      autoReconnect: false
    }, function(err) {
      if (err) {
        console.error('connect error:', err);
        process.exit(1); // a connection error is fatal, so exit
      }
      mongoose.connection.on('open', next);
    });
  }, function(next) {
    console.log('Bootstrap models');
    // Bootstrap mongodb models

    async.eachSeries(fs.readdirSync(path.join(SRC_PATH, '/models')), function iterator(file, cb) {
      var f = path.basename(file, '.js');
      if (f !== file && f !== 'index') {
        var collection = require(path.join(SRC_PATH, '/models', file))(config);
        console.log('\t', f);
        return collection.then(cb).catch(cb);
      }
      cb();
    }, next);

  }, function(next) {
    console.log('Bootstrap data');
    // Loading models initial data
    seeder.seed(data, {
      dropDatabase: false // if true, this drops the database!
    }, next);
  }],
  function(error) {
    if (error) {
      console.error(error);
    }
    console.log('Done');
    mongoose.disconnect(function(err) {
      if (err) {
        throw err;
      }
      console.log('disconnected');
    });
  }
);
