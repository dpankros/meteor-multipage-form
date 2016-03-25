const DEBUG_DEFAULT = false; //default debug status

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
    this.debug = DEBUG_DEFAULT;
    this[PAGESTACK] = new ReactiveVar([]);
    this[DOC] = new ReactiveVar(doc || {});
    this[PAGE] = new ReactiveVar(
      (this[PAGEMAP] && this[PAGEMAP].defaultPage) ? this[PAGEMAP].defaultPage : ''
    );
    this[HOOKNAMES] = ['onComplete', 'onError', 'onSubmit', 'onNext', 'onPrev', 'saveDocument'];
    this[HOOKS] = {
      saveDocument: [
        function defaultSaveFn(page, doc, mp) {
          if (mp.debug) console.log('MultiPageForm: saveDocument', page, doc);
          var theDoc = mp.doc || {};
          theDoc[page] = doc;
          mp.doc = theDoc;
          if (mp.debug) console.log('MultiPageForm: .doc is now ', mp.doc);
        }
      ]
    };
    var that = this;
    //Set the autoform hooks for all forms in the page map and clear other hooks
    function addHooksToAf() {
      _(that.pageMap).pluck('form').forEach(function(formId) {
          if (formId) {
            AutoForm.addHooks(formId, that.autoFormHooks(), true);
          }
        }
      )
    }

    addHooksToAf();
  }

  set debug(value) { this._debug = value; }

  get debug() { return this._debug; }

  get pageMap() { return this[PAGEMAP] || {}; }

  set doc(newDoc) { this[DOC].set(newDoc); }

  get doc() { return this[DOC].get(); }

  get currentPage() { return this[PAGE].get() || this.defaultPage; }

  get defaultPage() { return this.pageMap.defaultPage; }

  get hasNextPage() { return !!this.nextPageName; }

  get form() { return this.currentDef.form; }

  get isLast() {return !this.nextPageName; }

  get hasPrevPage() { return !this.isFirst; }

  get isFirst() {return this.pageStack.length === 0; }

  get pageStack() { return this[PAGESTACK].get() || []; }

  set pageStack(val) { this[PAGESTACK].set(val); }

  _pushPage(val) {
    var ps = this.pageStack;
    ps.push(val);
    this.pageStack = ps;
    return ps.length;
  }

  _popPage() {
    var ps = this.pageStack;
    var val = ps.pop();
    this.pageStack = ps;
    return val;
  }

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
    //last on the stack
    return this.pageStack[this.pageStack.length - 1];
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
    if (this.debug) console.log('reset()');
    this[DOC].set({});
    this[PAGE].set(undefined);
    this.pageStack = [];
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

  callSubmitTrigger(page, doc) {
    var submitHooks = this[HOOKS]['onSubmit'] || [];
    var submitHooksCount = submitHooks.length || 1; //if length is not defined
    var numDone = 0;
    var shouldFail = false;
    var that = this;
    var ctx = {
      done: function(opt_err) {
        numDone++;
        if (opt_err) {
          shouldFail = true;
        }

        if (numDone === submitHooksCount) {
          that.result(opt_err);
        } else if (numDone >= submitHooksCount) {
          if (this.debug) console.log(
            'WARN: .done() called too many times for one form submit', page, doc
          );
        }
      }
    };

    this.triggerHookWithContext('onSubmit', ctx, this.currentPage, this.doc,
      this
    );

    if (shouldFail) {
      return false;
    } else {
      return true;
    }
  }

  result(err, result) {
    if (this.debug) console.log('MultiPageForm.result', err, result);

    if (err) {
      if (err instanceof Error) err = err.message;
      try {
        this.triggerHook('onError', this.currentPage, this.doc, this, err);
      } catch (e) {
        console.error(e.message);
      }
    } else {
      try {
        this.triggerHook('onComplete', this.currentPage, this.doc, this);
      } catch (e) {
        console.error(e.message);
      } finally {
        this.reset();
      }
    }

  }

  triggerHookWithContext(hookName, ctx, page, doc, mp, opt_arg) {
    if (this.debug) console.log('MultiPageForm.triggerHookWithContext',
      hookName,
      ctx,
      page,
      doc,
      opt_arg
    );

    //no hooks to run, just return false (no hooks)
    if (!this[HOOKS][hookName] || this[HOOKS][hookName].length === 0) return false;

    if (!doc) {
      doc = AutoForm.getFormValues(this.form);
    }

    var that = this;
    ctx = _(ctx).extend({mp: that});
    this[HOOKS][hookName].forEach(function(hookFn) {
        try {
          if (hookFn) hookFn.call(ctx, page, doc, mp, opt_arg);
        } catch (e) {
          console.error(e.message);
        }
      }
    );
    return true; //true === hooks ran
  }

  callSaveTrigger(page, doc) {
    this.triggerHook('saveDocument', page, doc, this);
  }

  autoFormHooks() {
    var mp = this;
    return {
      onSuccess: function(formType, result) {
        if (mp.debug) console.log('MultiPageForm.onSuccess hook', formType,
          result
        );
        if (mp.hasNextPage) mp.nextPage();
      },
      onError: function(formType, error) {
        if (mp.debug) console.log('MultiPageForm.onError hook', formType,
          error
        );
        mp.triggerHook('onError', mp.currentPage, mp.doc, mp, error);
      },
      onSubmit: function(insertDoc, updateDoc, currentDoc) {
        if (mp.debug) console.log('MultiPageForm.onSubmit hook',
          JSON.stringify(insertDoc)
        );
        check(insertDoc, mp.checkType);

        try {
          mp.callSaveTrigger(mp.currentPage, insertDoc);
          if (mp.isLast) mp.callSubmitTrigger(mp.currentPage, mp.doc, mp);
          this.done();
        } catch (e) {
          mp.triggerHook('onError', mp.currentPage, mp.doc, mp, e.message);
          this.done(e);
        }

        return false;
      }
    }
  }
};

