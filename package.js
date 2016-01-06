Package.describe({
  name: 'dpankros:multipage-form',
  version: '1.0.0',
  // Brief, one-line summary of the package.
  summary: 'Adds complex, non-linear multi-page flows to AutoForm',
  // URL to the Git repository containing the source code for this package.
  git: 'https://github.com/dpankros/meteor-multipage-form.git',
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
    'jquery',
    'check',
    'aldeed:simple-schema',
    'aldeed:autoform@4.0.0 || 5.0.0'
  ], 'client');

  api.imply([
    'aldeed:autoform'
    ], 'client');

  api.addFiles([
    'multi-page-form.js',
    'mpf-template.html',
    'mpf-template.js'
  ], 'client');

  api.export('MultiPageForm', 'client');
});

Package.onTest(function(api) {
  api.use('ecmascript');
  api.use('tinytest');
  api.use('dpankros:multi-page-form');
});
