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

import {
	fromGlobalId,
	globalIdField,
	nodeDefinitions,
	connectionDefinitions,
	connectionFromPromisedArray,
	connectionArgs,
} from 'graphql-relay';

var keystoneTypes = require('./keystoneTypes');

var keystone = require('keystone');
var Gig = keystone.list('Gig');
var Artist = keystone.list('Artist');
var User = keystone.list('User');
var RSVP = keystone.list('RSVP');
var Venue = keystone.list('Venue');

var {nodeInterface, nodeField} = nodeDefinitions(
	(globalId) => {
		var {type, id} = fromGlobalId(globalId);

		switch (type) {
		case 'Gig':
			return Gig.model.findById(id).exec();
		case 'Artist':
			return Artist.model.findById(id).exec();
		case 'User':
			return User.model.findById(id).exec();
		case 'RSVP':
			return RSVP.model.findById(id).exec();
		case 'Venue':
			return Venue.model.findById(id).exec();
		default:
			return null;
		}
	},
	(obj) => {
		if (obj instanceof Gig.model) {
			return gigType;
		} else if (obj instanceof Artist.model) {
			return artistType;
		} else if (obj instanceof User.model) {
			return userType;
		} else if (obj instanceof RSVP.model) {
			return rsvpType;
		} else if (obj instanceof Venue.model) {
			return venueType;
		}
		return null;
	}
);

var gigStateEnum = new GraphQLEnumType({
	name: 'GigState',
	description: 'The state of the gig',
	values: {
		draft: {
			description: "No published date, it's a draft gig",
		},
		scheduled: {
			description: "Publish date is before today, it's a scheduled gig",
		},
		active: {
			description: "Publish date is after today, it's an active gig",
		},
		past: {
			description: "Gig date plus one day is after today, it's a past gig",
		},
	},
});

var gigType = new GraphQLObjectType({
	name: 'Gig',
	fields: () => ({
		// TODO when the new version of `graphql-relay` comes out it
		// will not need the typeName String 'Gig' because it will call
		// `info.parentType.name` inside the `globalIdField` function
		id: globalIdField('Gig'),
		name: {
			type: new GraphQLNonNull(GraphQLString),
			description: 'The name of the gig.',
		},
		publishedDate: keystoneTypes.date(Gig.fields.publishedDate),
		state: {
			type: new GraphQLNonNull(gigStateEnum),
		},
		startDate: keystoneTypes.datetime(Gig.fields.startDate),
		endDate: keystoneTypes.datetime(Gig.fields.endDate),
		place: {
			type: GraphQLString,
		},
		map: {
			type: GraphQLString,
		},
		description: {
			type: GraphQLString,
		},
		maxRSVPs: {
			type: new GraphQLNonNull(GraphQLInt),
		},
		totalRSVPs: {
			type: new GraphQLNonNull(GraphQLInt),
		},
		url: {
			type: new GraphQLNonNull(GraphQLString),
		},
		remainingRSVPs: {
			type: new GraphQLNonNull(GraphQLInt),
		},
		rsvpsAvailable: {
			type: new GraphQLNonNull(GraphQLBoolean),
		},
		artists: {
			type: artistConnection,
			args: connectionArgs,
			resolve: ({id}, args) => connectionFromPromisedArray(
				Artist.model.find().where('gig', id).exec(),
				args
			),
		},
		rsvps: {
			type: rsvpConnection,
			args: connectionArgs,
			resolve: ({id}, args) => connectionFromPromisedArray(
				RSVP.model.find().where('gig', id).exec(),
				args
			),
		},
	}),
	interfaces: [nodeInterface],
});

var artistType = new GraphQLObjectType({
	name: 'Artist',
	fields: () => ({
		id: globalIdField('Artist'),
		name: {
			type: new GraphQLNonNull(GraphQLString),
			description: 'The title of the artist.',
		},
		isLightningArtist: {
			type: GraphQLBoolean,
			description: 'Whether the artist is a Lightning artist',
		},
		gig: {
			type: new GraphQLNonNull(gigType),
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
		description: {
			type: GraphQLString,
		},
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
	interfaces: [nodeInterface],
});

var userType = new GraphQLObjectType({
	name: 'User',
	fields: () => ({
		id: globalIdField('User'),
		name: {
			type: new GraphQLNonNull(keystoneTypes.name),
		},
		// email: {
		// 	type: keystoneTypes.email,
		// 	resolve: (source) => ({
		// 		email: source.email,
		// 		gravatarUrl: source._.email.gravatarUrl,
		// 	}),
		// },
		artists: {
			type: artistConnection,
			args: connectionArgs,
			resolve: ({id}, args) => connectionFromPromisedArray(
				Artist.model.find().where('who', id).exec(),
				args
			),
		},
		rsvps: {
			type: rsvpConnection,
			args: connectionArgs,
			resolve: ({id}, args) => connectionFromPromisedArray(
				RSVP.model.find().where('who', id).exec(),
				args
			),
		},
	}),
	interfaces: [nodeInterface],
});

var rsvpType = new GraphQLObjectType({
	name: 'RSVP',
	fields: {
		id: globalIdField('RSVP'),
		gig: {
			type: new GraphQLNonNull(gigType),
			resolve: (source) => Gig.model.findById(source.gig).exec(),
		},
		who: {
			type: new GraphQLNonNull(userType),
			resolve: (source) => User.model.findById(source.who).exec(),
		},
		attending: { type: GraphQLBoolean },
		createdAt: keystoneTypes.datetime(Gig.fields.createdAt),
		changedAt: keystoneTypes.datetime(Gig.fields.changedAt),
	},
	interfaces: [nodeInterface],
});

var venueType = new GraphQLObjectType({
	name: 'Venue',
	fields: () => ({
		id: globalIdField('Venue'),
		name: { type: GraphQLString },
		logo: { type: keystoneTypes.cloudinaryImage },
		website: { type: GraphQLString },
		isHiring: { type: GraphQLBoolean },
		description: { type: keystoneTypes.markdown },
		location: { type: keystoneTypes.location },
		members: {
			type: userConnection,
			args: connectionArgs,
			resolve: ({id}, args) => connectionFromPromisedArray(
				User.model.find().where('venue', id).exec(),
				args
			),
		},
	}),
	interfaces: [nodeInterface],
});

var {
	connectionType: gigConnection,
} = connectionDefinitions({
	name: 'Gig',
	nodeType: gigType,
});
var {
	connectionType: artistConnection,
} = connectionDefinitions({
	name: 'Artist',
	nodeType: artistType,
});
var {
	connectionType: userConnection,
} = connectionDefinitions({
	name: 'User',
	nodeType: userType,
});
var {
	connectionType: rsvpConnection,
} = connectionDefinitions({
	name: 'RSVP',
	nodeType: rsvpType,
});
var {
	connectionType: venueConnection,
} = connectionDefinitions({
	name: 'Venue',
	nodeType: venueType,
});

function modelFieldById (objectType, keystoneModel) {
	const modelIDField = `${objectType.name.toLowerCase()}ID`;
	return {
		type: objectType,
		args: {
			id: {
				description: `global ID of the ${objectType.name}`,
				type: GraphQLID,
			},
			[modelIDField]: {
				description: `MongoDB ID of the ${objectType.name}`,
				type: GraphQLID,
			},
		},
		resolve: (_, args) => {
			if (args[modelIDField] !== undefined && args[modelIDField] !== null) {
				return keystoneModel.model.findById(args[modelIDField]).exec();
			}

			if (args.id !== undefined && args.id !== null) {
				var {id: mongoID} = fromGlobalId(args.id);
				if (mongoID === null || mongoID === undefined ||
						mongoID === '') {
					throw new Error(`No valid ID extracted from ${args.id}`);
				}

				return keystoneModel.model.findById(mongoID).exec();
			}

			throw new Error('Must provide at least one argument');
		},
	};
}

var queryRootType = new GraphQLObjectType({
	name: 'Query',
	fields: {
		node: nodeField,
		gig: modelFieldById(gigType, Gig),
		allGigs: {
			type: gigConnection,
			args: {
				state: {
					type: gigStateEnum,
				},
				...connectionArgs,
			},
			resolve: (_, {state, ...args}) => connectionFromPromisedArray(
				state ? Gig.model.find().where('state', state).exec()
					: Gig.model.find().exec(),
				args
			),
		},
		artist: modelFieldById(artistType, Artist),
		allArtists: {
			type: artistConnection,
			args: connectionArgs,
			resolve: (_, args) => connectionFromPromisedArray(
				Artist.model.find().exec(),
				args
			),
		},
		venue: modelFieldById(venueType, Venue),
		allVenues: {
			type: venueConnection,
			args: connectionArgs,
			resolve: (_, args) => connectionFromPromisedArray(
				Venue.model.find().exec(),
				args
			),
		},
		user: modelFieldById(userType, User),
		allUsers: {
			type: userConnection,
			args: connectionArgs,
			resolve: (_, args) => connectionFromPromisedArray(
				User.model.find().exec(),
				args
			),
		},
		RSVP: modelFieldById(rsvpType, RSVP),
		allRSVPs: {
			type: rsvpConnection,
			args: connectionArgs,
			resolve: (_, args) => connectionFromPromisedArray(
				RSVP.model.find().exec(),
				args
			),
		},
	},
});

export default new GraphQLSchema({
	query: queryRootType,
});
