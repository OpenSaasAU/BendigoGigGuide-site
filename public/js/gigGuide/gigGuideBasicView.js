$(document).ready(function() {
	var url = '/api/gigs';	
    $.ajax({ 
        url: url, 
        type: 'GET',
        datatype: 'application/json; charset=UTF-8',
        data: { }, 
        error: function(request, error) {
            console.log(arguments);
            alert('there was an error while fetching events! ' + url + error);
        } 
    }).done(function (doc) { 
            var event = Array();
            //var data = $.parseJSON(doc);
            $.each(doc.gigs, function(i, entry){
                    event.push({
                        title: entry.name, 
                        start: entry.startDate,
                        end: entry.endDate,
                        description: entry.description,
                        dow: entry.dow,
                        url: entry.gigUrl,
                        location: entry.venue.name,
                        cost: entry.cost
                    });
                });
		$('#calendar').fullCalendar({
			header: {
				left: 'prev,next today',
				center: 'title',
				right: 'month,basicWeek,basicDay'
			},
			//defaultDate: '2017-02-12',
            timezone: 'local',
			navLinks: true, // can click day/week names to navigate views
			editable: false,
			eventLimit: true, // allow "more" link when too many events
            events: event,
            eventClick: function(event) {
                if (event.url) {
                    window.open(event.url);
                    return false;
                }
            },
            eventRender: function(event, element){
                element.qtip({
                    content: "<h2>" + event.title + "</h2>" + event.description + "<h2>Location:</h2>" + event.location + "<h2>Cost:</h2>" + event.cost + "<h2>Web Link:</h2><a href=" + event.url + " target=_blank>" + event.url + "</a>",
                    hide: {
                        fixed:true,
                        delay: 300
                    }
                });
        }
		});
    });
    })
