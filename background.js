const
SCHEMA = 'encrypted://';
VERSION = 1;
MAINFOLDER_ID = '2';

var key;
var bookmarks;
var unfolded = [];
var port;
var options;



chrome.storage.onChanged.addListener(function(changes, areaName){
	if(areaName == 'sync'){
		loadOptions();
	}
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {

	switch (request.type) {
	case 'setKey':
		key = request.key;
		console.log('set key: ' + key);
		loadBookmarks();
		sendResponse(key);
		break;
	case 'getKey':
		console.log('send key: ' + key);
		sendResponse(key);
		sendBookmarks();
		break;
	case 'getBookmarks':
		sendResponse(bookmarks);
		break;
	case 'saveBookmark':
		saveBookmark(request.bookmark, sendResponse);
		break;
	case 'moveBookmark':
		moveBookmark(request.id, request.parentId);
		break;
	case 'setUnfolded':
		unfolded = request.unfolded;
		break;
	case 'getUnfolded':
		sendResponse(unfolded);
		break;
	}
});

chrome.runtime.onConnect.addListener(function(p) {
	console.log('onConnect()');
	port = p;
	port.onDisconnect.addListener(function(){
		port = null;
	});
});


chrome.bookmarks.onCreated.addListener(loadBookmarks);
chrome.bookmarks.onMoved.addListener(loadBookmarks);
chrome.bookmarks.onRemoved.addListener(loadBookmarks);
chrome.bookmarks.onChanged.addListener(loadBookmarks);


loadOptions();

///////////////////////////////////////////////////////////////////////////////////////////////////

function loadBookmarks() {
	console.log('load bookmarks()');
	chrome.bookmarks.getSubTree(MAINFOLDER_ID, function(nodes) {
		decryptBookmark(nodes[0]);
		bookmarks = nodes[0].children;
		sendBookmarks();
	});
}

function sendBookmarks(){
	if(port){
		console.log('send bookmarks');
		port.postMessage({type: 'bookmarks', bookmarks: bookmarks});
	}
}

function encrypt(obj, property){
	if(obj[property]){
		obj[property] = SCHEMA + VERSION + '/' + CryptoJS.AES.encrypt(obj[property], key).toString();
	}
}

function decrypt(obj, property){
	if (obj[property] && obj[property].startsWith(SCHEMA)) {
		obj.crypt = true;
		var error = true;
		if(key){
			try{
				var match = /^(.+?)\/(.+)$/.exec(obj[property].substring(SCHEMA.length));
				var version = match[1];
				var encryptedString = match[2];
				var decryptObj = CryptoJS.AES.decrypt(encryptedString, key);
				if(decryptObj.sigBytes>=0){
					obj[property] = decryptObj.toString(CryptoJS.enc.Utf8);
					error = false;					
				}
			}catch(e){
				console.log(e);
			}
		}
		
		obj.error |= error;
	}
}

function decryptBookmark(bookmark) {
	decrypt(bookmark, 'url');
	decrypt(bookmark, 'title');
	
	if (bookmark.children) {
		bookmark.children.forEach(function(child) {
			decryptBookmark(child);
			bookmark.crypt |= child.crypt;
		});
	}
}

function encryptBookmark(bookmark) {
	if(bookmark.url){
		if(bookmark.url.indexOf('://')<0){
			bookmark.url = 'http://' + bookmark.url;
		}
		encrypt(bookmark, 'url');	
	}
	if(options.encrypt_title){
		encrypt(bookmark, 'title');
	}
}

function saveBookmark(bookmark, callback){
	bookmark.parentId = MAINFOLDER_ID;
	
	encryptBookmark(bookmark);
	
	console.log('add ' + JSON.stringify(bookmark));
	try{
		chrome.bookmarks.create(bookmark, function(b) {
			console.log('added: ' + (b ? b.id : ''));
		});
	}catch(e){
		error(e);
	}
}

function moveBookmark(id, parentId){
	if(!parentId){
		parentId = MAINFOLDER_ID;
	}
	console.log('move bookmark: ' + id + ' -> ' + parentId);
	var destination = {parentId: parentId};
	chrome.bookmarks.move(id, destination, function(){
		
	});
}

function loadOptions(){
	chrome.storage.sync.get(null, function(values) {
		console.log('options loaded: \n' + JSON.stringify(values));
		options = values;
		
		// set defaults
		var defaultOptions = {
			'encrypt_title': 1
		};
		$.each(defaultOptions, function(key, value){
			if(typeof options[key] != 'undefined'){
				delete(defaultOptions[key])
			}else{
				options[key] = value;
			}
		});
		if(Object.keys(defaultOptions).length > 0){
			console.log('set default options:\n' + JSON.stringify(defaultOptions));
			chrome.storage.sync.set(defaultOptions);
		}
	});
}

