
/**
 * Module dependencies.
 */

var del = require('obj-case').del;
var find = require('obj-case');
var parse = require('locale-string').parse;
var reject = require('reject');
var title = require('to-title-case');
var UAParser = require('ua-parser-js');
var isEmpty = require('lodash/isEmpty');
var values = require('lodash/values');
var keys = require('lodash/keys');
var extend = require('extend');

/**
 * Map `track`.
 *
 * @param {Track} track
 * @param {Object} settings
 * @return {Object}
 * @api private
 */

exports.track = function(track, settings){
  var payload = common(track, settings);
  var revenue = track.revenue();
  payload.revenue = revenue;

  // only track revenue properties if logging revenue
  if (revenue) {
    // only set price and quantity if both exist
    var price = track.price();
    var quantity = track.quantity();
    if (price && quantity) {
      payload.price = price;
      payload.quantity = quantity;
    }

    // additional revenue fields
    var revenueType = track.proxy('properties.revenueType');
    if (revenueType) {
      payload.revenueType = revenueType;
    }
    var productId = track.proxy('properties.productId');
    if (productId) {
      payload.productId = productId;
    }
  }

  payload.event_type = track.event();
  payload.event_properties = extend(payload.event_properties, properties(track.properties(), revenue));
  return payload;
};

/**
 * Map `page`.
 *
 * @param {Page} page
 * @param {Object} settings
 * @return {Object}
 * @api private
 */

exports.page = function(page, settings){
  var payload = common(page, settings);
  payload.event_type = page.event(page.fullName());
  payload.event_properties = extend(payload.event_properties, properties(page.properties()));
  return payload;
};

/**
 * Map `screen`.
 *
 * @param {Screen} screen
 * @param {Object} settings
 * @return {Object}
 * @api private
 */

exports.screen = function(screen, settings){
  var payload = common(screen, settings);
  payload.event_type = screen.event(screen.fullName());
  payload.event_properties = extend(payload.event_properties, properties(screen.properties()));
  return payload;
};

/**
 * Map `identify`.
 *
 * @param {Identify} identify
 * @param {Object} settings
 * @return {Object} payload
 */

exports.identify = function(identify, settings){
  var payload = common(identify, settings);
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
 * @param {Object} settings
 * @return {Object}
 */

function common(facade, settings){
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

//Older segment clients sent idfa, newer ones send advertisingId
  var advertisingId = facade.proxy('device.advertisingId') || facade.proxy('device.idfa');

  if (os && os.toString().toLowerCase() == 'ios') ret.idfa = advertisingId;
  if (os && os.toString().toLowerCase() == 'android') ret.adid = advertisingId;


  var lib = facade.proxy('context.library.name');
  var platform = platformFromLibrary(lib) || facade.proxy('context.device.type') || (os && os.toLowerCase()) || lib;
  if (platform) ret.platform = sanitizePlatform(platform);

  // Unbundled integration support
  if ((lib || '').toString().toLowerCase() === 'analytics.js') {
    // Parse out browser info to match information provided by `amplitude.js`
    var userAgent = facade.userAgent();
    if (userAgent) {
      var parsedUserAgent = (new UAParser(userAgent)).getResult();
      ret.os_name = parsedUserAgent.browser.name;
      ret.os_version = parsedUserAgent.browser.major;
      ret.device_model = parsedUserAgent.os.name;
    }
  }

  ret.user_properties = traits(facade.traits());

  // map query params from context url if opted in
  var mapQueryParams = settings.mapQueryParams || {};
  if (!isEmpty(mapQueryParams)) {
    // since we accept any arbitrary property name and we dont have conditional UI components
    // in the app so excuse the jank
    var property = keys(mapQueryParams)[0];
    // add query params to either `user_properties` or `event_properties`
    // aliased under arbitrary custom prop provided in settings
    var type = values(mapQueryParams)[0] || 'user_properties';
    // `.identify()` calls can't set event_properties
    var query = facade.proxy('context.page.search');
    if (facade.type() === 'identify') {
      ret.user_properties[property] = query;
    } else {
      ret.event_properties = {};
      ret.event_properties[property] = query;
    }
  }

  // Add groups.
  var groups = options.groups;
  if (groups) {
    ret.groups = groups;
    extend(ret.user_properties, groups);
  }

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

function properties(properties, hasRevenue){
  del(properties, 'country');
  del(properties, 'language');
  del(properties, 'event_id');
  del(properties, 'amplitude_event_type');

  // only delete revenue properties if there is revenue
  if (hasRevenue) {
    del(properties, 'price');
    del(properties, 'quantity');
    del(properties, 'productId');
    del(properties, 'revenueType');
  }
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
