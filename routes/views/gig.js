var keystone = require('keystone'),
	moment = require('moment'),
	Gig = keystone.list('Gig'),
	RSVP = keystone.list('RSVP');

exports = module.exports = function(req, res) {
	
	var view = new keystone.View(req, res),
		locals = res.locals;
	
	locals.section = 'gigs';
	locals.page.title = 'Gigs - Bendigo Gig Guide';
	
	locals.rsvpStatus = {};
	
	
	// LOAD the Gig
	
	view.on('init', function(next) {
		Gig.model.findOne()
			.where('key', req.params.gig)
			.exec(function(err, gig) {
				
				if (err) return res.err(err);
				if (!gig) return res.notfound('Post not found');
				
				locals.gig = gig;
				locals.gig.populateRelated('talks[who] rsvps[who]', next);
				
			});
	});
	
	
	// LOAD an RSVP
	
	view.on('init', function(next) {
	
		if (!req.user || !locals.gig) return next();
		
		RSVP.model.findOne()
			.where('who', req.user._id)
			.where('gig', locals.gig)
			.exec(function(err, rsvp) {
				locals.rsvpStatus = {
					rsvped: rsvp ? true : false,
					attending: rsvp && rsvp.attending ? true : false
				}
				return next();
			});
			
	});
	
	
	view.render('site/gig');
	
}
