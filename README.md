WARNING: DEPRECATED
==========
I feel that blaze is dead if not near-death.  Personally, I have switched over to react and am happier for it.  Thus, I will not be maintaining this package moving forward.  If you use it and want to take it over, please let me know.  If nobody steps up to take over the project, I reserve the right to delete it after 1 Aug 2017.


MutliPageForm
=============

A Meteor package to allow non-linear multi-page form flows using aldeed:auto-form

Installtion
-----------

```
meteor add dpankros:multi-page-form
```
  
Example
---------------
I have a working example that you can download and play with.  I use it for 
testing but it is also a good learning tool.  It also shows a couple other 
packages I have released.

https://github.com/dpankros/meteor-multipage-form-test.git
  


Basic Example
-------------
Let's say you want users to signup using a general information page and then a
terms of service agreement. This is a basic multi-page form (MPF) flow.

First, let's define some basics.  I like to use simple-schema to define my forms.
It's not required, but I think it makes things cleaner.  Really, we just need to 
define an autoform for each page.

```javascript
//info schema
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
//terms of service schema
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
{{!-- this last line creates next and prev buttons based on where it appears in the chain of forms --}}
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
using Autoform, but we need to define the page flow

```javascript
var createAccountMP;
Meteor.startup(function() {
    createAccountMP = new MultiPageForm({
        defaultPage: 'info', //the name of the start page
        info: { //info page  <-- start page
          template: 'info', //blaze template
          form: 'info',     //autoform id
          next: 'tos',      //the next apge
          check: App.Schemas.info  //a schema to check on submit
        },
        tos: { //terms of service page
          template: 'tos',  //blaze template
          form: 'tos',      //autoform id
          check: App.Schemas.tos, //a schema to check on submit
        }
      }
    );
  }
);
```

This does several things.  First, we create a new MultiPageForm object.  The JSON
parameter has two major parts.  First, the defaultPage item says where we start 
the page flow. That is, we start at the "info" page.  Next, we define the pages 
and their properties.  Here, the "info" page uses the 'info' blaze template, an 
autoform with an id of 'info', and the next page is 'tos.'  Check allows MPF to 
verify the document when submitted.  If you're using autoform, as shown in this
example, this is redundant because the autoform probably does the check first.  You could,
however define an additioal schema with more detailed requirements that would be
checked only upon submit.

Right now, there is a basic flow, but nothing would actually be done when you 
submit.  Fortunately, MPF allows for callbacks to be called when events such as 
submit or previous is clicked.

```javascript
/*
 *When the FINAL form is submitted and the basic checks have been completed 
 *successfully.  This is where you DO something.
 */
function onFormSubmit(page, doc, mp) {
  createAccount(doc);
}
/*
 * When the form is submitted and everything is successful.  Maybe put up a 
 * success modal?
 */
function onCreate(page, doc, mp) {
  //do success action
  showSuccessModal(doc);
}
/*
 * When the form is submitted and there is an error.  Maybe put up a error alert?
 */
function onError(method, e, doc) {
  console.error(e, doc);
  AlertCategory.getOrCreate('accountCreate').show('danger', 'CreateAccount() Failed');
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

The autoforms (really, the Blaze templates) also neeed access to the document so 
we need to add those too.
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
accomplishing that (and some of those options are easier to configure than MPF).  The most
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
       return 'proform'; // <-- pros go here
     } else {
       return 'tos';  //<-- everyone else goes here
     }
   },
   check: App.Schemas.info
 },
 proform: { //<-- the extra page shown to "pros"
   template: 'proform',
   form: 'proform',
   next: 'tos',
   check: App.Schemas.proform
 },
 tos: { // <-- the final terms of service that everyone sees
   template: 'tos',
   form: 'tos',
   check: App.Schemas.tos
 }
```
This isn't the only use case, either.  Shopping cart checkout could be another.
For example, a guest checkout may require extra information that a registered user
may not.  Thus, the guests may need to be shown an extra page of a form.  It seems
simple but it can be amazingly useful.

Things to Know or Consider
--------------------------
1. The previous pages are stored in a stack so you always go back from where you came. You can set the pageStack to something else but you may really mess things up and so this is unsupported for now.
1. The doc by default uses a sub-object for each page of the form.  I have contemplated allowing this to be different, but I haven't implemeted and/or tested it.  If you need this, a workarouns is to modify the form in the onSubmit hook.
1. If you want to advance programatically to another page, you can call nextPage() or prevPage() of the mpf object
1. You can call addHooks multiple times and receive multiple callbacks.  setHooks will clear all the previous hooks and set the new ones.  clearHooks clears all the hooks.  If you use setHooks or clearHooks, you MUST provide a saveDocument hook or MPF will not save any data
1. The saveDocument hook is called after each page of the form is submitted.


