
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
    device_id: facade.proxy('context.device.id') || facade.anonymousId(),
    time: facade.timestamp().getTime(),
    app_version: facade.proxy('context.app.version'),
    platform: facade.proxy('context.library.name'),
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

  if (os && os.toLowerCase() == 'ios') {
      ret.idfa = facade.proxy('device.idfa');
  } else if (os && os.toLowerCase() == 'android') {
      //Older segment clients sent idfa, newer ones send advertisingId
      ret.adid = facade.proxy('device.idfa');
      if(!ret.adid) {
        ret.adid = facade.proxy('device.advertisingId');
      }
  }

  ret.user_properties = traits(facade.traits());

  return reject(ret);
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
