var twitterApi = new TwitterApi();

var next_cursor_friends = -1;

Meteor.methods({
  UpdateLists: function() {
    if(Meteor.user()) {
      var screenName = Meteor.user().services.twitter.screenName;
      console.log('########-> UPDATING LISTS for ' + screenName);
      var result = twitterApi.get('lists/ownerships.json', {screen_name: screenName, count: 20});
      // console.log(result);
      if (result.statusCode === 200) {
        var lists = JSON.parse(result.content).lists;
        // console.log(lists);
        Lists.upsert({_id: screenName}, {_id: screenName, lists: lists});
        _.each(lists, function(list) {
          // console.log('-----> Updating members of list: ' + list.slug);
          Meteor.call('UpdateGroupMembers', list);
        });
      }
      return result;
    } else {
      // console.log('not logged in');
      return false;
    };
  },

  UpdateFriends: function() {
    if(Meteor.user()) {
      var screenName = Meteor.user().services.twitter.screenName;
      console.log('########-> UPDATING FRIENDS for '+ screenName);
      var result = twitterApi.get('friends/list.json', {screen_name: screenName, count: 30, cursor: next_cursor_friends});
      // console.log(result)
      if (result.statusCode === 200) {
        var resultFriends = JSON.parse(result.content).users;
        // console.log(JSON.parse(result.content));
        next_cursor_friends = JSON.parse(result.content).next_cursor;
        if (next_cursor_friends === 0) {next_cursor_friends = -1;};
        // console.log('NEXT CURSOR: ' + next_cursor_friends);
        // console.log('friends found');
        // console.log(friends)
        var friendsCollection = Friends.findOne({_id: screenName});
        if (typeof(friendsCollection) === "undefined") {
          var allFriends = [];
        } else {
          var allFriends = friendsCollection.friends;
        }
        // var allFriends = friendsCollection.friends
        _.map(resultFriends, function(user) {
          user["profile_image_url"] = user["profile_image_url"].replace("_normal", "_bigger");
          // if not in friends collection add it
          if (!_.findWhere(allFriends, {screen_name: user.screen_name})) {
            // allFriends = allFriends.concat(resultFriends);
            allFriends.push(user) 
          }
          // console.log('UpdateMembershipsForUserObject  ' +  user.screen_name)
          user = Meteor.call('UpdateMembershipsForUserObject', user); // This calls friends update itself.
        })
        Friends.upsert({_id: screenName}, {_id: screenName, friends: allFriends})

      }
      return result;
    } else {
      // console.log('not logged in')
      return false;
    };
  },

  UpdateGroupMembers: function(group) {
    if(Meteor.user()) {
      var screenName = Meteor.user().services.twitter.screenName;
      if (typeof(group) === "string") {
        // console.log('String provided')
        group = _.findWhere(Lists.findOne({_id: screenName}).lists, {id_str: group});
      }
      var next_cursor_group_members = -1;
      console.log('Finding members of '+ group.name + ' list')
      var allGroupMembers = []
      while (next_cursor_group_members !== 0) {
        var result = twitterApi.get('lists/members.json', {list_id: group.id, cursor: next_cursor_group_members});
        // console.log('Polling twitter')
        // console.log(result)
        if (result.statusCode === 200) {
          var resultGroupMembers = JSON.parse(result.content).users
          next_cursor_group_members = JSON.parse(result.content).next_cursor;
          // console.log(next_cursor_group_members);
          allGroupMembers = allGroupMembers.concat(resultGroupMembers);
        }
      }
      upsertresult = GroupMembers.upsert({_id: group.id}, {_id: group.id, owner: screenName, slug: group.slug, name: group.name, members: allGroupMembers})
      // console.log("-----> Updating friend's memberships from list: " + group.slug)
      Meteor.call('UpdateMembershipsFromGroup', group.id_str);
      return result;
    } else {
      // console.log('not logged in')
      return false;
    };
  },

  UpdateMembershipsFromGroup: function(group) {
    if(Meteor.user()) {
      var screenName = Meteor.user().services.twitter.screenName;
      var friends = Friends.findOne({_id: screenName});
      if (typeof(friends) !== "undefined") {
        if (typeof(group) === "string") {
          // console.log('String provided')
          group = GroupMembers.findOne({owner: screenName, _id: parseInt(group)});
        }
        console.log('------> Updating Memberships in Friends given group '+ group.slug);
        // console.log(group.members)
        _.each(group.members, function(group_member) {
          // console.log('looking up ' + group_member.screen_name + ' in friends')
          var user = _.findWhere(friends.friends, {screen_name: group_member.screen_name});
          if (typeof(user) !== "undefined") {
            user.member_of || (user.member_of = []);
            if (_.findWhere(user.member_of, {slug: group.slug})) {
              // console.log('--> List ' + group.slug +' already attached to ' + user.screen_name)
            } else {
              user.member_of.push({_id: group._id, owner: group.owner, slug: group.slug, name: group.name});
              // console.log('--> Appended ' + group.slug +' to ' + user.screen_name)
            }
          } else {
            // console.log("--> Couldn't find " + group_member.screen_name +  " in friend list");
          }      
        });
        updateresponse = Friends.upsert({_id: screenName}, friends);
      } else {
        // console.log('no friends list (yet)')
        return false;
      }
    } else {
      // console.log('not logged in')
      return false;
    };
  },

  UpdateMembershipsForUser: function(user_slug) {
    if(Meteor.user()) {
      console.log('-----> Checking list memberships for '+ user_slug);
      var screenName = Meteor.user().services.twitter.screenName;
      var lists = Lists.findOne({_id: screenName}).lists;
      var friends = Friends.findOne({_id: screenName, "friends.screen_name": user_slug});
      // console.log(user_slug)
      // console.log(friends)
      if (typeof(friends) !== "undefined") {
        user = _.findWhere(friends.friends, {screen_name: user_slug});
        user.member_of = []
        _.each(lists, function(list) {  
          if (GroupMembers.findOne({_id: list.id, "members.screen_name": user.screen_name})) {
            // console.log(user.screen_name + ' is a member of ' + list.slug)
            // console.log(list)
            // console.log(user.member_of)
            user.member_of.push(list);
            // console.log(user.member_of)
          } else {
            // console.log('Not in ' + list.slug)
          };

        });
        updateresponse = Friends.update({_id: screenName}, friends);
        // console.log(updateresponse);  
      } else {
        // console.log('user not found in friends list')
        return false;
      };
    } else {
      // console.log('not logged in')
      return false;
    };
  },

  UpdateMembershipsForUserObject: function(user) {
    if(Meteor.user()) {
      var screenName = Meteor.user().services.twitter.screenName;
      var lists = Lists.findOne({_id: screenName}).lists;
      console.log('-----> Checking list memberships for USER '+ user.screen_name);
      user.member_of = []
      _.each(lists, function(list) {  
        if (GroupMembers.findOne({_id: list.id, "members.screen_name": user.screen_name})) {
          // console.log(user.screen_name + ' is a member of ' + list.slug)
          user.member_of.push(list);
        } else {
          // console.log('Not in ' + list.slug)
        };
      });
      return user;
    } else {
      // console.log('not logged in')
      return false;
    };
  },


  AddUserToList: function(user_slug, list_slug, list_id) {
    if(Meteor.user()) {
      var screenName = Meteor.user().services.twitter.screenName;
      console.log('Adding user '+ user_slug + ' to list ' + list_slug);
      result = twitterApi.post('lists/members/create.json', {
        list_id: list_id,
        screen_name: user_slug,
        owner_screen_name: screenName
      });
      // console.log(result);
      if (result.statusCode === 200) {
        // console.log("Successfully added to list");
        user = _.findWhere(Friends.findOne({_id: screenName}).friends, {screen_name: user_slug});
        groupMembers = GroupMembers.findOne({_id: parseInt(list_id)});
        // may cause duplicates, should check.
        groupMembers.members.push(user);
        GroupMembers.update(groupMembers._id, groupMembers);
        Meteor.call('UpdateMembershipsForUser', user_slug);
      };
    } else {
      // console.log('not logged in')
      return false;
    };
  },
  RemoveUserFromList: function(user_slug, list_id) {
    if(Meteor.user()) {
      var screenName = Meteor.user().services.twitter.screenName;
      var user = _.findWhere(Friends.findOne({_id: screenName}).friends, {screen_name: user_slug});
      var groupMembers = GroupMembers.findOne({_id: parseInt(list_id)});
      console.log('Removing user '+ user_slug + ' from list ' + groupMembers.slug);
      result = twitterApi.post('lists/members/destroy_all.json', {
        list_id: list_id,
        screen_name: user_slug,
        owner_screen_name: screenName
      });
      // console.log(result);
      if (result.statusCode === 200) {
        // console.log("Successfully removed from list");
        // may cause duplicates, should check.
        result = GroupMembers.update(groupMembers, { $pull: { members : {"screen_name": user_slug} } });
        // console.log(result);
        Meteor.call('UpdateMembershipsForUser', user_slug);
      };
    } else {
      // console.log('not logged in')
      return false;
    };
  },

  AddList: function(list_name) {
    if(Meteor.user()) {
      var screenName = Meteor.user().services.twitter.screenName;
      console.log('-----> Adding List \'' + list_name + '\' for ' + screenName);  
      result = twitterApi.post('lists/create.json', {
          name: list_name,
          // mode: 'public',
          description: "Created using @ClusterLists – Separate out voices from the noise ClusterLists.com"
        });
      // console.log(JSON.parse(result.content));
      if (result.statusCode === 200) {
        // console.log("Successfully added list");
        Meteor.call('UpdateLists');
      }
      return result;
    } else {
      // console.log('not logged in')
      return false;
    };
  },
  
  // RemoveAllFriends: function() {
  //   // console.log('REMOVING ALL FRIENDS');
  //   return Friends.remove({})
  // },
  // RemoveAllLists: function() {
  //   // console.log('REMOVING ALL LISTS');
  //   return Lists.remove({})
  // },
  // RemoveAllGroupMemberships: function() {
  //   // console.log('REMOVING ALL GROUP MEMBERSHIPS');
  //   return GroupMembers.remove({})
  // },
})