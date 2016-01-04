const DEBUG = true;


MultiPageForm = class MultiPageForm {
  constructor(pageMap, doc) {
    if (!pageMap) throw new Error('PageMap is required');
    this._pageMap = pageMap;
    this._doc = new ReactiveVar(doc || {});
    this._page = new ReactiveVar(
      (this._pageMap && this._pageMap.defaultPage) ? this._pageMap.defaultPage : ''
    );
    this._hookNames = ['onComplete', 'onError', 'onSubmit', 'onNext', 'onPrev', 'saveDocument'];
    this._hooks = {
      saveDocument: [function defaultSaveFn(page, doc, mp) {
        var theDoc = mp.doc || {};
        theDoc[page] = doc;
        mp.doc = theDoc;
      }]
    };
  }

  get pageMap() { return this._pageMap || {}; }

  set doc(newDoc) { this._doc.set(newDoc); }

  get doc() { return this._doc.get(); }

  get currentPage() { return this._page.get() || this.defaultPage; }

  get defaultPage() { return this.pageMap.defaultPage; }

  get hasNextPage() { return !this.isLast; }

  get form() { return this.currentDef.form; }

  get isLast() {return !this.currentDef.next; }

  get hasPrevPage() { return !this.isFirst; }

  get isFirst() {return !this.currentDef.prev; }

  nextPage() {
    if (this.hasNextPage) {
      this.triggerHook('onNext', '', this.currentPage, this.doc);

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
      this._page.set(next);
    }
  }

  prevPage() {
    if (this.hasPrevPage) {
      var formDoc = AutoForm.getFormValues(this.form);
      this.callSaveTrigger(this.currentPage, formDoc.insertDoc);
      this.triggerHook('onPrev', this.currentPage, formDoc.insertDoc);

      var prev;
      if (_(this.currentDef.prev).isFunction()) {
        var callsThis = {
          pageMap: this.pageMap,
          doc: this.doc
        };
        prev = this.currentDef.prev.call(callsThis, this.doc, this);
      } else {
        prev = this.currentDef.prev;
      }
      this._page.set(prev);
    }
  }

  getDef(page) {
    return this.pageMap[page];
  }

  get currentDef() { return this.getDef(this.currentPage); }

  get checkType() {return this.currentDef.check; }

  get template() { return this.currentDef.template; }

  reset() {
    this._doc = new ReactiveVar({});
    this._page = new ReactiveVar();
  }

  addHooks(hooks) {
    var that = this;
    this._hookNames.forEach(function(hook) {
        var newHook = hooks[hook];
        that._hooks[hook] = that._hooks[hook] || []; //ensure it is set
        if (newHook) {
          that._hooks[hook].push(hooks[hook]);
        }
      }
    );
  }

  setHooks(hooks) {
    this._hooks = {};
    this.addHooks(hooks);
  }

  triggerHook(hookName, page, doc, mp, opt_arg) {
    //if (DEBUG) console.log('MultiPageForm.triggerHook',
    //  hookName,
    //  page,
    //  opt_arg
    //);

    return this.triggerHookWithContext.call(this, hookName, {}, page, doc, mp,
      opt_arg
    );
  }

  triggerHookWithContext(hookName, ctx, page, doc, mp, opt_arg) {
    if (DEBUG) console.log('MultiPageForm.triggerHookWithContext',
      hookName,
      ctx,
      page,
      doc,
      opt_arg
    );

    //no hooks to run, just return false (no hooks)
    if (this._hooks[hookName].length === 0) return false;

    if (!doc) {
      doc = AutoForm.getFormValues(this.form);
    }

    var that = this;
    ctx = _(ctx).extend({mp: that});
    this._hooks[hookName].forEach(function(hookFn) {
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

  setOnCompleteFunction(fn) { this._completeFn = fn; }

  setFormSubmitFunction(fn) { this._formSubFn = fn; }

  setOnErrorFunction(fn) {this._errorFn = fn; }

  get completeFn() {return this._completeFn;}

  get formSubmitFn() {return this._formSubFn;}

  get errorFn() {return this._errorFn;}

  autoFormHooks() {
    var mp = this;
    return {
      onSuccess: function(formType, result) {
        if (DEBUG) console.log('MultiPageForm.onSuccess hook', formType, result);
        if (mp.hasNextPage) {
          mp.nextPage();
        } else {
          mp.triggerHook('onComplete', mp.currentPage, mp.doc, mp);
          mp.reset();
        }
      },
      onError: function(formType, error) {
        if (DEBUG) console.log('MultiPageForm.onError hook', formType, error);
        mp.triggerHook('onError', mp.currentPage, mp.doc, mp, error);
      },
      onSubmit: function(insertDoc, updateDoc, currentDoc) {
        if (DEBUG) console.log('MultiPageForm.onSubmit hook', insertDoc,
          updateDoc, currentDoc
        );
        check(insertDoc, mp.checkType);

        var hasError = false;
        try {
          mp.callSaveTrigger(mp.currentPage, insertDoc);
          if (mp.isLast) {
            mp.triggerHook('onSubmit', mp.currentPage, insertDoc, mp);
          }
        } catch (e) {
          console.log('error ', e);
          hasError = true;
          this.done(new Error(e.message));
        }

        if (!hasError) this.done();

        return false;

        //this refreshes
        //this.done();
        //return true;

        //this does not refresh
        //this.done();
        //return false;
      }
    }
  }
};

