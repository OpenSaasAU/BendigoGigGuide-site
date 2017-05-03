var _ = require('lodash');
var keystone = require('keystone');
var moment = require('moment');
var Types = keystone.Field.Types;

/**
 * Gigs Model
 * =============
 */

var Gig = new keystone.List('Gig', {
	track: true,
	autokey: { path: 'key', from: 'name', unique: true }
});

Gig.add({
	name: { type: String, required: true, initial: true },
	publishedDate: { type: Types.Date, index: true },

	state: { type: Types.Select, options: 'draft, scheduled, active, past', noedit: true },

	startDate: { type: Types.Datetime, required: true, initial: true, index: true, width: 'short', note: 'e.g. 2014-07-15 / 6:00pm' },
	endDate: { type: Types.Datetime, required: true, initial: true, index: true, width: 'short', note: 'e.g. 2014-07-15 / 9:00pm' },

	place: { type: String, required: false, initial: true, width: 'medium', default: 'The Old Church on the Hill', note: 'Cnr Harkness and Russell St, Quarry Hill' },
	map: { type: String, required: false, initial: true, width: 'medium', default: 'The Old Church on the Hill', note: 'Cnr Harkness and Russell St, Quarry Hill' },
	description: { type: Types.Html, wysiwyg: true },

	maxRSVPs: { type: Number, default: 300 },
	totalRSVPs: { type: Number, noedit: true },

	legacy: { type: Boolean, noedit: true, collapse: true },
    artist: { type: Types.Relationship, ref: 'Artist', required: true, initial: true, index: true },
    venue: { type: Types.Relationship, ref: 'Venue', required: true, initial: true, index: true },
});




// Relationships
// ------------------------------

Gig.relationship({ ref: 'Artist', refPath: 'Gig', path: 'artists' });
Gig.relationship({ ref: 'RSVP', refPath: 'Gig', path: 'rsvps' });




// Virtuals
// ------------------------------

Gig.schema.virtual('url').get(function() {
	return '/gigs/' + this.key;
});

Gig.schema.virtual('remainingRSVPs').get(function() {
	if (!this.maxRSVPs) return -1;
	return Math.max(this.maxRSVPs - (this.totalRSVPs || 0), 0);
});

Gig.schema.virtual('rsvpsAvailable').get(function() {
	return (this.remainingRSVPs > 0);
});




// Pre Save
// ------------------------------

Gig.schema.pre('save', function(next) {
	var Gig = this;
	// no published date, it's a draft Gig
	if (!Gig.publishedDate) {
		Gig.state = 'draft';
	}
	// Gig date plus one day is after today, it's a past Gig
	else if (moment().isAfter(moment(Gig.startDate).add('day', 1))) {
		Gig.state = 'past';
	}
	// publish date is after today, it's an active Gig
	else if (moment().isAfter(Gig.publishedDate)) {
		Gig.state = 'active';
	}
	// publish date is before today, it's a scheduled Gig
	else if (moment().isBefore(moment(Gig.publishedDate))) {
		Gig.state = 'scheduled';
	}
	next();
});




// Methods
// ------------------------------

Gig.schema.methods.refreshRSVPs = function(callback) {
	var Gig = this;
	keystone.list('RSVP').model.count()
		.where('Gig').in([Gig.id])
		.where('attending', true)
		.exec(function(err, count) {
			if (err) return callback(err);
			Gig.totalRSVPs = count;
			Gig.save(callback);
		});
}

Gig.schema.methods.notifyAttendees = function(req, res, next) {
	var Gig = this;
	keystone.list('User').model.find().where('notifications.Gigs', true).exec(function(err, attendees) {
		if (err) return next(err);
		if (!attendees.length) {
			next();
		} else {
			attendees.forEach(function(attendee) {
				new keystone.Email('new-Gig').send({
					attendee: attendee,
					Gig: Gig,
					subject: 'New Gig: ' + Gig.name,
					to: attendee.email,
					from: {
						name: 'SydJS',
						email: 'hello@sydjs.com'
					}
				}, next);
			});
		}
	});
}

Gig.schema.set('toJSON', {
	transform: function(doc, rtn, options) {
		return _.pick(doc, '_id', 'name', 'startDate', 'endDate', 'place', 'map', 'description', 'rsvpsAvailable', 'remainingRSVPs');
	}
});


/**
 * Registration
 * ============
 */

Gig.defaultSort = '-startDate';
Gig.defaultColumns = 'name, state|10%, startDate|15%, publishedDate|15%';
Gig.register();
