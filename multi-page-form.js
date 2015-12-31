MultiPageForm = class MultiPageForm {


  constructor(pageMap, doc) {
    if (!pageMap) throw new Error('PageMap is required');
    this._pageMap = pageMap;
    this._doc = new ReactiveVar(doc || {});
    this._page = new ReactiveVar(
      (this._pageMap && this._pageMap.defaultPage) ? this._pageMap.defaultPage : ''
    );
    this._hookNames = ['onComplete', 'onError', 'onSubmit'];
    this._hooks = {};
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
      var next;

      this.triggerHook('onSubmit', 'next', this.currentPage, this.doc);

      if (_(this.currentDef.next).isFunction()) {
        var callsThis = {
          pageMap: this.pageMap,
          doc: this.doc
        };
        next = this.currentDef.next.call(callsThis, this.doc);
      } else {
        next = this.currentDef.next;
      }
      this._page.set(next);
    }
  }

  prevPage() {
    if (this.hasPrevPage) {
      var formDoc = AutoForm.getFormValues(this.form);
      this.triggerHook('onSubmit', 'prev', this.currentPage, formDoc.insertDoc);

      var prev;
      if (_(this.currentDef.prev).isFunction()) {
        var callsThis = {
          pageMap: this.pageMap,
          doc: this.doc
        };
        prev = this.currentDef.prev.call(callsThis, this.doc);
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

  triggerHook(hookName, from, ...opt_args) {
    if (!opt_doc) {
      opt_doc = AutoForm.getFormValues(this.form);
    }

    if (!this._hooks) {
      this.doc[mp.currentPage] = opt_doc;
    }

    var args = [from].concat(opt_args);
    var that = this;
    this._hooks[hookName].forEach(function(hookFn) {
        hookFn.apply({mp: that}, args);
      }
    );
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
        if (mp.hasNextPage) {
          mp.nextPage(mp.doc, this);
        } else {
          mp.triggerHook('onComplete', 'success', mp.doc);
          mp.reset();
        }
      },
      onError: function(formType, error) {
        mp.triggerHook('onError', 'error', error, mp.doc);
      },
      onSubmit: function(insertDoc, updateDoc, currentDoc) {
        check(insertDoc, mp.checkType);
        mp.triggerHook('onSubmit', 'submit', mp.currentPage, insertDoc);
        this.done();
        return false;
      }
    }
  }
};

