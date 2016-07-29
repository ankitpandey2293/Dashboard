// grab the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// create a schema
var applicationReferenceSchema = new Schema({
  machineID : [ String ],
  appname: String,
  data : { paramInfra : [ { paramName : String , paramType : String , value : String } ],
		   paramCustom : [ { paramName : String , paramType : String , value : String , frequency : String , startTime : String , endTime : String } ]
		},
  created_at: Date,
  updated_at: Date
});

applicationReferenceSchema.pre('save', function(next) {
  // get the current date
  var currentDate = new Date();
  
  // change the updated_at field to current date
  this.updated_at = currentDate;

  // if created_at doesn't exist, add to that field
  if (!this.created_at)
    this.created_at = currentDate;

  next();
});

// we need to create a model using it
var applicationReference = mongoose.model('applicationReference', applicationReferenceSchema,'applicationReference');

// make this available to our users in our Node applications
module.exports = applicationReference;