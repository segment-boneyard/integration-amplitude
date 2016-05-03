
/**
 * Module dependencies.
 */

var parse = require('locale-string').parse;
var title = require('to-title-case');
var reject = require('reject');
var find = require('obj-case');
var del = find.del;

/**
 * Map `track`.
 *
 * @param {Track} track
 * @return {Object}
 * @api private
 */

exports.track = function(track){
  var payload = common(track);
  payload.revenue = track.revenue();
  payload.event_type = track.event();
  payload.event_properties = properties(track.properties());
  return payload;
};

/**
 * Map `page`.
 *
 * @param {Page} page
 * @return {Object}
 * @api private
 */

exports.page = function(page){
  var payload = common(page);
  payload.event_type = page.event(page.fullName());
  payload.event_properties = properties(page.properties());
  return payload;
};

/**
 * Map `screen`.
 *
 * @param {Screen} screen
 * @return {Object}
 * @api private
 */

exports.screen = function(screen){
  var payload = common(screen);
  payload.event_type = screen.event(screen.fullName());
  payload.event_properties = properties(screen.properties());
  return payload;
};

/**
 * Map `identify`.
 *
 * @param {Identify} identify
 * @return {Object} payload
 */

exports.identify = function(identify){
  var payload = common(identify);
  del(payload, 'amplitude_event_type');
  del(payload, 'session_id');
  del(payload, 'event_id');
  payload.paying = find(identify.options('Amplitude'), 'paying');
  payload.start_version = find(identify.options('Amplitude'), 'start_version');
  return payload;
};

function deviceId(facade) {
  var version = facade.proxy('context.library.version');
  var name = facade.proxy('context.library.name');

  if (name === 'analytics-android' && version  === '1.4.4') {
    return facade.userId() + ":" + facade.proxy('context.device.model') + ":" + facade.proxy('context.device.id');
  }

  return facade.proxy('context.device.id') || facade.anonymousId();
}

/**
 * Format the amplitude specific properties.
 *
 * @param {Track} facade
 * @return {Object}
 */

function common(facade){
  var options = facade.options('Amplitude');
  var os = facade.proxy('context.os.name');
  var ret = {
    user_id: facade.userId(),
    device_id: deviceId(facade),
    time: facade.timestamp().getTime(),
    library: 'segment',
    app_version: facade.proxy('context.app.version'),
    os_name: os,
    os_version: facade.proxy('context.os.version'),
    carrier: facade.proxy('context.network.carrier'),
    device_model: facade.proxy('context.device.model'),
    device_brand: facade.proxy('context.device.brand'),
    device_manufacturer: facade.proxy('context.device.manufacturer'),
    location_lat: facade.proxy('context.location.latitude'),
    location_lng: facade.proxy('context.location.longitude'),
    ip: facade.ip(),
    amplitude_event_type: find(options, 'event_type'),
    session_id: find(options, 'session_id'),
    event_id: find(options, 'event_id')
  };

  var loc = locale(facade);
  if (loc) {
    ret.language = loc.language;
    ret.country = loc.country;
  }

  if (facade.country()) ret.country = facade.country();
  if (facade.city()) ret.city = facade.city();
  if (facade.region()) ret.region = facade.region();

  if (os && os.toString().toLowerCase() == 'ios') {
      ret.idfa = facade.proxy('device.idfa');
  } else if (os && os.toString().toLowerCase() == 'android') {
      //Older segment clients sent idfa, newer ones send advertisingId
      ret.adid = facade.proxy('device.idfa');
      if (!ret.adid) {
        ret.adid = facade.proxy('device.advertisingId');
      }
  }

  var lib = facade.proxy('context.library.name');
  var platform = platformFromLibrary(lib) || facade.proxy('context.device.type') || (os && os.toLowerCase()) || lib;
  if (platform) ret.platform = sanitizePlatform(platform);

  ret.user_properties = traits(facade.traits());

  return reject(ret);
}

/**
 * Maps known Segment libraries to platforms
 *
 * @param {String} library
 * @return {String} platform
 */
function platformFromLibrary(library){
  if (library) {
    library = library.toString().toLowerCase();
    if (library == 'analytics.js') return 'Web';
    if (library == 'analytics-android') return 'Android';
    if (library == 'analytics-ios') return 'iOS';
  }
  return null;
}

/**
 * Sanitizies platform values to match Amplitude's format
 *
 * @param {String} platform
 * @return {String} formatted platform value
 */
 function sanitizePlatform(platform){
  if (platform) {
    platform = platform.toString().toLowerCase();
    if (platform == 'web') return 'Web';
    if (platform == 'android') return 'Android';
    if (platform == 'ios') return 'iOS';
  }
  return platform;
 }

/**
 * Gets the locale object info from the facade
 *
 * @param {Facade} facade
 * @return {Object}
 *   - {String} country
 *   - {String} language
 */

function locale(facade){
  var locale = facade.proxy('context.locale');
  if (!locale) return;
  return parse(locale);
}

/**
 * Remove amplitude specific properties from facade properties.
 *
 * @param {Object} properties
 * @return {Object}
 */

function properties(properties){
  del(properties, 'country');
  del(properties, 'language');
  del(properties, 'revenue');
  del(properties, 'event_id');
  del(properties, 'amplitude_event_type');
  return properties;
}

/**
 * Remove address traits from user_properties
 *
 * @param {Object} traits
 * @return {Object}
 */

function traits(traits){
  del(traits, 'address');
  return traits;
}

/**
 * Map `group`.
 *
 * @param {Group} group
 * @return {Object} payload
 */

exports.group = function(group){
  var groupId = group.groupId();
  if (!groupId) return;
  var payload = {
    user_id: group.userId(),
    device_id: deviceId(group),
    time: group.timestamp().getTime(),
    groups: {
      '[Segment] Group': groupId
    },
    user_properties: {
      '[Segment] Group': groupId
    }
  }
  return payload;
};
