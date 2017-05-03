var keystone = require('keystone');

var Venue = keystone.list('Venue');

exports = module.exports = function(req, res) {
	
	var view = new keystone.View(req, res),
		locals = res.locals;
	
	// locals.section = 'members';
	
	view.query('venues', Venue.model.find().sort('name'), 'members');
	
	view.render('site/venues');
	
}
