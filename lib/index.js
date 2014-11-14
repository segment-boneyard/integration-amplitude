
/**
 * Module dependencies.
 */

var integration = require('segmentio-integration');
var mapper = require('./mapper');

/**
 * Expose `Amplitude`
 */

var Amplitude = module.exports = integration('Amplitude')
  .endpoint('https://api.amplitude.com/httpapi')
  .channels(['server', 'mobile'])
  .ensure('settings.apiKey')
  .mapper(mapper)
  .retries(2);

/**
 * Set up our prototype methods
 */

Amplitude.prototype.page = send;
Amplitude.prototype.screen = send;
Amplitude.prototype.track = send;

/**
 * Track an event, screen, or page call.
 *
 * @param {Facade} facade
 * @param {Object} settings
 * @param {Function} fn
 */

function send(payload, fn){
  var self = this;
  return this
    .get()
    .type('json')
    .query({ api_key: this.settings.apiKey })
    .query({ event: JSON.stringify(payload) })
    .end(this.handle(function(err, res){
      if (err) return fn(err, res);
      if ('invalid api_key' == res.text) return fn(self.error('invalid api_key'));
      fn(null, res);
    }));
}
