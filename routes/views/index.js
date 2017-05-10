var keystone = require('keystone'),
	moment = require('moment')

var Gig = keystone.list('Gig'),
	Post = keystone.list('Post'),
	RSVP = keystone.list('RSVP');

exports = module.exports = function(req, res) {
	
	var view = new keystone.View(req, res),
		locals = res.locals;
	
	locals.section = 'home';
	locals.gig = {};
	locals.page.title = 'Bendigo Gig Guide';
	
	locals.rsvpStatus = {};

	locals.user = req.user;
	
	// Load the first, NEXT gig
	
	view.on('init', function(next) {
		Gig.model.findOne()
			.where('state', 'active')
			.sort('-startDate')
			.exec(function(err, activeGig) {
				locals.activeGig = activeGig;
				next();
			});
			
	});
	
	
	// Load the first, PAST gig
	
	view.on('init', function(next) {
		Gig.model.findOne()
			.where('state', 'past')
			.sort('-startDate')
			.exec(function(err, pastGig) {
				locals.pastGig = pastGig;
				next();
			});
			
	});
	
	
	// Load an RSVP
	
	view.on('init', function(next) {

		if (!req.user || !locals.activeGig) return next();
		
		RSVP.model.findOne()
			.where('who', req.user._id)
			.where('gig', locals.activeGig)
			.exec(function(err, rsvp) {
				locals.rsvpStatus = {
					rsvped: rsvp ? true : false,
					attending: rsvp && rsvp.attending ? true : false
				}
				return next();
			});
			
	});
	
	// Decide which to render
	
	view.on('render', function(next) {
		
		locals.gig = locals.activeGig || locals.pastGig;
		if (locals.gig) {
			locals.gig.populateRelated('artists[who] rsvps[who]', next);
		} else {
			next();
		}
		
	});
	
	view.render('site/index');
	
}
