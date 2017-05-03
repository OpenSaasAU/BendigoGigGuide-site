var keystone = require('keystone'),
	async = require('async');

var Gig = keystone.list('Gig'),
	User = keystone.list('User');

exports = module.exports = function(req, res) {
	
	var view = new keystone.View(req, res),
		locals = res.locals;
	
	locals.section = 'tools';
	locals.nextGig = false;


	// Keep it secret, keep it safe

	if (!req.user || req.user && !req.user.isAdmin) {
		console.warn('===== ALERT =====');
		console.warn('===== A non-admin attempted to access the Notification Center =====');
		return res.redirect('/');
	}


	// Get all subscribers
	
	view.query('subscribers', User.model.find().where('notifications.gigs', true));

	
	// Get the next gig

	view.on('init', function(next) {
		Gig.model.findOne()
			.where('state', 'active')
			.sort('-startDate')
			.exec(function(err, gig) {
			
				if (err) {
					console.error("===== Error loading next gig =====");
					console.error(err);
					return next();
				} else if (!gig) {
					req.flash('warning', 'There isn\'t a "next" gig at the moment' );
					return next();
				} else {
					locals.nextGig = gig;
					next();
				}

			});
	});

	
	// Notify next gig attendees

	view.on('post', { action: 'notify.attendee' }, function(next) {
		if (!locals.nextGig) {
			req.flash('warning', 'There isn\'t a "next" gig at the moment' );
			return next();
		} else {
			locals.nextGig.notifyAttendees(req, res, function(err) {
				if (err) {
					req.flash('error', 'There was an error sending the notifications, please check the logs for more info.');
					console.error("===== Failed to send gig notification emails =====");
					console.error(err);
				} else {
					req.flash('success', 'Notification sent to ' + keystone.utils.plural(locals.nextGig.rsvps.length, '* attendee'));
				}
				next();
			});
		}
	});

	
	// Notify all SydJS subscribers

	view.on('post', { action: 'notify.subscriber' }, function(next) {
		if (!locals.subscribers) {
			req.flash('warning', 'There aren\'t any subscribers at the moment' );
			return next();
		} else {
			async.each(locals.subscribers, function(subscriber, doneSubscriber) {
				new keystone.Email('member-notification').send({
					subscriber: subscriber,
					subject: req.body.subscriber_email_subject || 'Notification from SydJS',
					content: req.body.subscriber_email_content,
					link_label: req.body.subscriber_email_link_label,
					link_url: req.body.subscriber_email_link_url,
					to: subscriber.email,
					from: {
						name: 'SydJS',
						email: 'hello@sydjs.com'
					}
				}, doneSubscriber);
			}, function(err) {
				if (err) {
					req.flash('error', 'There was an error sending the emails, please check the logs for more info.');
					console.error("===== Failed to send subscriber emails =====");
					console.error(err);
				} else {
					req.flash('success', 'Email sent to ' + keystone.utils.plural(locals.subscribers.length, '* subscriber'));
				}
				next();
			});
		}
	});

	
	// Populate the RSVPs for counting

	view.on('render', function(next) {
		if (locals.nextGig) {
			locals.nextGig.populateRelated('rsvps', next);
		} else {
			next();
		}
		
	});
	
	view.render('tools/notification-center');
	
}
