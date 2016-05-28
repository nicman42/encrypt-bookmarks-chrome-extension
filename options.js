


$(function(){
	var items = $('input');
	
	items.each(function(){
		var item = $(this);
		var id = item.attr('id');
		var type = item.attr('type');
		
		chrome.storage.sync.get(id, function(values) {
			var value = values[id];
			switch(type){
			case 'checkbox':
				value = item.prop('checked', value);
				break;
			default:
				value = item.val(value);
				break;
			}
			
			console.log('loaded ' + id + ': ' + value);
        });
	});
	items.on('change', function(){
		var item = $(this);
		var id = item.attr('id');
		var type = item.attr('type');
		var value
		
		switch(type){
		case 'checkbox':
			value = item.prop('checked') ? 1 : 0;
			break;
		default:
			value = item.val();
			break;
		}
		
		var values = {};
		values[id] = value;
		chrome.storage.sync.set(values, function() {
			console.log('saved ' + id + ': ' + value);
        });
	});
});

