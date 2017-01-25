
/**
 * Module dependencies.
 */

var integration = require('segmentio-integration');
var mapper = require('./mapper');
var encode = require('urlencode');

/**
 * Expose `Amplitude`
 */

var Amplitude = module.exports = integration('Amplitude')
  .endpoint('https://api.amplitude.com')
  .channels(['server', 'mobile'])
  .ensure('settings.apiKey')
  .mapper(mapper)
  .retries(2);

/**
 * Set up our prototype methods
 */

Amplitude.prototype.page = track;
Amplitude.prototype.screen = track;
Amplitude.prototype.track = track;
Amplitude.prototype.identify = identify;
Amplitude.prototype.group = group;

/**
 * Track an event, screen, or page call.
 *
 * @param {Facade} facade
 * @param {Object} settings
 * @param {Function} fn
 */

function track(payload, fn){
  var self = this;
  return this
    .post('/httpapi')
    .send('api_key=' + this.settings.apiKey)
    .send('event=' + encode(JSON.stringify(payload)))
    .end(this.handle(function(err, res){
      if (err) return fn(err, res);
      if ('invalid api_key' == res.text) return fn(self.error('invalid api_key'));
      fn(null, res);
    }));
}

/**
 * Send an identify call.
 *
 * @param {Facade} facade
 * @param {Object} settings
 * @param {Function} fn
 */

function identify(payload, fn) {
  var self = this;
  return this
    .post('/identify')
    .send('api_key=' + this.settings.apiKey)
    .send('identification=' + encode(JSON.stringify(payload)))
    .end(this.handle(function(err, res){
      if (err) return fn(err, res);
      if ('invalid api_key' == res.text) return fn(self.error('invalid api_key'));
      fn(null, res);
    }));
}

/**
 * Set groups via an identify call.
 *
 * @param {Facade} facade
 * @param {Object} settings
 * @param {Function} fn
 */

 function group(payload, fn) {
  var self = this;
  return this
    .post('/identify')
    .send('api_key=' + this.settings.apiKey)
    .send('identification=' + encode(JSON.stringify(payload)))
    .end(this.handle(function(err, res){
      if (err) return fn(err, res);
      if ('invalid api_key' == res.text) return fn(self.error('invalid api_key'));
      fn(null, res);
    }));
}
