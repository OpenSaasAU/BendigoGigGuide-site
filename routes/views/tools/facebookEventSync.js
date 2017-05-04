var eventSearch = require("facebook-events-by-location-core"), 
    request = require("request"),
    keystone = require('keystone'),
	async = require('async');

var Gig = keystone.list('Gig'),
    User = keystone.list('User'),
    Venue = keystone.list('Venue'),
    Artist = keystone.list('Artist');

var credentials = {
    clientID: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET
};

exports = module.exports = function(req, res) {

    var view = new keystone.View(req, res),
        locals = res.locals;

    locals.section = 'gigs';
    locals.page.title = 'Gigs - Bendigo Gig Guide';

    locals.data = {
        events: [],
        categories: []
    };
    
    // Get Facebook Access Token on page load
    view.on('init', function(next){
        request('https://graph.facebook.com/oauth/access_token?client_id=' + credentials.clientID + '&client_secret=' + credentials.clientSecret + '&grant_type=client_credentials', function (err, response, body) {
            if (err) {
                console.log('Facebook Access Token error:', err);
                next(err);
            } else {
                var jsonBody = JSON.parse(body);
                locals.fbAccessToken = jsonBody.access_token;
                next();
            };
        });
        
    });
    
    // Load Facebook events
    view.on('post', { action: 'getEvents' }, function(next){
        console.log("Req Body", req.body);
        var es = new eventSearch({
            "lat": req.body.lat,
            "lng": req.body.lng,
            "distance": req.body.distance,
            "accessToken": locals.fbAccessToken
        });
        es.search().then(function (events) {
            //console.log(JSON.stringify(events));
            //console.log("event Data: ", events.events[0]);
            async.forEachOfSeries(events.events, function (rawEvent, num, callback) {
                Gig.model.findOne()
                    .where('facebookId', rawEvent.id)
                    .exec(function (err, gig) {

                        if (err) return callback(err);
                        if (!gig) {
                            request('https://graph.facebook.com/v2.9/' + rawEvent.id + '?access_token=' + locals.fbAccessToken, function (err, response, body) {
                                event = JSON.parse(body);
                                var thisVenueId = '';
                                async.series([function(venueCallback){
                                    Venue.model.findOne()
                                        .where('facebookId', event.place.id)
                                        .exec(function (err, venue) {
                                            if (err) return venueCallback(err);
                                            if (!venue) {
                                                var thisVenueLocation = null;
                                                if (event.place.location){
                                                    thisVenueLocation = {
                                                        name: event.place.name,
                                                        street1: event.place.location.street,
                                                        suburb: event.place.location.city,
                                                        state: event.place.location.state,
                                                        postcode: event.place.location.zip,
                                                        geo: [ event.place.location.longitude, event.place.location.latitude ],
                                                        country: event.place.location.country
                                                    };
                                                }
                                                var newVenue = new Venue.model({
                                                    name: event.place.name,
                                                    location: thisVenueLocation,
                                                    state: 'facebookImport',
                                                    facebookId: event.place.id
                                                });
                                                updater = newVenue.getUpdateHandler(req, res, {
                                                    errorMessage: 'There was an error creating your new Venue:'
                                                });
                                                updater.process(event.place, {
                                                    flashErrors: true,
                                                    logErrors: true,
                                                    fields: 'name, location'
                                                }, function (err) {
                                                    if (err) {
                                                        locals.validationErrors = err.errors;
                                                        return venueCallback(err);
                                                    } else {
                                                        console.log('New Venue Created: ', event.place.id)
                                                        console.log('Venue ID: ', thisVenueId);
                                                        return venueCallback(newVenue.id);
                                                    }
                                                });
                                            } else {
                                                console.log("Venue Exists in Database: ", venue.facebookId);
                                                return venueCallback(venue.id)
                                            }
                                        });
                                }], function(thisVenueId){
                                    var eventDescription = '<p>' + event.description + '</p>';
                                    var newGig = new Gig.model({
                                            name: event.name,
                                            facebookId: event.id,
                                            description: eventDescription,
                                            state: 'facebookImport',
                                            startDate: event.start_time,
                                            endDate: event.end_time,
                                            venue: thisVenueId,
                                            fbCategory: event.category
                                        }),
                                        updater = newGig.getUpdateHandler(req, res, {
                                            errorMessage: 'There was an error creating your new Gig:'
                                        });
                                    updater.process(event, {
                                        flashErrors: true,
                                        logErrors: true,
                                        fields: 'name, description'
                                    }, function (err) {
                                        if (err) {
                                            locals.validationErrors = err.errors;
                                            return callback(err);
                                        } else {
                                            console.log('New Gig Created: ', event.id)
                                            return callback();
                                        }
                                    });
                                });
                                
                            });
                        } else {
                            console.log("Gig Exists in Database: ", gig.facebookId);
                            return callback();
                        }

                    });
            }, function(err){
                if (err){
                    req.flash('error', "Events Sync Errors" + JSON.stringify(err));
                    return next(err);
                } else {
                    req.flash('success', "Events Sync Complete");
                    next();
                }
                
            });
        }).catch(function (error) {
            console.error("Facebook Events Error: ", error);
            next(error);
        });
    });

    view.render('tools/facebookEventSync')
}
