var bcrypt = require('bcrypt-nodejs');

var mongoose = require('mongoose');
var Animal = mongoose.model('Animal');

module.exports = function (mongoose) {
	var logSchema = mongoose.Schema({
		userId: String,
		userFullName: String,
		action: String,
		time: Date,
		animal1: Object,
		animal2: Object
	});

	var Log = mongoose.model("Log", logSchema);
	return Log;
}