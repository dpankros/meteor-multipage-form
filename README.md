MutliPageForm
=============

A Meteor package to allow non-linear multi-page form flows using aldeed:auto-form

Installtion
-----------

```
meteor add dpankros:multi-page-form
```
  
Basic Example
-------------

Let's say you want users to signup using a general information page and then a
terms of service agreement. This is a basic multi-page form (MPF) flow.

First, let's define some basics.  I like to use simple-schema to define my forms.
It's not required, but I think it makes things cleaner.  Really we just need to 
define an autoform for each page.

```javascript
App.Schemas.info = new SimpleSchema({
  username: {
    type:String,
    label: 'Username'
  },
  firstName: {
    type: String,
    label: 'First Name'
  },
  lastName: {
    type: String,
    label: 'Last Name'
  },
  email: {
    type: String,
    label: 'E-Mail',
    regEx: SimpleSchema.RegEx.Email
  }
});
App.Schemas.tos = new SimpleSchema({
  acceptTerms: {
    type: Boolean,
    label: 'I accept the above terms',
    custom: function() {
      if (! this.value) return 'acceptToS';
    }
  }
});
```

The autoforms would then look like this
```
<template name="info">
  {{# autoForm id="createAccountInfo" doc=doc.info schema=Schemas.info}}
    {{> afQuickField name='username'}}
    {{> afQuickField name='firstName'}}
    {{> afQuickField name="lastName"}}
    {{> afQuickField name="email"}}
    {{> mpfButtons}}
  {{/autoForm}}
</template>
<template name="tos">
  <div class="tos well pre-scrollable" style="height:50%">Some terms here</div>
  {{# autoForm id="createAccountToS" doc=doc.tos schema=Schemas.tos}}
    {{> afQuickField name="acceptTerms"}}
    {{> mpfButtons}}
  {{/ autoForm}}
</template>
```

Up to this point, we really aren't doing anything you wouldn't otherwise do when
using autoform.  We need to define the page flow

```javascript
var createAccountMP;
Meteor.startup(function() {
    createAccountMP = new MultiPageForm({
        defaultPage: 'info',
        info: {
          template: 'info',
          form: 'info',
          next: 'tos'
          check: App.Schemas.info
        },
        tos: {
          template: 'tos',
          form: 'tos',
          check: App.Schemas.tos,
        }
      }
    );
```

This does several things.  First, we create a new MultiPageForm object.  The JSON
parameter has two major parts.  First, the defaultPage item says where we start 
the page flow. That is, we start at the "info" page.  Next, we define the pages 
and their properties.  Here, the "info" page uses the 'info' blaze template, an 
autoform with an id of 'info', and the next page is 'tos.'  Check allows MPF to 
verify the document when submitted.  If you're using autoform, as shown in this
example, this is redundant because the autoform does the check first.  You could,
however define an additioal schema with more detailed requirements that would be
checked only upon submit.

Right now, there is a basic flow, but nothing would actually be done when you 
submit.  Fortunately, MPF allows for callbacks to be called when events such as 
submit or previous is clicked.

```javascript
function onCreate(method, doc) {
  //do submit action
  try {
    createAccount(doc);
  } catch (e) {
    console.log(e);
  }
}
function onFormSubmit(method, page, doc) {
  //mp is the MultiPageForm instance, which is in the 'this' context
  if (method === 'submit') {
    //save the document
    var theDoc = this.mp.doc;
    theDoc[page] = doc;
    this.mp.doc = theDoc;
  }
}
function onError(method, e, doc) {
  console.error(e, doc);
}
```

MPF needs to know how to call these so we do this by adding the hooks.

```javascript
createAccountMP.addHooks({
    onSubmit: onFormSubmit,
    onComplete: onCreateAccount,
    onError: onError
});
```

The autoforms also neeed access to the document so we need to add those too.
```javascript
Template.info.helpers({
  doc: function() {
    return createAccountMP.doc;
  }
});
Template.tos.helpers({
  doc: function() {
    return createAccountMP.doc;
  }
});
```

At this point, the flow should work and there are two forms that flow back and forth.

Advanced Example
----------------
The basic example is great, but it is linear and there are other options for
accomplishing that.  Some of those options are easier to configure.  The most
obvious question is, why do I want non-linear flows?  Lets answer that with an
example.  Let's say you have two groups of users.  One are consumers and the 
other are industry professionals.  The consumers can fill out the info form and
agree to the terms of service and be done.  The professionals, however, need 
to supply some more information.  We can move that information to a third page
that only appears if the user indicates they are a professional on the first page.
Consumer flow:
```
info --> tos
```
Professional flow:
```
info --> proInfo --> tos
```
Really, though, those are part of the same flow:
```
      <pro>
info --------> proInfo --> tos
   \________________________^
        <consumer>
```
The real magic for this comes in the configuration JSON.  To configure this type 
of flow, the next and prev member for a page can be a *function* that returns the
next page.  For example:  
```
 info: {
   template: 'info',
   form: 'info',
   next: function(doc, mp) {
     if (doc.info.accountType === 'pro') {
       return 'proform';
     } else {
       return 'tos';
     }
   },
   check: App.Schemas.info
 },
 proform: {
   template: 'proform',
   form: 'proform',
   next: 'tos',
   check: App.Schemas.proform
 },
 tos: {
   template: 'tos',
   form: 'tos',
   check: App.Schemas.tos
 }
```

Working Example
---------------
I have a working example that you can download and play with.  i use it for 
testing but it also is a good learning tool as well as showing a couple other 
packages I have released.


