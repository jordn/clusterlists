Meteor.publish('userData', function() {
    if(!this.userId) return null;
    return Meteor.users.find(this.userId, {fields: {
        "services.twitter.screenName": 1,
        "services.twitter.profile_image_url": 1,
    }});
});

Meteor.publish("friends", function () {
  if(this.userId) {
      screen_name = Meteor.users.findOne(this.userId).services.twitter.screenName;
      return Friends.find({_id: screen_name});
  };
});

Meteor.publish("lists", function () {
  if(this.userId) {
      screen_name = Meteor.users.findOne(this.userId).services.twitter.screenName;
      return Lists.find({_id: screen_name});
  };
});

Meteor.publish("groupMembers", function () {
  if(this.userId) {
      screen_name = Meteor.users.findOne(this.userId).services.twitter.screenName;
      return GroupMembers.find({owner: screen_name});
  };
});