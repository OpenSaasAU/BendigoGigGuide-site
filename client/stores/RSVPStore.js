var _ = require('lodash');
var Store = require('store-prototype');
var request = require('superagent');

var RSVPStore = new Store();

var loaded = false;
var busy = false;
var gig = {};
var rsvp = {};
var attendees = [];

var REFRESH_INTERVAL = 5000; // 5 seconds

var refreshTimeout = null;
function cancelRefresh() {
	clearTimeout(refreshTimeout);
}

RSVPStore.extend({

	getGig: function() {
		return gig;
	},

	getRSVP: function() {
		return rsvp;
	},

	getAttendees: function(callback) {
		return attendees;
	},

	rsvp: function(attending, callback) {
		if (busy) return;
		cancelRefresh();
		busy = true;
		RSVPStore.notifyChange();
		request
			.post('/api/me/gig')
			.send({ data: {
				gig: SydJS.currentGigId,
				attending: attending
			}})
			.end(function(err, res) {
				if (err) {
					console.log('Error with the AJAX request: ', err)
					return;
				}
				RSVPStore.getGigData();
			});
	},

	isLoaded: function() {
		return loaded;
	},

	isBusy: function() {
		return busy;
	},

	getGigData: function(callback) {
		// ensure any scheduled refresh is stopped,
		// in case this was called directly
		cancelRefresh();
		// request the update from the API
		busy = true;
		request
			.get('/api/gig/' + SydJS.currentGigId)
			.end(function(err, res) {
				if (err) {
					console.log('Error with the AJAX request: ', err)
				}
				busy = false;
				if (!err && res.body) {
					loaded = true;
					gig = res.body.gig;
					rsvp = res.body.rsvp;
					attendees = res.body.attendees;
					RSVPStore.notifyChange();
				}
				RSVPStore.queueGigRefresh();
				return callback && callback(err, res.body);
			});
	},

	queueGigRefresh: function() {
		refreshTimeout = setTimeout(RSVPStore.getGigData, REFRESH_INTERVAL);
	}

});

RSVPStore.getGigData();
module.exports = RSVPStore;
