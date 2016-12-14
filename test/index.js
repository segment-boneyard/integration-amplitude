
var Test = require('segmentio-integration-tester');
var helpers = require('./helpers');
var mapper = require('../lib/mapper');
var assert = require('assert');
var Amplitude = require('..');
var encode = require('urlencode');

describe('Amplitude', function(){
  var amplitude;
  var settings;
  var test;

  beforeEach(function(){
    settings = {
      apiKey: 'ad3c426eb736d7442a65da8174bc1b1b',
      trackAllPages: true,
      trackCategorizedPages: false,
      trackNamedPages: false
    };
    amplitude = new Amplitude(settings);
    test = Test(amplitude, __dirname);
  });

  it('should have the correct settings', function(){
    test
      .name('Amplitude')
      .channels(['server', 'mobile'])
      .ensure('settings.apiKey');
  });

  describe('.validate()', function(){
    it('should not be valid without an api key', function(){
      test.invalid({}, {});
    });

    it('should be valid with an api key', function(){
      test.valid({}, { apiKey: 'apiKey' });
    });
  });

  describe('mapper', function(){
    describe('track', function(){
      it('should map basic track', function(){
        test.maps('track-basic');
      });

      it('should map full track', function(){
        test.maps('track-full');
      });
    });

    describe('page', function(){
      it('should map basic page', function(){
        test.maps('page-basic');
      });

      it('should map full page', function(){
        test.maps('page-full');
      });
    });

    describe('screen', function(){
      it('should map basic screen', function(){
        test.maps('screen-basic');
      });

      it('should map full screen', function(){
        test.maps('screen-full');
      });
    });

    describe('identify', function(){
      it('should map basic identify', function(){
        test.maps('identify-basic');
      });

      it('should map full identify', function(){
        test.maps('identify-full');
      });
    });

    describe('group', function(){
      it('should map groupId', function(){
        test.maps('group-basic');
      });
    });

    it('should remove `event_id`, `language` and `amplitude_event_type` from properties', function(){
      test.maps('clean');
    });

    it('should map the country, region, and city fields via address.*', function(){
      test.maps('address-fallback');
    });
  });

  describe('.page()', function(){
    it('should map page calls correctly', function(done){
      settings.trackAllPages = true;
      var json = test.fixture('page-basic');
      test
        .set(settings)
        .page(json.input)
        .query('api_key', settings.apiKey)
        .query('event', json.output, JSON.parse)
        .expects(200, done);
    });

    it('should record page calls with bad fields correctly', function(done){
      settings.trackAllPages = true;
      amplitude.page(helpers.page(), done);
    });

    it('should error on invalid creds', function(done){
      settings.trackAllPages = true;
      var json = test.fixture('page-basic');
      test
        .set({ apiKey: 'foo' })
        .page(json.input)
        .error(done);
    });

    it('should send page when `settings.trackAllPages` is `true`', function(done) {
      settings.trackAllPages = true;
      settings.trackNamedPages = false;
      settings.trackCategorizedPages = false;
      var json = test.fixture('page-basic');

      test
        .set({ apiKey: settings.apiKey })
        .page(json.input)
        .requests(1)
        .expects(200, done);
    });

    it('should not send page when `settings.trackAllPages` is `false`', function(done) {
      settings.trackAllPages = false;
      settings.trackNamedPages = false;
      settings.trackCategorizedPages = false;
      var json = test.fixture('page-basic');

      test
        .set({ apiKey: settings.apiKey })
        .page(json.input)
        .requests(0)
        .end(done);
    });

    it('should send page when `settings.trackCategorizedPages` is `true` and `.category` is present', function(done) {
      settings.trackAllPages = false;
      settings.trackNamedPages = false;
      settings.trackCategorizedPages = true;
      var json = test.fixture('page-category');

      test
        .set({ apiKey: settings.apiKey })
        .page(json.input)
        .requests(1)
        .end(done);
    });

    it('should not send page when `settings.trackCategorizedPages` is `true` and `.category` is missing', function(done) {
      settings.trackAllPages = false;
      settings.trackNamedPages = false;
      settings.trackCategorizedPages = true;
      var json = test.fixture('page-no-category');

      test
        .set({ apiKey: settings.apiKey })
        .page(json.input)
        .requests(0)
        .end(done);
    });

    it('should not send page when `settings.trackCategorizedPages` is `false` and `.category` is present', function(done) {
      settings.trackAllPages = false;
      settings.trackNamedPages = false;
      settings.trackCategorizedPages = false;
      var json = test.fixture('page-category');

      test
        .set({ apiKey: settings.apiKey })
        .page(json.input)
        .requests(0)
        .end(done);
    });

    it('should send page when `settings.trackNamedPages` is `true` and `.name` is present', function(done) {
      settings.trackAllPages = false;
      settings.trackNamedPages = true;
      settings.trackCategorizedPages = false;
      var json = test.fixture('page-name');

      test
        .set({ apiKey: settings.apiKey })
        .page(json.input)
        .requests(1)
        .end(done);
    });

    it('should not send page when `settings.trackNamedPages` is `true` and `.name` is missing', function(done) {
      settings.trackAllPages = false;
      settings.trackNamedPages = true;
      settings.trackCategorizedPages = false;
      var json = test.fixture('page-no-name');

      test
        .set({ apiKey: settings.apiKey })
        .page(json.input)
        .requests(0)
        .end(done);
    });

    it('should not send page when `settings.trackNamedPages` is `false` and `.name` is present', function(done) {
      settings.trackAllPages = false;
      settings.trackNamedPages = false;
      settings.trackCategorizedPages = false;
      var json = test.fixture('page-name');

      test
        .set({ apiKey: settings.apiKey })
        .page(json.input)
        .requests(0)
        .end(done);
    });
  });

  describe('.screen()', function(){
    it('should map screen calls correctly', function(done){
      var json = test.fixture('screen-basic');
      test
        .set(settings)
        .screen(json.input)
        .query('api_key', settings.apiKey)
        .query('event', json.output, JSON.parse)
        .expects(200, done);
    });

    it('should be able to process screen calls with bad fields', function(done){
      amplitude.screen(helpers.screen(), done);
    });

    it('should error on invalid creds', function(done){
      var json = test.fixture('screen-basic');
      test
        .set({ apiKey: 'foo' })
        .screen(json.input)
        .error(done);
    });

    it('should send screen when `settings.trackAllPages` is `true`', function(done) {
      settings.trackAllPages = true;
      settings.trackNamedPages = false;
      settings.trackCategorizedPages = false;
      var json = test.fixture('screen-basic');

      test
        .set({ apiKey: settings.apiKey })
        .screen(json.input)
        .requests(1)
        .expects(200, done);
    });

    it('should not send screen when `settings.trackAllPages` is `false`', function(done) {
      settings.trackAllPages = false;
      settings.trackNamedPages = false;
      settings.trackCategorizedPages = false;
      var json = test.fixture('screen-basic');

      test
        .set({ apiKey: settings.apiKey })
        .screen(json.input)
        .requests(0)
        .end(done);
    });

    it('should send screen when `settings.trackCategorizedPages` is `true` and `.category` is present', function(done) {
      settings.trackAllPages = false;
      settings.trackNamedPages = false;
      settings.trackCategorizedPages = true;
      var json = test.fixture('screen-category');

      test
        .set({ apiKey: settings.apiKey })
        .screen(json.input)
        .requests(1)
        .end(done);
    });

    it('should not send screen when `settings.trackCategorizedPages` is `true` and `.category` is missing', function(done) {
      settings.trackAllPages = false;
      settings.trackNamedPages = false;
      settings.trackCategorizedPages = true;
      var json = test.fixture('screen-no-category');

      test
        .set({ apiKey: settings.apiKey })
        .screen(json.input)
        .requests(0)
        .end(done);
    });

    it('should not send screen when `settings.trackCategorizedPages` is `false` and `.category` is present', function(done) {
      settings.trackAllPages = false;
      settings.trackNamedPages = false;
      settings.trackCategorizedPages = false;
      var json = test.fixture('screen-category');

      test
        .set({ apiKey: settings.apiKey })
        .screen(json.input)
        .requests(0)
        .end(done);
    });

    it('should send screen when `settings.trackNamedPages` is `true` and `.name` is present', function(done) {
      settings.trackAllPages = false;
      settings.trackNamedPages = true;
      settings.trackCategorizedPages = false;
      var json = test.fixture('screen-name');

      test
        .set({ apiKey: settings.apiKey })
        .screen(json.input)
        .requests(1)
        .end(done);
    });

    it('should not send screen when `settings.trackNamedPages` is `true` and `.name` is missing', function(done) {
      settings.trackAllPages = false;
      settings.trackNamedPages = true;
      settings.trackCategorizedPages = false;
      var json = test.fixture('screen-no-name');

      test
        .set({ apiKey: settings.apiKey })
        .screen(json.input)
        .requests(0)
        .end(done);
    });

    it('should not send screen when `settings.trackNamedPages` is `false` and `.name` is present', function(done) {
      settings.trackAllPages = false;
      settings.trackNamedPages = false;
      settings.trackCategorizedPages = false;
      var json = test.fixture('screen-name');

      test
        .set({ apiKey: settings.apiKey })
        .screen(json.input)
        .requests(0)
        .end(done);
    });
  });

  describe('.track()', function(){
    it('should map track calls correctly', function(done){
      var json = test.fixture('track-basic');
      test
        .track(json.input)
        .sends('api_key=' + settings.apiKey + '&event=' + encode(JSON.stringify(json.output)))
        .expects(200)
        .end(done);
    });

    it('should track amplitude properties properly', function(done){
      var json = test.fixture('track-full');
      test
        .track(json.input)
        .sends('api_key=' + settings.apiKey + '&event=' + encode(JSON.stringify(json.output)))
        .expects(200)
        .end(done);
    });

    it('should track context properly', function(done){
      var json = test.fixture('track-full');
      test
        .track(json.input)
        .sends('api_key=' + settings.apiKey + '&event=' + encode(JSON.stringify(json.output)))
        .expects(200)
        .end(done);
    });

    it('should track ios properly', function(done){
      var json = test.fixture('track-ios');
      test
        .track(json.input)
        .sends('api_key=' + settings.apiKey + '&event=' + encode(JSON.stringify(json.output)))
        .expects(200)
        .end(done);
    });

    it('should track idfa for ios properly', function(done){
      var json = test.fixture('track-idfa-ios');
      test
        .track(json.input)
        .sends('api_key=' + settings.apiKey + '&event=' + encode(JSON.stringify(json.output)))
        .expects(200)
        .end(done);
    });

    it('should track android properly', function(done){
      var json = test.fixture('track-android');
      test
        .track(json.input)
        .sends('api_key=' + settings.apiKey +'&event=' + encode(JSON.stringify(json.output)))
        .expects(200)
        .end(done);
    });

     it('should track adid for android properly', function(done){
      var json = test.fixture('track-adid-android');
      test
        .track(json.input)
        .sends('api_key=' + settings.apiKey + '&event=' + encode(JSON.stringify(json.output)))
        .expects(200)
        .end(done);
    });

    it('should track analytics.js (unbundled) properly', function(done){
      var json = test.fixture('track-analyticsjs');
      test
        .track(json.input)
        .sends('api_key=' + settings.apiKey +'&event=' + encode(JSON.stringify(json.output)))
        .expects(200)
        .end(done);
    });

    it('should error on invalid creds', function(done){
      var json = test.fixture('track-basic');
      test
        .set({ apiKey: 'foo' })
        .track(json.input)
        .error(done);
    });

    it('should prevent uncaught exceptions for manually sent context properties', function(done){
      var json = test.fixture('track-bad');

      test
        .track(json.input)
        .sends('api_key=' + settings.apiKey + '&event=' + encode(JSON.stringify(json.output)))
        .expects(200)
        .end(done);
    });

    it('should send library value if platform is invalid', function(done){
      var json = test.fixture('track-analytics-php');

      test
        .track(json.input)
        .sends('api_key=' + settings.apiKey + '&event=' + encode(JSON.stringify(json.output)))
        .expects(200)
        .end(done);
    });

    it('should track basic revenue fields', function(done){
      var json = test.fixture('track-basic-revenue');

      test
        .track(json.input)
        .sends('api_key=' + settings.apiKey + '&event=' + encode(JSON.stringify(json.output)))
        .expects(200)
        .end(done);
    });

    it('should track full revenue fields', function(done){
      var json = test.fixture('track-full-revenue');

      test
        .track(json.input)
        .sends('api_key=' + settings.apiKey +'&event=' + encode(JSON.stringify(json.output)))
        .expects(200)
        .end(done);
    });

    it('should not track revenue properties if there is no revenue', function(done){
      var json = test.fixture('track-basic-no-revenue');

      test
        .track(json.input)
        .sends('api_key=' + settings.apiKey + '&event=' + encode(JSON.stringify(json.output)))
        .expects(200)
        .end(done);
    });
  });

  describe('.identify()', function(){
    it('should map identify calls correctly', function(done){
      var json = test.fixture('identify-basic');
      test
        .set(settings)
        .identify(json.input)
        .query('api_key', settings.apiKey)
        .query('identification', json.output, JSON.parse)
        .expects(200, done);
    });

    it('should map identify with full context properly', function(done){
      var json = test.fixture('identify-full');
      test
        .set(settings)
        .identify(json.input)
        .query('api_key', settings.apiKey)
        .query('identification', json.output, JSON.parse)
        .expects(200, done);
    });

    it('it should generate a unique deviceId for android version 1.4.4', function(done){
      var json = test.fixture('identify-full');
      json.input.context.library.name = 'analytics-android';
      json.input.context.library.version = '1.4.4';
      json.output.device_id = 'user-id:device-model:device-id';
      json.output.platform = 'Android';

      test
        .set(settings)
        .identify(json.input)
        .query('api_key', settings.apiKey)
        .query('identification', json.output, JSON.parse)
        .expects(200, done);
    });

    it('should error on invalid creds', function(done){
      var json = test.fixture('identify-basic');
      test
        .set({ apiKey: 'foo' })
        .identify(json.input)
        .error(done);
    });
  });

  describe('.group()', function(){
    it('should map group calls correctly', function(done){
      var json = test.fixture('group-basic');
      test
        .set(settings)
        .group(json.input)
        .query('api_key', settings.apiKey)
        .query('identification', json.output, JSON.parse)
        .expects(200, done);
    });
  });
});
