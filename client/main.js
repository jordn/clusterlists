Meteor.startup(function() {
    Session.set('data_loaded', false); 
}); 

Deps.autorun(function () {
  if (Meteor.userId()) {
    // User is logged in
    if (Session.get("loggedIn") === false) {
      // User wasn't logged in before this updated, so fire the loggedIn event
      console.log('JUST LOGGED IN!!!!!!!!!!!!')
      if (typeof(Lists.findOne()) === "undefined") {
        console.log('Just logged in, no lists defined - updating lists')
        Meteor.call('UpdateLists');
      }
      if (typeof(Friends.findOne()) === "undefined") {
        console.log('Just logged in, no friends defined - updating friends')
        Meteor.call('UpdateFriends' , function(error, result) {
          if (result) {
            console.log('Just logged in, no friends defined, updated friends - refresh')
            Router.go('/');
          }
        }); 
      }
    }
    Session.set("loggedIn", true); // Now set the proper state
  } else {
    // There is no user logged in right now
    if (Session.get("loggedIn") === true) {
    Session.set("loggedIn", false) // Now set the proper state
  }
}
});

console.log('autorun subscribe');
ud = Meteor.subscribe('userData');
fd = Meteor.subscribe('friends');
ld = Meteor.subscribe('lists');
gd = Meteor.subscribe('groupMembers');
Meteor.subscribe('lists', function(){
 Session.set('data_loaded', true); 
});


// Google webfonts
WebFontConfig = {
google: { families: [ 'Source+Sans+Pro:300:latin' ] }
};
(function() {
var wf = document.createElement('script');
wf.src = ('https:' == document.location.protocol ? 'https' : 'http') +
  '://ajax.googleapis.com/ajax/libs/webfont/1/webfont.js';
wf.type = 'text/javascript';
wf.async = 'true';
var s = document.getElementsByTagName('script')[0];
s.parentNode.insertBefore(wf, s);
})();
//End webfonts


Template.manager.rendered = function() {
console.log('rendered'); // => this is printed out twice
console.log(Lists.find({}).count());
if(Meteor.user()) {
  console.log('lists, logged in');
  if(Session.get('data_loaded')){
    console.log('data_loaded');
    if (Friends.find().count() === 0) {
      console.log('no friends')
      Meteor.call('UpdateLists', 1, function (error, result) {});
      Meteor.call('UpdateFriends', 1, function (error, result) {});
    };
  }
}
};

Template.manager.events({
'click #refresh-lists': function (events) {
  console.log('Refreshing lists and their members')
  Meteor.call('UpdateLists', function (error, result) {
    // console.log(result)
  });
}
});

Template.lists.lists = function () {
if(Meteor.user()) {
    console.log('lists, logged in');
  if(Session.get('data_loaded')){
    console.log('lists, data loaded');
    Lists.find({});
    var lists = Lists.findOne();
    if (typeof(lists) === "undefined") {
      console.log('lists -- nothing defined');
      Meteor.call('UpdateLists', 1, function (error, result) {
        if (result) {
          var lists = Lists.findOne().lists;
          return _.map(lists, function(list) {
            console.log('lists -- mapping colors in render (lists werent defined before)');
            // document.styleSheets[0].addRule("."+list.slug, "background-color: "+ get_next_color() +"!important")
            document.styleSheets[0].insertRule("."+list.slug +" {background-color: "+ get_next_color() +" !important}", 0)
            return list;
          });
        }
      });
    }
    else {
      return _.map(lists.lists, function(list) {
        console.log('lists -- mapping colors in render (lists defined)');
        // document.styleSheets[0].addRule("."+list.slug, "background-color: "+ get_next_color() +"!important")
            document.styleSheets[0].insertRule("."+list.slug +" {background-color: "+ get_next_color() +" !important}", 0)
        return list;
      });
    }
  }
}
};


Template.lists.events({
'click #add-list': function (event) {
  event.preventDefault;
  var list_name = window.prompt("What would you like to call the list", "People I secretly fancy");
  if (list_name) {
    Meteor.call('AddList', list_name, function (error, result) {
      console.log(result);
    });
  }
}
});

Template.list.rendered = function () {
if(Meteor.user()) {
  console.log('lists for draggable, logged in');
  if ( Session.get('data_loaded') ) {

    $(".list").draggable({
      revert: function(valid_drop) {
        if (valid_drop) {
          $(this).hide();
          $(this).css("transform", "rotate(0deg)").css("webkit-transform", "rotate(0deg)").css("-ms-transform", "rotate(0deg)").css("left", 0).css("top", 0)
          $(this).show('400', 'linear');
          return false;
        } else {
          $(this).css("transform", "rotate(0deg)").css("-webkit-transform", "rotate(0deg)").css("-ms-transform", "rotate(0deg)");
          return true;
        }
      },
      revertDuration: 300,
      snap: ".user",
      snapMode: "inner",
      // helper: "clone",
      start: function( event, ui ) {
        console.log(event, ui);
        $(this).css('-transform', 'rotate(-7deg)').css('-webkit-transform', 'rotate(-7deg)').css('-ms-transform', 'rotate(-7deg)');
        $(".overlay span").html("Add to " + $(this).data('name'));
        var color = $.Color(this,'background-color').alpha(0.7);
        $(".overlay").css('background-color', color.toRgbaString());
      }
    });


   // $(".list").droppable({
   //    accept: "li.user",
   //    hoverClass: "ui-state-active",
   //    drop: function(event, ui){
   //      console.log(event, ui);

   //      $this = $(this);
   //      $draggable = ui.draggable;
   //      $memberships = $(draggable).find(".memberships").first();
   //      if ($memberships.find("." + $this.data('list')).length == 0) {
   //        var user_slug = $draggable.data("slug");
   //        var list_slug = $this.data("slug");
   //        var list_id = $this.data("id");
   //        console.log(user_slug);
   //        console.log(list_slug);
   //        $memberships.append($("<li class='" + list_slug + "'></li>").append("<img class='spinner' src='rotate-large.gif'> " + $draggable.text() ));
   //        Meteor.call("AddUserToList", user_slug, list_slug, list_id, function(err,result){});  
   //      }
   //    }
   //  });
   
  }
}
};

Template.friends.friends = function () {
if(Meteor.user()) {
  console.log('friends, logged in');
  if(Session.get('data_loaded')){
    var friends = Friends.findOne();
    if (typeof(friends) === "undefined") {
      console.log('friends -- nothing defined');
      Meteor.setTimeout(function() {
        var friends = Friends.findOne();
        if (typeof(friends) === "undefined") {
          Meteor.call('UpdateFriends', 1, function (error, result) {
            if (result) {
              return Friends.findOne().friends;
            };
          });
        } else {
          return Friends.findOne().friends;
        }
      }, 6000);
    } else {
      return friends.friends;
    }
  } else {
    return false;
  }
}
};

Template.friend.rendered = function () {
if(Meteor.user()) {
  if ( Session.get('data_loaded') ) {
    $("li.user").droppable({
      accept: ".list",
      hoverClass: "ui-state-active",
      drop: function(event, ui){
        console.log(event, ui);
        $this = $(this);
        $memberships = $(this).find(".memberships").first();
        $draggable = ui.draggable;
        if ($memberships.find("." + $draggable.data('list')).length == 0) {
          var user_slug = $this.data("slug");
          var list_slug = $draggable.data("slug");
          var list_id = $draggable.data("id");
          console.log(user_slug);
          console.log(list_slug);
          $memberships.append($("<li class='" + list_slug + "'></li>").append("<img class='spinner' src='rotate-large.gif'> " + $draggable.text() ));
          Meteor.call("AddUserToList", user_slug, list_slug, list_id, function(err,result){});  
        }
      }
    });

    // $("li.user").draggable({
    //   revert: function(valid_drop) {
    //     if (valid_drop) {
    //       $(this).hide();
    //       $(this).css("transform", "rotate(0deg)").css("webkit-transform", "rotate(0deg)").css("-ms-transform", "rotate(0deg)").css("left", 0).css("top", 0)
    //       $(this).show('400', 'linear');
    //       return false;
    //     } else {
    //       $(this).css("transform", "rotate(0deg)").css("-webkit-transform", "rotate(0deg)").css("-ms-transform", "rotate(0deg)");
    //       return true;
    //     }
    //   },
    //   revertDuration: 300,
    //   snap: ".list",
    //   snapMode: "inner",
    //   // helper: "clone",
    //   start: function( event, ui ) {
    //     // console.log(event, ui);
    //     $(this).css('-transform', 'rotate(-7deg)').css('-webkit-transform', 'rotate(-7deg)').css('-ms-transform', 'rotate(-7deg)');
    //     $(".overlay span").html("Add to " + $(this).data('name'));
    //     var color = $.Color(this,'background-color').alpha(0.7);
    //     $(".overlay").css('background-color', color.toRgbaString());
    //   }
    // });



  }; //end if loaded
}
};


Template.friends.events({
'click a.more': function (event) {
  // console.log(event.target)
  $(event.target).addClass('disabled');
  event.preventDefault;
  Meteor.call("UpdateFriends", function(err,result) {
    console.log(err);
    console.log(result);
    var next_cursor_friends = result.data.next_cursor;
    $(event.target).removeClass('disabled');
    // console.log(next_cursor_friends);
    // $('a.more').data('cursor', next_cursor_friends);
    // $('a.more').data('cursor')
  }); 
}
});


Template.friend.events({
'click a.remove': function (event) {
  console.log('clicked remove');
  event.preventDefault();      
  // console.log(event);
  // window.ev = event;
  // console.log(this);
  var parent_list = $(event.target.parentElement.parentElement)
  var list_slug = this.slug;
  var list_id = this.id;
  var user_slug = parent_list.data('user');
  parent_list.remove();
  Meteor.call("RemoveUserFromList", user_slug, list_id, function(err,result){
    // console.log(err);
    // console.log(result);
  });  
}
});


var color_index = -1;
var colors = ['#E67086', '#6ABCB0', '#8574A1', '#3BBA2F', '#0981A5', '#cc3b80', '#e18943']
function get_next_color() {
color_index = color_index + 1;
if (color_index >= colors.length) {
  return get_random_color();
}
return colors[color_index];
}


function get_random_color() {
var letters = '0123456789ABCDEF'.split('');
var color = '#';
for (var i = 0; i < 6; i++ ) {
  color += letters[Math.round(Math.random() * 15)];
}
return color;
}
