const DEBUG_DEFAULT = true; //default debug status

var PAGEMAP = Symbol("PageMap");
var PAGESTACK = Symbol('PageStack');
var PAGE = Symbol('Page');
var DEBUG = Symbol('Debug');
var HOOKNAMES = Symbol('HookNames');
var HOOKS = Symbol('Hooks');
var DOC = Symbol('Doc');

MultiPageForm = class MultiPageForm {
  constructor(pageMap, doc) {
    if (!pageMap) throw new Error('PageMap is required');
    this[PAGEMAP] = pageMap;
    this[DEBUG] = DEBUG_DEFAULT;
    this[PAGESTACK] = new ReactiveVar([]);
    this[DOC] = new ReactiveVar(doc || {});
    this[PAGE] = new ReactiveVar(
      (this[PAGEMAP] && this[PAGEMAP].defaultPage) ? this[PAGEMAP].defaultPage : ''
    );
    this[HOOKNAMES] = ['onComplete', 'onError', 'onSubmit', 'onNext', 'onPrev', 'saveDocument'];
    this[HOOKS] = {
      saveDocument: [function defaultSaveFn(page, doc, mp) {
        if (mp[DEBUG]) console.log('MultiPageForm: saveDocument', page, doc);
        var theDoc = mp.doc || {};
        theDoc[page] = doc;
        mp.doc = theDoc;
        if (mp[DEBUG]) console.log('MultiPageForm: .doc is now ', mp.doc);
      }]
    };
    var that = this;
    //Set the autoform hooks for all forms in the page map and clear other hooks
    function addHooksToAf(){
      _(that.pageMap).pluck('form').forEach(function(formId){
        if ( formId ) {
          AutoForm.addHooks(formId, that.autoFormHooks(), true);
        }
      })
    }
    addHooksToAf();

  }

  get pageMap() { return this[PAGEMAP] || {}; }

  set doc(newDoc) { this[DOC].set(newDoc); }

  get doc() { return this[DOC].get(); }

  get currentPage() { return this[PAGE].get() || this.defaultPage; }

  get defaultPage() { return this.pageMap.defaultPage; }

  get hasNextPage() { return !this.isLast; }

  get form() { return this.currentDef.form; }

  get isLast() {return !(this.nextPageName); }

  get hasPrevPage() { return !this.isFirst; }

  get pageStack() { return this[PAGESTACK].get(); }

  set pageStack(val) { this[PAGESTACK].set(val); }

  _pushPage(val){
    var ps = this.pageStack;
    ps.push(val);
    this.pageStack = ps;
    return ps.length;
  }

  _popPage(){
    var ps = this.pageStack;
    var val = ps.pop();
    this.pageStack = ps;
    return val;
  }

  get isFirst() {return this.pageStack.length === 0; }

  get nextPageName() {
    var next;
    if (_(this.currentDef.next).isFunction()) {
      var callsThis = {
        pageMap: this.pageMap,
        doc: this.doc
      };
      next = this.currentDef.next.call(callsThis, this.doc, this);
    } else {
      next = this.currentDef.next;
    }
    return next;
  }

  get prevPageName() {
    return this.pageStack[ this.pageStack.length - 1 ];
  }

  nextPage() {
    if (this.hasNextPage) {
      this.triggerHook('onNext', this.currentPage, this.doc);
      this._pushPage(this.currentPage);
      this[PAGE].set(this.nextPageName);
    }
  }

  prevPage() {
    if (this.hasPrevPage) {
      var formDoc = AutoForm.getFormValues(this.form);
      this.callSaveTrigger(this.currentPage, formDoc.insertDoc);
      this.triggerHook('onPrev', this.currentPage, formDoc.insertDoc);
      var prevPageName = this._popPage();
      this[PAGE].set(prevPageName);
    }
  }

  getDef(page) {
    return this.pageMap[page];
  }

  get currentDef() { return this.getDef(this.currentPage); }

  get checkType() {return this.currentDef.check; }

  get template() { return this.currentDef.template || this.defaultPage; }

  reset() {
    this[DOC] = new ReactiveVar({});
    this[PAGE] = new ReactiveVar();
    this[PAGESTACK] = new ReactiveVar([]);
  }

  addHooks(hooks) {
    var that = this;
    this[HOOKNAMES].forEach(function(hook) {
        var newHook = hooks[hook];
        if (newHook) {
          that[HOOKS][hook] = that[HOOKS][hook] || []; //ensure it is set
          that[HOOKS][hook].push(hooks[hook]);
        }
      }
    );

  }

  setHooks(hooks) {
    this.clearHooks();
    this.addHooks(hooks);
  }

  clearHooks() {
    this[HOOKS] = {};
  }

  triggerHook(hookName, page, doc, mp, opt_arg) {
    return this.triggerHookWithContext.call(this, hookName, {}, page, doc, mp,
      opt_arg
    );
  }

  triggerHookWithContext(hookName, ctx, page, doc, mp, opt_arg) {
    if (this[DEBUG]) console.log('MultiPageForm.triggerHookWithContext',
      hookName,
      ctx,
      page,
      doc,
      opt_arg
    );

    //no hooks to run, just return false (no hooks)
    if (this[HOOKS][hookName].length === 0) return false;

    if (!doc) {
      doc = AutoForm.getFormValues(this.form);
    }

    var that = this;
    ctx = _(ctx).extend({mp: that});
    this[HOOKS][hookName].forEach(function(hookFn) {
      if (hookFn) hookFn.call(ctx, page, doc, mp, opt_arg);
      }
    );
    return true; //true === hooks ran
  }

  callSaveTrigger(page, doc) {
    var numDone = 0;
    var ctx = {
      mp: this,
      done: function(opt_error) {
        numDone++;
      }
    };
    this.triggerHookWithContext('saveDocument', ctx, page, doc, this );
  }

  autoFormHooks() {
    var mp = this;
    return {
      onSuccess: function(formType, result) {
        if (mp[DEBUG]) console.log('MultiPageForm.onSuccess hook', formType, result);
        if (mp.hasNextPage) {
          mp.nextPage();
        } else {
          mp.triggerHook('onComplete', mp.currentPage, mp.doc, mp);
          mp.reset();
        }
      },
      onError: function(formType, error) {
        if (mp[DEBUG]) console.log('MultiPageForm.onError hook', formType, error);
        mp.triggerHook('onError', mp.currentPage, mp.doc, mp, error);
      },
      onSubmit: function(insertDoc, updateDoc, currentDoc) {
        if (mp[DEBUG]) console.log('MultiPageForm.onSubmit hook', insertDoc,
          updateDoc, currentDoc
        );
        check(insertDoc, mp.checkType);

        this.event.preventDefault();
        
        var hasError = false;
        var isLast = mp.isLast;
        try {
          mp.callSaveTrigger(mp.currentPage, insertDoc);
          if (isLast) {
            mp.triggerHook('onSubmit', mp.currentPage, mp.doc, mp);
          }
        } catch (e) {
          console.log('Error ', e);
          hasError = true;
          //this.endSubmission();
        }

        if (!hasError) {

          this.done();

          //if (isLast){
          //  this.endSubmission();
          //} else {
          //  this.done();
          //}
        }

        return false;
      },




      before: {
        // Replace `formType` with the form `type` attribute to which this hook applies
        normal: function(doc) {
          // Potentially alter the doc
          console.log('before', doc);
          return doc;
        }
      },

      // The same as the callbacks you would normally provide when calling
      // collection.insert, collection.update, or Meteor.call
      after: {
        // Replace `formType` with the form `type` attribute to which this hook applies
        formType: function(error, result) {
          console.log('after', error, result);
        }
      },

      // Called every time an insert or typeless form
      // is revalidated, which can be often if keyup
      // validation is used.
      formToDoc: function(doc) {
        console.log('formToDoc', doc);
        // alter doc
        return doc;
      },

      // Called every time an update or typeless form
      // is revalidated, which can be often if keyup
      // validation is used.
      formToModifier: function(modifier) {
        // alter modifier
        // return modifier;
        console.log('formToModifier', modifier);
        return modifier;
      },

      // Called whenever `doc` attribute reactively changes, before values
      // are set in the form fields.
      //docToForm: function(doc, ss) {},

      // Called at the beginning and end of submission, respectively.
      // This is the place to disable/enable buttons or the form,
      // show/hide a "Please wait" message, etc. If these hooks are
      // not defined, then by default the submit button is disabled
      // during submission.
      beginSubmit: function() {
        console.log('begin submit');
      },
      endSubmit: function() {
        console.log('endSubmit');
      }





    }
  }
};

