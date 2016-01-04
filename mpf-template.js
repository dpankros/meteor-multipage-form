Template.MultiPageForm.helpers({
  doc: function() {
    if(!this.multipage){
      console.log('WARN: Multipage is not defined in the this context.')
      return {};
    } else {
      return this.multipage.doc;
    }
  },
  pageTemplate: function() {
    if(!this.multipage){
      console.log('WARN: Multipage is not defined in the this context.')
      return '';
    } else {
      return this.multipage.template;
    }
  }
});