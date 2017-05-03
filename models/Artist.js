var _ = require('lodash');
var keystone = require('keystone');
var Types = keystone.Field.Types;

/**
 * Artists Model
 * ===========
 */

var Artist = new keystone.List('Artist', {
	track: true,
	sortable: true,
	sortContext: 'Gig:Artists'
});

Artist.add({
	name: { type: String, required: true, initial: true },
	isLightningArtist: { type: Boolean },
	gig: { type: Types.Relationship, ref: 'Gig', required: true, initial: true, index: true },
	who: { type: Types.Relationship, ref: 'User', many: true, index: true },
	description: { type: Types.Html, wysiwyg: true },
	slides: { type: Types.Url },
	link: { type: Types.Url }
});

Artist.schema.set('toJSON', {
	virtuals: true,
	transform: function(doc, rtn, options) {
		rtn = _.pick(rtn, '_id', 'name', 'place', 'map', 'description', 'slides', 'link');
		if (doc.who) {
			rtn.who = doc.who.map(function(i) {
				return {
					name: i.name,
					twitter: i.twitter,
					avatarUrl: i.avatarUrl
				}
			});
		}
		return rtn;
	}
});

/**
 * Registration
 * ============
 */

Artist.defaultColumns = 'name, gig|20%, who|20%';
Artist.register();
