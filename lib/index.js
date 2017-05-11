
/**
 * Module dependencies.
 */

var integration = require('segmentio-integration');
var mapper = require('./mapper');
var some = require('lodash.some');
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

Amplitude.prototype.page = page;
Amplitude.prototype.screen = page;
Amplitude.prototype.track = track;
Amplitude.prototype.identify = identify;
Amplitude.prototype.group = group;

/**
 * Track an event, screen, or page call.
 *
 * @param {Object} payload
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
 * Track a screen or page call.
 *
 * @param {Object} payload
 * @param {Function} fn
 */
function page(payload, fn){
  // Amplitude is generally not used for page tracking so we offer options to
  // filter out irrelevant page calls.
  //
  // If track all pages is enabled, let the page call through.
  // If trackCategorizedPages or trackNamedPages (or both) is enabled, check to
  // be sure the event has the necessary category or name properties and send it
  // through if it does; otherwise, drop the event
  var shouldTrack = this.settings.trackAllPages || some([
    this.settings.trackCategorizedPages && payload.event_properties.category,
    this.settings.trackNamedPages && payload.event_properties.name
  ]);

  if (!shouldTrack) {
    return fn();
  }

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
 * @param {Object} payload
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
 * @param {Object} payload
 * @param {Function} fn
 */

 // TODO: Ensure there is a userId here. Segment API does not require one, Amplitude does.
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
