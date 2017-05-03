import {
	GraphQLBoolean,
	GraphQLSchema,
	GraphQLID,
	GraphQLInt,
	GraphQLList,
	GraphQLNonNull,
	GraphQLObjectType,
	GraphQLString,
	GraphQLEnumType,
} from 'graphql';

var keystoneTypes = require('./keystoneTypes');

var keystone = require('keystone');
var Gig = keystone.list('Gig');
var Artist = keystone.list('Artist');
var User = keystone.list('User');
var RSVP = keystone.list('RSVP');
var Venue = keystone.list('Venue');

function getGig (id) {
	if (id === 'next') {
		return Gig.model.findOne().sort('-startDate')
			.where('state', 'active').exec();
	} else if (id === 'last') {
		return Gig.model.findOne().sort('-startDate')
			.where('state', 'past').exec();
	} else {
		return Gig.model.findById(id).exec();
	}
}

var gigStateEnum = new GraphQLEnumType({
	name: 'GigState',
	description: 'The state of the gig',
	values: {
		draft: { description: "No published date, it's a draft gig" },
		scheduled: { description: "Publish date is before today, it's a scheduled gig" },
		active: { description: "Publish date is after today, it's an active gig" },
		past: { description: "Gig date plus one day is after today, it's a past gig" },
	},
});

var gigType = new GraphQLObjectType({
	name: 'Gig',
	fields: () => ({
		id: { type: new GraphQLNonNull(GraphQLID) },
		name: {
			type: new GraphQLNonNull(GraphQLString),
			description: 'The name of the gig.',
		},
		publishedDate: keystoneTypes.date(Gig.fields.publishedDate),
		state: { type: new GraphQLNonNull(gigStateEnum) },
		startDate: keystoneTypes.datetime(Gig.fields.startDate),
		endDate: keystoneTypes.datetime(Gig.fields.endDate),
		place: { type: GraphQLString },
		map: { type: GraphQLString },
		description: { type: GraphQLString },
		maxRSVPs: { type: new GraphQLNonNull(GraphQLInt) },
		totalRSVPs: { type: new GraphQLNonNull(GraphQLInt) },
		url: { type: GraphQLString },
		remainingRSVPs: { type: new GraphQLNonNull(GraphQLInt) },
		rsvpsAvailable: { type: new GraphQLNonNull(GraphQLBoolean) },
		artists: {
			type: new GraphQLList(artistType),
			resolve: (source, args) =>
				Artist.model.find().where('gig', source.id).exec(),
		},
		rsvps: {
			type: new GraphQLList(rsvpType),
			resolve: (source, args) =>
				RSVP.model.find().where('gig', source.id).exec(),
		},
	}),
});

var artistType = new GraphQLObjectType({
	name: 'Artist',
	fields: () => ({
		id: { type: new GraphQLNonNull(GraphQLID) },
		name: {
			type: new GraphQLNonNull(GraphQLString),
			description: 'The title of the artist.',
		},
		isLightningArtist: {
			type: GraphQLBoolean,
			description: 'Whether the artist is a Lightning artist',
		},
		gig: {
			type: gigType,
			description: 'The Gig the artist is scheduled for',
			resolve: (source, args, info) =>
				Gig.model.findById(source.gig).exec(),
		},
		who: {
			type: new GraphQLList(userType),
			description: 'A list of at least one User running the artist',
			resolve: (source, args, info) =>
				User.model.find().where('_id').in(source.who).exec(),
		},
		description: { type: GraphQLString },
		slides: {
			type: keystoneTypes.link,
			resolve: (source) => ({
				raw: source.slides,
				format: source._.slides.format,
			}),
		},
		link: {
			type: keystoneTypes.link,
			resolve: (source) => ({
				raw: source.link,
				format: source._.link.format,
			}),
		},
	}),
});

var userType = new GraphQLObjectType({
	name: 'User',
	fields: () => ({
		id: { type: new GraphQLNonNull(GraphQLID) },
		name: { type: new GraphQLNonNull(keystoneTypes.name) },
		// email: {
		// 	type: keystoneTypes.email,
		// 	resolve: (source) => ({
		// 		email: source.email,
		// 		gravatarUrl: source._.email.gravatarUrl,
		// 	}),
		// },
		artists: {
			type: new GraphQLList(artistType),
			resolve: (source, args) =>
				Artist.model.find().where('who', source.id).exec(),
		},
		rsvps: {
			type: new GraphQLList(rsvpType),
			resolve: (source, args) =>
				RSVP.model.find().where('who', source.id).exec(),
		},
	}),
});

var rsvpType = new GraphQLObjectType({
	name: 'RSVP',
	fields: {
		id: { type: new GraphQLNonNull(GraphQLID) },
		gig: {
			type: gigType,
			resolve: (source) => Gig.model.findById(source.gig).exec(),
		},
		who: {
			type: userType,
			resolve: (source) => User.model.findById(source.who).exec(),
		},
		attending: { type: GraphQLBoolean },
		createdAt: keystoneTypes.datetime(Gig.fields.createdAt),
		changedAt: keystoneTypes.datetime(Gig.fields.changedAt),
	},
});

var venueType = new GraphQLObjectType({
	name: 'Venue',
	fields: () => ({
		id: { type: new GraphQLNonNull(GraphQLID) },
		name: { type: GraphQLString },
		logo: { type: keystoneTypes.cloudinaryImage },
		website: { type: GraphQLString },
		isHiring: { type: GraphQLBoolean },
		description: { type: keystoneTypes.markdown },
		location: { type: keystoneTypes.location },
		members: {
			type: new GraphQLList(userType),
			resolve: (source, args) =>
				User.model.find().where('venue', source.id).exec(),
		},
	}),
});

var queryRootType = new GraphQLObjectType({
	name: 'Query',
	fields: {
		gigs: {
			type: new GraphQLList(gigType),
			resolve: (_, args) =>
				Gig.model.find().exec(),
		},
		gig: {
			type: gigType,
			args: {
				id: {
					description: 'id of the gig, can be "next" or "last"',
					type: new GraphQLNonNull(GraphQLID),
				},
			},
			resolve: (_, args) => getGig(args.id),
		},
		artists: {
			type: new GraphQLList(artistType),
			resolve: (_, args) =>
				Artist.model.find().exec(),
		},
		artist: {
			type: artistType,
			args: {
				id: {
					description: 'id of the artist',
					type: new GraphQLNonNull(GraphQLID),
				},
			},
			resolve: (_, args) => Artist.model.findById(args.id).exec(),
		},
		venue: {
			type: venueType,
			args: {
				id: {
					description: 'id of the venue',
					type: new GraphQLNonNull(GraphQLID),
				},
			},
			resolve: (_, args) => Venue.model.findById(args.id).exec(),
		},
		users: {
			type: new GraphQLList(userType),
			resolve: (_, args) =>
				User.model.find().exec(),
		},
		user: {
			type: userType,
			args: {
				id: {
					description: 'id of the user',
					type: new GraphQLNonNull(GraphQLID),
				},
			},
			resolve: (_, args) => User.model.findById(args.id).exec(),
		},
		rsvp: {
			type: rsvpType,
			args: {
				id: {
					description: 'id of the RSVP',
					type: new GraphQLNonNull(GraphQLID),
				},
			},
			resolve: (_, args) => RSVP.model.findById(args.id).exec(),
		},
	},
});

export default new GraphQLSchema({
	query: queryRootType,
});
