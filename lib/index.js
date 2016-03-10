
/**
 * Module dependencies.
 */

var integration = require('segmentio-integration');
var mapper = require('./mapper');

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
    .get('/httpapi')
    .type('json')
    .query({ api_key: this.settings.apiKey })
    .query({ event: JSON.stringify(payload) })
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
    .get('/identify')
    .type('json')
    .query({ api_key: this.settings.apiKey })
    .query({ identification: JSON.stringify(payload) })
    .end(this.handle(function(err, res){
      if (err) return fn(err, res);
      if ('invalid api_key' == res.text) return fn(self.error('invalid api_key'));
      fn(null, res);
    }));
}
