// grab the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// create a schema
var Alert_MTSQASchema = new Schema({
  machineID : String,
  appname: String,
  data : { paramInfra : [ { paramName : String , paramType : String , value : String , flag : String} ],
		   paramCustom : [ { paramName : String , paramType : String , value : String , flag : String} ]
		},
  created_at: Date,
  updated_at: Date
});

// we need to create a model using it
var Alert_MTSQA = mongoose.model('Alert_MTSQA', Alert_MTSQASchema,'Alert_MTSQA');

// make this available to our users in our Node applications
module.exports = Alert_MTSQA;