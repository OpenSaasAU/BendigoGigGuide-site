const _ = require('lodash'),
    async = require('async'),
    keystone = require('keystone'),
    Gig = keystone.list('Gig'),
    Venue = keystone.list('Venue');


exports = module.exports = function(req, res) {
    
    var rtn = {
        gigs: []
    };

    async.series([

        function(next) {
            
            keystone.list('Gig').model.find()
                .where('state', 'active')
                .sort('-startDate')
                .populate('venue')
                .exec(function(err, gigs) {
                if (err) {
                    console.log('Error finding gig: ', err)
                }
                //console.log('gig: ', gigs);
                rtn.gigs = gigs;
                
                
                return next();
            });
        },
        

        function(next) {
        // get the venue location
            async.eachOf(rtn.gigs, function(gig, key, callback){
                rtn.gigs[key].venueName = gig.venue.name;
                rtn.gigs[key].venueLocation = gig.venue.location;
               callback();
            }, function(err){
                next(err);
            });
            
        },

    ], function(err) {
        if (err) {
            rtn.err = err;
        }
        res.apiResponse(rtn);
    });
}
