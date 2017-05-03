var keystone = require('keystone'),
	moment = require('moment'),
	RSVP = keystone.list('RSVP');

var Gig = keystone.list('Gig');

exports = module.exports = function(req, res) {
	
	var view = new keystone.View(req, res),
		locals = res.locals;
	
	locals.section = 'gigs';
	locals.page.title = 'Gigs - SydJS';
	
	view.query('upcomingGig',
		Gig.model.findOne()
			.where('state', 'active')
			.sort('-startDate')
	, 'talks[who]');
	
	view.query('pastGigs',
		Gig.model.find()
			.where('state', 'past')
			.sort('-startDate')
	, 'talks[who]');
	
	view.on('render', function(next) {
	
		if (!req.user || !locals.upcomingGig) return next();
		
		RSVP.model.findOne()
			.where('who', req.user._id)
			.where('gig', locals.upcomingGig)
			.exec(function(err, rsvp) {
				locals.rsvpStatus = {
					rsvped: rsvp ? true : false,
					attending: rsvp && rsvp.attending ? true : false
				}
				return next();
			});
			
	});
	
	view.render('site/gigs');
	
}
