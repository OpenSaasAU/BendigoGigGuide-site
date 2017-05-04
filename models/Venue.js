var keystone = require('keystone');
var Types = keystone.Field.Types;

/**
 * Venues Model
 * ===================
 */

var Venue = new keystone.List('Venue', {
	track: true,
	autokey: { path: 'key', from: 'name', unique: true }
});

Venue.add({
	name: { type: String, index: true },
	logo: { type: Types.CloudinaryImage },
    state: { type: Types.Select, options: 'draft, scheduled, active, past, rejected, facebookImport', noedit: true },
	website: Types.Url,
	isHiring: Boolean,
	description: { type: Types.Markdown },
    facebookId: { type: Types.Number, unique: true },
	location: Types.Location
});


/**
 * Relationships
 * =============
 */

Venue.relationship({ ref: 'User', refPath: 'venue', path: 'members' });
Venue.relationship({ ref: 'Gig', refPath: 'venue', path: 'gigs' });



/**
 * Registration
 * ============
 */

Venue.defaultColumns = 'name, website, isHiring';
Venue.register();
