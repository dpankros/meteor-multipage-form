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
    if(!this.multipage){
      console.log('WARN: Multipage is not defined in the this context. A MultiPageForm variable must be passed into the multipage attribute.')
      return {};
    } else {
      return this.multipage.doc;
    }
  },
  pageTemplate: function() {
    if(!this.multipage){
      console.log('WARN: Multipage is not defined in the this context. A MultiPageForm variable must be passed into the multipage attribute.')
      return '';
    } else {
      return this.multipage.template;
    }
  }
});

Template.mpfButtons.helpers({
  mp: function() {
    var multipage = findInParentData(this, 'multipage');
    if(!multipage){
      console.log('WARN: Multipage is not defined in the this context. mpfButtons must appear only within a MultiPageForm.')
      return {};
    }
    return multipage;
  },
  hasPrev:function(){
    var multipage = findInParentData(this, 'multipage');
    if(!multipage){
      console.log('WARN: Multipage is not defined in the this context. mpfButtons must appear only within a MultiPageForm.')
      return false;
    }
    return multipage.hasPrevPage;
  },
  isLast: function(){
    var multipage = findInParentData(this, 'multipage');
    if(!multipage){
      console.log('WARN: Multipage is not defined in the this context. mpfButtons must appear only within a MultiPageForm.')
      return false;
    }
    return multipage.isLast;
  }
});

Template.mpfButtons.events({
    //goes to the previous page and skips validation
    'click .mp-prev': function(e) {
      var multipage = findInParentData(this, 'multipage');
      if(!multipage){
        console.log('WARN: Multipage is not defined in the this context. mpfButtons must appear only within a MultiPageForm.')
        return false;
      } else {
        multipage.prevPage();
      }
    },
    //goes to the next page and SKIPS validation.  Use a submit button to validate
    'click .mp-next': function(e) {
      var multipage = findInParentData(this, 'multipage');
      if(!multipage){
        console.log('WARN: Multipage is not defined in the this context. mpfButtons must appear only within a MultiPageForm.')
      } else {
        multipage.nextPage();
      }
    }
  }
);