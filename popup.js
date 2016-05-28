const bgp = chrome.extension.getBackgroundPage();
const SALT = 'ohd6eex8Ieshaixi';
const SHOW_ID = false;


var unfolded;

log('popup.js');

$(function() {
	$('#login').submit(function() {
		var passwordFld = $('#password');
		if(!passwordFld.val()){
			return false;
		}
		var key = CryptoJS.SHA256(SALT + passwordFld.val()).toString();
		passwordFld.val('');
		chrome.runtime.sendMessage({type: 'setKey', key: key}, function(response){
			init();
		});
		return false
	});
	$('#btnLogout').click(function() {
		chrome.runtime.sendMessage({type: 'setKey', key: null}, function(response){
			init();
		});
	});
	$('#btnAdd').click(function() {
		$('#url').val('');
		$('#title').val('');
		chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {
			var tab = tabs[0];
			$('#url').val(tab.url);
			$('#title').val(tab.title);
		});
		
		
		$('#bookmark').css('display', 'block');
		$('#btnAdd').prop('disabled', true);
	});
	$('#btnCancel').click(function() {
		$('#bookmark').css('display', 'none');
		$('#btnAdd').prop('disabled', false);
	});
	

	$('#bookmark').submit(function() {
		var bookmark = {
			url : $('#url').val(),
			title : $('#title').val(),
		};
		log('save');
		saveBookmark(bookmark);

		$('#bookmark').css('display', 'none');
		$('#btnAdd').prop('disabled', false);
		return false
	});
	
	init();
});

$(window).unload(function(){
	bgp.console.log('popup.js finished');
	var list = []
	unfolded.forEach(function(v){
		list.push(v);
	});
	chrome.runtime.sendMessage({type: 'setUnfolded', unfolded: list});
});

var port = chrome.runtime.connect();
port.onMessage.addListener(function(msg) {
	switch (msg.type) {
	case 'bookmarks':
		setBookmarks(msg.bookmarks)
		break;
	}
});

chrome.runtime.sendMessage({type: 'getUnfolded'}, function(ids){

	log('unfolded');
	log(ids);
	try{
		unfolded = new Set(ids);
	}catch(e){
		log(e);
	}
});


/////////////////////////////////////////////////////////////////////////////////////////////////////

function error(message) {
	bgp.console.error(message);
	$('#error').html(message);
}

function info(message) {
	bgp.console.log(message);
	$('#info').html(message);
}

function log(message, clear) {
	bgp.console.log(message);
}

function init(){
	log('init()');
	chrome.runtime.sendMessage({type: 'getKey'}, function(response) {
		log('key: ' + response);
		if(response){
			$('#login').css('display', 'none');
			$('#main').css('display', 'block');
		}else{
			$('#mainFolder').children().remove();
			$('#login').css('display', 'block');
			$('#main').css('display', 'none');
		}
	});
}

function setBookmarks(bookmarks){
	log('set bookmarks');
	var mainFolder = $('#mainFolder');
	mainFolder.children().remove();
	
	if(!bookmarks){
		return;
	}
	
	try{
		addBookmarks(mainFolder, bookmarks);
	}catch(e){
		error(e);
	}
}

function addBookmarks(parent, bookmarks) {
	parent.sortable({
		connectWith: 'ul',
		update: function( event, ui ) {
			var itemId = ui.item.attr('id');
			var parentId = ui.item.parents('li').attr('id');
			log(itemId + ' -> '  + parentId);
			
			chrome.runtime.sendMessage({
				type: 'moveBookmark',
				id: itemId,
				parentId: parentId}, function(response) {
				
			});
		}
	});
	
	bookmarks.forEach(function(bookmark){
		var title = $('<span>').append(' ' + bookmark.title + (SHOW_ID ? ' (' + bookmark.id + ')' : '') + ' ');
			
		var element = $('<li>').attr('id', bookmark.id);
		parent.append(element);
		
		if (bookmark.children) {
			var icon = $('<span>').addClass('glyphicon glyphicon-folder-close');
			element
				.append(icon)
				.append(title);
			
			// the <ul> must not be hidden directly, but a surrounding <div>
			var subElement = $('<div>').hide();
			element.append(subElement);
			
			var subTree = $('<ul>');
			subElement.append(subTree);
			
			element.click(function() {
				if(subTree.is(':visible')){
					icon.removeClass('glyphicon-folder-open').addClass('glyphicon-folder-close');
					subElement.hide();
					unfolded.delete(bookmark.id);
				}else{
					icon.removeClass('glyphicon-folder-close').addClass('glyphicon-folder-open');
					subElement.show();
					unfolded.add(bookmark.id);
				}
			    return false;
			 });
			if(unfolded.has(bookmark.id)){
				element.click();
			}
			
			addBookmarks(subTree, bookmark.children);
			
		} else {
			var link = $('<a>');
			element.append(link);
			
			link.append($('<span>').attr('class', 'glyphicon glyphicon-file'))
				.append(title);
			if(bookmark.error){
				link.css('text-decoration', 'line-through');
			}
			
			var tooltip
			if(bookmark.error){
				tooltip = "can't decrypt URL";
			}else{
				tooltip = bookmark.title + '<br/>' + bookmark.url;
			}
			
			link.attr('href', bookmark.url)
				.attr('title', tooltip)
				.attr('data-toggle', 'tooltip')
				.attr('data-html', 'true')
				.tooltip()
				.click(function(){
					chrome.tabs.create({url: bookmark.url});
				});
		}
		
		if(bookmark.crypt){
			title.append(' ').append($('<span>').attr('class', 'glyphicon glyphicon-lock'));
		}		
	});
}

function saveBookmark(bookmark) {
	log('save bookmark');
	
	chrome.runtime.sendMessage({type: 'saveBookmark', bookmark: bookmark});
}


