/**
 * Module dependencies.
 */

const find = require('obj-case');
const { parse } = require('locale-string');
const reject = require('reject');
const UAParser = require('ua-parser-js');
const isEmpty = require('lodash/isEmpty');
const keys = require('lodash/keys');

const { del } = find;

function deviceId(facade) {
  const version = facade.proxy('context.library.version');
  const name = facade.proxy('context.library.name');

  if (name === 'analytics-android' && version === '1.4.4') {
    return `${facade.userId()}:${facade.proxy('context.device.model')}:${facade.proxy('context.device.id')}`;
  }

  return facade.proxy('context.device.id') || facade.anonymousId();
}

/**
 * Sanitizies platform values to match Amplitude's format
 *
 * @param {String} platform
 * @return {String} formatted platform value
 */
function sanitizePlatform(platform) {
  if (platform) {
    const normalizedPlatform = platform.toString().toLowerCase();
    if (normalizedPlatform === 'web') return 'Web';
    if (normalizedPlatform === 'android') return 'Android';
    if (normalizedPlatform === 'ios') return 'iOS';
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

function locale(facade) {
  const loc = facade.proxy('context.locale');
  if (!loc) return false;
  return parse(loc);
}

/**
 * Maps known Metarouter libraries to platforms
 *
 * @param {String} library
 * @return {String} platform
 */
function platformFromLibrary(library) {
  if (library) {
    const normalizedLibrary = library.toString().toLowerCase();
    if (normalizedLibrary === 'analytics.js') return 'Web';
    if (normalizedLibrary === 'analytics-android') return 'Android';
    if (normalizedLibrary === 'analytics-ios') return 'iOS';
  }
  return null;
}

/**
 * Remove amplitude specific properties from facade properties.
 *
 * @param {Object} properties
 * @return {Object}
 */

function properties(props, hasRevenue) {
  del(props, 'country');
  del(props, 'language');
  del(props, 'event_id');
  del(props, 'amplitude_event_type');

  // only delete revenue properties if there is revenue
  if (hasRevenue) {
    del(props, 'price');
    del(props, 'quantity');
    del(props, 'productId');
    del(props, 'revenueType');
  }
  return props;
}

/**
 * Map `group`.
 *
 * @param {Group} group
 * @return {Object} payload
 */

exports.group = (group) => {
  const groupId = group.groupId();
  if (!groupId) return null;
  const payload = {
    user_id: group.userId(),
    device_id: deviceId(group),
    time: group.timestamp().getTime(),
    groups: {
      '[Metarouter] Group': groupId,
    },
    user_properties: {
      '[Metarouter] Group': groupId,
    },
  };
  return payload;
};

/**
 * Remove address traits from user_properties
 *
 * @param {Object} traits
 * @return {Object}
 */

function traits(tts) {
  del(tts, 'address');
  return tts;
}

/**
 * Format the amplitude specific properties.
 *
 * @param {Track} facade
 * @param {Object} settings
 * @return {Object}
 */

function common(facade, settings) {
  const options = facade.options('Amplitude');
  const os = facade.proxy('context.os.name');
  const ret = {
    user_id: facade.userId(),
    device_id: deviceId(facade),
    time: facade.timestamp().getTime(),
    library: 'metarouter',
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
    event_id: find(options, 'event_id'),
  };

  const loc = locale(facade);
  if (loc) {
    ret.language = loc.language;
    ret.country = loc.country;
  }

  if (facade.country()) ret.country = facade.country();
  if (facade.city()) ret.city = facade.city();
  if (facade.region()) ret.region = facade.region();

  // Older segment clients sent idfa, newer ones send advertisingId
  const advertisingId = facade.proxy('device.advertisingId') || facade.proxy('device.idfa');

  if (os && os.toString().toLowerCase() === 'ios') ret.idfa = advertisingId;
  if (os && os.toString().toLowerCase() === 'android') ret.adid = advertisingId;


  const lib = facade.proxy('context.library.name');
  const platform = platformFromLibrary(lib) || facade.proxy('context.device.type') || (os && os.toLowerCase()) || lib;
  if (platform) ret.platform = sanitizePlatform(platform);

  // Unbundled integration support
  if ((lib || '').toString().toLowerCase() === 'analytics.js') {
    // Parse out browser info to match information provided by `amplitude.js`
    const userAgent = facade.userAgent();
    if (userAgent) {
      const parsedUserAgent = (new UAParser(userAgent)).getResult();
      ret.os_name = parsedUserAgent.browser.name;
      ret.os_version = parsedUserAgent.browser.major;
      ret.device_model = parsedUserAgent.os.name;
    }
  }

  ret.user_properties = traits(facade.traits());

  // map query params from context url if opted in
  const mapQueryParams = settings.mapQueryParams || {};
  if (!isEmpty(mapQueryParams)) {
    // since we accept any arbitrary property name and we dont have conditional UI components
    // in the app so excuse the jank
    const property = keys(mapQueryParams)[0];
    // add query params to either `user_properties` or `event_properties`
    // aliased under arbitrary custom prop provided in settings
    // var type = values(mapQueryParams)[0] || 'user_properties';
    // `.identify()` calls can't set event_properties
    const query = facade.proxy('context.page.search');
    if (facade.type() === 'identify') {
      ret.user_properties[property] = query;
    } else {
      ret.event_properties = {};
      ret.event_properties[property] = query;
    }
  }

  // Add groups.
  const { groups } = options;
  if (groups) {
    ret.groups = groups;
    Object.assign(ret.user_properties, groups);
  }

  return reject(ret);
}

/**
 * Map `track`.
 *
 * @param {Track} track
 * @param {Object} settings
 * @return {Object}
 * @api private
 */

exports.track = (track, settings) => {
  let additionalPurchasedPayloads = [];
  const payload = common(track, settings);

  const revenue = track.revenue();
  if (revenue) {
    payload.revenue = revenue;
  }

  // only set price and quantity if both exist
  const price = track.price();
  const quantity = track.quantity();
  if (price && quantity) {
    payload.price = price;
    payload.quantity = quantity;
  }

  // additional revenue fields
  const revenueType = track.proxy('properties.revenueType');
  if (revenueType) {
    payload.revenueType = revenueType;
  }
  const productId = track.proxy('properties.productId');
  if (productId) {
    payload.productId = productId;
  }

  payload.event_type = track.event();
  payload.event_properties = {
    ...payload.event_properties || {},
    ...properties(track.properties(), revenue),
  };

  const products = track.products();
  if (products && products.length && settings.trackRevenuePerProduct) {
    additionalPurchasedPayloads = products.map((product) => ({
      ...payload,
      price: Object.prototype.hasOwnProperty.call(product, 'price') ? product.price : payload.price,
      quantity: Object.prototype.hasOwnProperty.call(product, 'quantity') ? product.quantity : payload.quantity,
      revenueType: Object.prototype.hasOwnProperty.call(product, 'revenueType') ? product.revenueType : payload.revenueType,
      productId: Object.prototype.hasOwnProperty.call(product, 'productId') ? product.productId : payload.productId,
      event_type: 'Product Purchased',
    }));
  }

  return [payload].concat(additionalPurchasedPayloads);
};

/**
 * Map `page`.
 *
 * @param {Page} page
 * @param {Object} settings
 * @return {Object}
 * @api private
 */

exports.page = (page, settings) => {
  const payload = common(page, settings);
  payload.event_type = page.event(page.fullName());
  payload.event_properties = {
    ...payload.event_properties || {},
    ...properties(page.properties()),
  };
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

exports.screen = (screen, settings) => {
  const payload = common(screen, settings);
  payload.event_type = screen.event(screen.fullName());
  payload.event_properties = {
    ...payload.event_properties || {},
    ...properties(screen.properties()),
  };
  return payload;
};

/**
 * Map `identify`.
 *
 * @param {Identify} identify
 * @param {Object} settings
 * @return {Object} payload
 */

exports.identify = (identify, settings) => {
  const payload = common(identify, settings);
  del(payload, 'amplitude_event_type');
  del(payload, 'session_id');
  del(payload, 'event_id');
  payload.paying = find(identify.options('Amplitude'), 'paying');
  payload.start_version = find(identify.options('Amplitude'), 'start_version');
  return payload;
};

/**
 * Map `group`.
 *
 * @param {Group} group
 * @return {Object} payload
 */

exports.group = (group) => {
  const groupId = group.groupId();
  if (!groupId) {
    return null;
  }
  const payload = {
    user_id: group.userId(),
    device_id: deviceId(group),
    time: group.timestamp().getTime(),
    groups: {
      '[Metarouter] Group': groupId,
    },
    user_properties: {
      '[Metarouter] Group': groupId,
    },
  };

  return payload;
};
