var mongoose = require('mongoose');
db = mongoose.connect('mongodb://localhost:27017/cfg');
module.exports = db; 