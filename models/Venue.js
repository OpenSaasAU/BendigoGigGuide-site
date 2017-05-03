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
	website: Types.Url,
	isHiring: Boolean,
	description: { type: Types.Markdown },
	location: Types.Location
});


/**
 * Relationships
 * =============
 */

Venue.relationship({ ref: 'User', refPath: 'venue', path: 'members' });


/**
 * Registration
 * ============
 */

Venue.defaultColumns = 'name, website, isHiring';
Venue.register();
