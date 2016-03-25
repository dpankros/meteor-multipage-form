var findInParentData = function findInParentData(ctx, name){
  var ndx = 1;
  var data = Template.parentData(ndx);

  while(data){
    if(data.hasOwnProperty(name)){
      return data[name];
    }
    ndx++;
    data = Template.parentData(ndx);
  }
  return undefined;
}

Template.MultiPageForm.helpers({
  doc: function() {
    if(this.multipage){
      return this.multipage.doc;
    } else {
      return {};
    }
  },
  pageTemplate: function() {
    if(this.multipage){
      return this.multipage.template;
    } else {
      return '';
    }
  }
});

Template.mpfButtons.helpers({
  mp: function() {
    var multipage = findInParentData(this, 'multipage');
    if(multipage) {
      return multipage;
    } else {
      return {};
    }
  },
  hasPrev:function(){
    var multipage = findInParentData(this, 'multipage');
    if(multipage){
      return multipage.hasPrevPage;
    } else {
      return false;
    }
  },
  isLast: function(){
    var multipage = findInParentData(this, 'multipage');
    if(multipage) {
      return multipage.isLast;
    } else {
      return false;
    }
  }
});

Template.mpfButtons.events({
    //goes to the previous page and skips validation
    'click .mp-prev': function(e) {
      var multipage = findInParentData(this, 'multipage');
      if(multipage){
        multipage.prevPage();
      } else {
        return false;
      }
    },
    //goes to the next page and SKIPS validation.  Use a submit button to validate
    'click .mp-next': function(e) {
      var multipage = findInParentData(this, 'multipage');
      if(multipage){
        multipage.nextPage();
      }
    }
  }
);