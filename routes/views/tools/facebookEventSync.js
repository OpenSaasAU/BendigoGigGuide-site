const eventSearch = require("facebook-events-by-location-core"),
    request = require("request"),
    keystone = require('keystone'),
    async = require('async');

const Gig = keystone.list('Gig'),
    User = keystone.list('User'),
    Venue = keystone.list('Venue'),
    Artist = keystone.list('Artist');

const credentials = {
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
                let jsonBody = JSON.parse(body);
                locals.fbAccessToken = jsonBody.access_token;
                next();
            };
        });
        
    });
    
    // Load Facebook events
    view.on('post', { action: 'getEvents' }, function(next){
        console.log("Req Body", req.body);
        let es = new eventSearch({
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
                                let event = JSON.parse(body);
                                let thisVenueId = '';
                                async.series([function(venueCallback){
                                    if (!event.place) return venueCallback();
                                    Venue.model.findOne()
                                        .where('facebookId', event.place.id)
                                        .exec(function (err, venue) {
                                            if (err) return venueCallback(err);
                                            if (!venue) {
                                                let thisVenueLocation = null;
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
                                                let newVenue = new Venue.model({
                                                    name: event.place.name,
                                                    location: thisVenueLocation,
                                                    state: 'facebookImport',
                                                    facebookId: event.place.id,
                                                    website: 'https://www.facebook.com/' + event.place.id
                                                }),
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
                                    let eventDescription = '<p>' + event.description + ' <br /> This event has been imported from facebook, would you like to edit this event? <a href="/join">Sign up</a> to start editing and to add new events.</a></p>';
                                    let newGig = new Gig.model({
                                            name: event.name,
                                            facebookId: event.id,
                                            description: eventDescription,
                                            state: 'facebookImport',
                                            startDate: event.start_time,
                                            endDate: event.end_time,
                                            venue: thisVenueId,
                                            gigUrl: 'https://www.facebook.com/events/' + event.id,
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
                        } else if (gig.userUpdated) {
                            console.log("Gig has been updated locally, not updating from facebook");
                            return callback();
                        } else {
                            request('https://graph.facebook.com/v2.9/' + rawEvent.id + '?access_token=' + locals.fbAccessToken, function (err, response, body) {
                                event = JSON.parse(body);
                                let updater = gig.getUpdateHandler(req, res, {
                                    errorMessage: 'There was an error updating your new Gig:'
                                });
                            let eventDescription = '<p>' + event.description + ' <br /> This event has been imported from facebook, would you like to edit this event? <a href="/join">Sign up</a> to start editing and to add new events.</a></p>';
                            let thisEvent = {
                                name: event.name,
                                description: eventDescription,
                                startDate: event.start_time,
                                endDate: event.end_time,
                                gigUrl: 'https://www.facebook.com/events/' + event.id
                            };
                            updater.process(thisEvent, {
                                flashErrors: true,
                                logErrors: true,
                                fields: 'name, description, startDate, endDate' 
                                }, function(err) {
                                if (err) {
                                    locals.validationErrors = err.errors;
                                    return callback(err);
                                } else {
                                    console.log('Gig updated: ', event.id)
                                    return callback();
                                }
                                });
                            });
                        }
                        })
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

    view.render('tools/facebookEventSync');
}
