var keystone = require('keystone');
var Types = keystone.Field.Types;

/**
 * RSVPs Model
 * ===========
 */

var RSVP = new keystone.List('RSVP');

RSVP.add({
	gig: { type: Types.Relationship, ref: 'Gig', required: true, initial: true, index: true },
	who: { type: Types.Relationship, ref: 'User', required: true, initial: true, index: true },
	attending: { type: Types.Boolean, index: true },
	createdAt: { type: Date, noedit: true, collapse: true, default: Date.now },
	changedAt: { type: Date, noedit: true, collapse: true }
});


/**
 * Hooks
 * =====
 */

RSVP.schema.pre('save', function(next) {
	if (!this.isModified('changedAt')) {
		this.changedAt = Date.now();
	}
	next();
});

RSVP.schema.post('save', function() {
	keystone.list('Gig').model.findById(this.gig, function(err, gig) {
		if (gig) gig.refreshRSVPs();
	});
});

RSVP.schema.post('remove', function() {
	keystone.list('Gig').model.findById(this.gig, function(err, gig) {
		if (gig) gig.refreshRSVPs();
	});
})


/**
 * Registration
 * ============
 */

RSVP.defaultColumns = 'gig, who, createdAt';
RSVP.defaultSort = '-createdAt';
RSVP.register();
