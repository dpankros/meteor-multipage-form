MultiPageForm = class MultiPageForm {
  constructor(pageMap, opt_completeFn, opt_errorFn) {
    if (!pageMap) throw new Error('PageMap is required');
    this._pageMap = pageMap;
    this._doc = new ReactiveVar({});
    this._page = new ReactiveVar(
      (this._pageMap && this._pageMap.defaultPage) ? this._pageMap.defaultPage : ''
    );
    this._completeFn = opt_completeFn;
    this._errorFn = opt_errorFn;
  }

  get pageMap() { return this._pageMap || {}; }

  set doc(newDoc) { this._doc.set(newDoc); }

  get doc() { return this._doc.get(); }

  get currentPage() { return this._page.get() || this.defaultPage; }

  get defaultPage() { return this.pageMap.defaultPage; }

  get default() { console.log('WARN: MultiPageGorm.default is deprecated'); return this.pageMap.defaultPage; }

  get hasNextPage() { return !this.isLast; }

  get isLast() {return !this.currentDef.next; }

  get hasPrevPage() { return !this.isFirst; }

  get isFirst() {return !this.currentDef.prev; }

  nextPage() {
    if (this.hasNextPage) {
      var next;
      if (_(this.currentDef.next).isFunction()){
        var theThis = {
          pageMap: this.pageMap,
          doc: this.doc
        };
        next = this.currentDef.next.call(theThis);
      } else {
        next = this.currentDef.next;
      }
      this._page.set(next);
    }
  }

  prevPage() {
    if (this.hasPrevPage) {
      var prev;
      if (_(this.currentDef.prev).isFunction()) {
        var theThis = {
          pageMap: this.pageMap,
          doc: this.doc
        };
        prev = this.currentDef.prev.call(theThis);
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

  setOnCompleteFunction(fn) { this._completeFn = fn; }

  setOnErrorFunction(fn) {this._errorFn = fn; }

  get completeFn() {return this._completeFn;}

  get errorFn() {return this._errorFn;}

  autoFormHooks() {
    var mp = this;
    return {
      onSuccess: function(formType, result) {
        if (mp.hasNextPage) {
          mp.nextPage();
        } else {
          if (mp.completeFn) {
            mp.completeFn.call({}, mp.doc);
          }
          mp.reset();
        }
      },
      onError: function(formType, error) {
        if (mp.errorFn) {
          mp.errorFn.call({}, error, mp.doc);
        }
      },
      onSubmit: function(insertDoc, updateDoc, currentDoc) {
        check(insertDoc, mp.checkType);
        mp.doc[mp.currentPage] = insertDoc;
        this.done();
        return false;
      }
    }
  }
};

