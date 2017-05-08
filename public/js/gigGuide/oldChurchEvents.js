$(document).ready(function() {
	var url = '/assets/eventData/oldChurchRegularEvents.json';	
    $.ajax({ 
        url: url, 
        type: 'GET',
        datatype: 'json',
        data: { }, 
        error: function(request, error) {
            console.log(arguments);
            alert('there was an error while fetching events! ' + url + error);
        } 
    }).done(function (doc) { 
            var event = Array();
            //var data = $.parseJSON(doc);
            $.each(doc, function(i, entry){
                    event.push({
                        title: entry.title, 
                        start: entry.start,
                        end: entry.end,
                        description: entry.description,
                        dow: entry.dow,
                        url: entry.url,
                        location: entry.location,
                        cost: entry.cost
                    });
                });
		$('#calendar').fullCalendar({
			header: {
				left: 'prev,next today',
				center: 'title',
				right: 'month,basicWeek,basicDay'
			},
			navLinks: true, // can click day/week names to navigate views
			editable: false,
            defaultView: 'basicWeek',
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