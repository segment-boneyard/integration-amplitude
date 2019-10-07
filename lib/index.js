/**
 * Module dependencies.
 */

const integration = require('segmentio-integration');
const some = require('lodash.some');
const encode = require('urlencode');

const mapper = require('./mapper');

const API_V2_ENDPOINT = '2/httpapi';
const IDENTIFY_ENDPOINT = 'identify';

/**
 * Create `Amplitude`
 */

const Amplitude = integration('Amplitude')
  .endpoint('https://api.amplitude.com/')
  .channels(['server', 'mobile'])
  .ensure('settings.apiKey')
  .mapper(mapper)
  .retries(2);

/**
 * Send an event
 *
 * @param {Object} payload
 * @param {Function} fn
 */
function send(endpoint, payload, fn) {
  const key = endpoint === API_V2_ENDPOINT ? 'events' : 'identification';
  const req = this.post(endpoint);

  if (endpoint === API_V2_ENDPOINT) {
    req.send({
      api_key: this.settings.apiKey,
      [key]: payload,
    });
  } else {
    req.send(`api_key=${this.settings.apiKey}`)
      .send(`${key}=${encode(JSON.stringify(payload))}`);
  }

  req.set('Content-type', 'application/json');

  return req.end(this.handle((err, res) => {
    if (err) {
      fn(err, res);
      return;
    }
    if (res.text === 'invalid api_key') {
      fn(this.error('invalid api_key'));
      return;
    }
    fn(null, res);
  }));
}

/**
 * Track an event, screen, or page call.
 *
 * @param {Object} payload
 * @param {Function} fn
 */
function track(payloads, fn) {
  this.send(API_V2_ENDPOINT, payloads, fn);
}

/**
 * Track a screen or page call.
 *
 * @param {Object} payload
 * @param {Function} fn
 */
function page(payload, fn) {
  // Amplitude is generally not used for page tracking so we offer options to
  // filter out irrelevant page calls.
  //
  // If track all pages is enabled, let the page call through.
  // If trackCategorizedPages or trackNamedPages (or both) is enabled, check to
  // be sure the event has the necessary category or name properties and send it
  // through if it does; otherwise, drop the event
  const shouldTrack = this.settings.trackAllPages || some([
    this.settings.trackCategorizedPages && payload.event_properties.category,
    this.settings.trackNamedPages && payload.event_properties.name,
  ]);

  if (!shouldTrack) {
    fn();
    return;
  }

  this.send(API_V2_ENDPOINT, [payload], fn);
}

/**
 * Send an identify call.
 *
 * @param {Object} payload
 * @param {Function} fn
 */
function identify(payload, fn) {
  this.send(IDENTIFY_ENDPOINT, payload, fn);
}

/**
 * Set groups via an identify call.
 *
 * @param {Object} payload
 * @param {Function} fn
 */
function group(payload, fn) {
  this.send(IDENTIFY_ENDPOINT, payload, fn);
}

/**
 * Set up our prototype methods
 */

Amplitude.prototype.page = page;
Amplitude.prototype.screen = page;
Amplitude.prototype.track = track;
Amplitude.prototype.identify = identify;
Amplitude.prototype.group = group;
Amplitude.prototype.send = send;

module.exports = Amplitude;
