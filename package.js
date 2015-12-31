Package.describe({
  name: 'dpankros:multi-page-form',
  version: '0.0.1',
  // Brief, one-line summary of the package.
  summary: '',
  // URL to the Git repository containing the source code for this package.
  git: '',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.2.1');
  api.use('ecmascript');
  api.use([
    'ecmascript',
    'livedata',
    'underscore',
    'deps',
    'templating',
    'ui',
    'blaze',
    'ejson',
    'reactive-var',
    'reactive-dict',
    'random',
    'jquery'
  ], 'client');

  api.use('underscore');
  api.addFiles([
    'multi-page-form.js',
    'mpf-template.html',
    'mpf-template.js'
  ], 'client');
  api.export('MultiPageForm');
});

Package.onTest(function(api) {
  api.use('ecmascript');
  api.use('tinytest');
  api.use('dpankros:multi-page-form');
});
