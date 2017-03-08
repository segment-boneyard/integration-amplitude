
4.1.0 / 2017-03-08
==================

  * package: remove "integration-version"

3.1.2 / 2017-01-24
==================

 * Changes GET to POST request to resolve URI too long error

3.1.0 / 2016-12-13
==================

  * Send revenue also nested under event_properties for client side parity

3.0.2 / 2016-11-29
==================

  * Send advertisingId or IDFA for iOS

3.0.1 / 2016-09-16
==================

  * Use correct Amplitude UA parser fork, update tests to match

3.0.0 / 2016-09-16
==================

  * Modify page and screen calls to respect track*Pages settings (#23)

2.0.0 / 2016-09-14
==================

  * Migrate to versioned integration worker, add unbundling support

1.1.2 / 2016-08-02
==================

  * Only send revenue properties when event has revenue (#20)

1.1.1 / 2016-07-27
==================

  * Parse additional revenue fields (#19)

1.1.0 / 2016-06-10
==================

  * map segment group to amplitude identify group

1.0.15 / 2016-05-03
===================

  * default to library if platform invalid

1.0.14 / 2016-04-19
===================

  * stringify device.type to avoid uncaught exception
  * don't set platform if invalid value

1.0.13 / 2016-03-24
===================

  * Regenerate device ID on some versions.

1.0.12 / 2016-03-17
===================

  * update platform value

1.0.11 / 2015-08-19
===================

  * add library field to events

1.0.10 / 2015-07-08
===================

  * Merge pull request #5 from kellyfj/master
  * Support advertistingId
  * Merge pull request #4 from segmentio/update-changelog
  * Update History.md

1.0.9 / 2015-03-09
==================

 * support identify api

1.0.8 / 2014-12-08
==================

 * bump segmentio-integration

1.0.7 / 2014-12-08
==================

 * bump segmentio-integration

1.0.6 / 2014-12-02
==================

 * bump integration proto

1.0.5 / 2014-12-02
==================

 * remove .retries()
 * fix dev deps
 * bump dev deps

1.0.4 / 2014-12-02
==================

 * bump segmentio-integration

1.0.3 / 2014-11-26
==================

 * Update mapper to use countryless locales

1.0.2 / 2014-11-21
==================

 * Bumping segmentio-integration

1.0.1 / 2014-11-21
==================

  * Fix build badge
  * Sync code with integrations

1.0.0 / 2014-11-14
==================

  * Initial release
