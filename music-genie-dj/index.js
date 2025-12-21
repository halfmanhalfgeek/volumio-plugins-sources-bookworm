'use strict';

var libQ = require('kew');
var fs = require('fs-extra');
var config = new (require('v-conf'))();
var exec = require('child_process').exec;
var execSync = require('child_process').execSync;
var http = require('http');
var https = require('https');


module.exports = ControllerMusicGenieDj;
function ControllerMusicGenieDj(context) {
	var self = this;

	this.context = context;
	this.commandRouter = this.context.coreCommand;
	this.logger = this.context.logger;
	this.configManager = this.context.configManager;

}



ControllerMusicGenieDj.prototype.onVolumioStart = function()
{
	var self = this;
	var configFile=this.commandRouter.pluginManager.getConfigurationFile(this.context,'config.json');
	this.config = new (require('v-conf'))();
	this.config.loadFile(configFile);
	
	this.logger.info('Music Genie DJ: Config file loaded from: ' + configFile);
	this.logger.info('Music Genie DJ: API Host: ' + this.config.get('api_host'));

    return libQ.resolve();
}

ControllerMusicGenieDj.prototype.onStart = function() {
    var self = this;
	var defer = libQ.defer();

	self.mpdPlugin = self.commandRouter.pluginManager.getPlugin('music_service', 'mpd');
	
	self.commandRouter.loadI18nStrings();
	self.addToBrowseSources();

	// Once the Plugin has successfully started resolve the promise
	defer.resolve();

    return defer.promise;
};

ControllerMusicGenieDj.prototype.onStop = function() {
    var self = this;
    var defer = libQ.defer();

	self.commandRouter.volumioRemoveToBrowseSources('Music Genie DJ');

    // Once the Plugin has successfully stopped resolve the promise
    defer.resolve();

    return libQ.resolve();
};

ControllerMusicGenieDj.prototype.onRestart = function() {
    var self = this;
    // Optional, use if you need it
};


// Configuration Methods -----------------------------------------------------------------------------

ControllerMusicGenieDj.prototype.getUIConfig = function() {
    var defer = libQ.defer();
    var self = this;

    var lang_code = this.commandRouter.sharedVars.get('language_code');

    self.commandRouter.i18nJson(__dirname+'/i18n/strings_'+lang_code+'.json',
        __dirname+'/i18n/strings_en.json',
        __dirname + '/UIConfig.json')
        .then(function(uiconf)
        {
			uiconf.sections[0].content[0].value = self.config.get('api_host');

            defer.resolve(uiconf);
        })
        .fail(function()
        {
            defer.reject(new Error());
        });

    return defer.promise;
};

ControllerMusicGenieDj.prototype.getConfigurationFiles = function() {
	return ['config.json'];
}

ControllerMusicGenieDj.prototype.setUIConfig = function(data) {
	var self = this;
	//Perform your installation tasks here
};

ControllerMusicGenieDj.prototype.getConf = function(varName) {
	var self = this;
	return self.config.get(varName);
};

ControllerMusicGenieDj.prototype.setConf = function(varName, varValue) {
	var self = this;
	self.config.set(varName, varValue);
};

ControllerMusicGenieDj.prototype.saveSettings = function(data) {
	var self = this;
	var defer = libQ.defer();

	self.logger.info('Music Genie DJ: Received data to save: ' + JSON.stringify(data));
	self.logger.info('Music Genie DJ: Config data before set: ' + JSON.stringify(self.config.data));
	
	self.config.set('api_host', data['api_host']);
	
	self.logger.info('Music Genie DJ: Config data after set: ' + JSON.stringify(self.config.data));
	
	// Save config to disk
	var configFile = self.commandRouter.pluginManager.getConfigurationFile(self.context, 'config.json');
	fs.writeFileSync(configFile, JSON.stringify(self.config.data));
	
	self.logger.info('Music Genie DJ: Config saved to: ' + configFile);
	
	// Reload config to ensure it's loaded in memory
	self.config.loadFile(configFile);
	
	self.logger.info('Music Genie DJ: Settings saved and reloaded. API Host: ' + self.config.get('api_host'));
	self.logger.info('Music Genie DJ: Full config data after reload: ' + JSON.stringify(self.config.data));
	
	self.commandRouter.pushToastMessage('success', 'Music Genie DJ', 'Settings saved successfully');
	
	defer.resolve();
	return defer.promise;
};



// Playback Controls ---------------------------------------------------------------------------------------
// If your plugin is not a music_sevice don't use this part and delete it


ControllerMusicGenieDj.prototype.addToBrowseSources = function () {
	var self = this;
	
	var data = {
		name: 'Music Genie DJ',
		uri: 'musicgeniedj',
		plugin_type: 'music_service',
		plugin_name: 'music-genie-dj',
		albumart: '/albumart?sourceicon=music_service/music-genie-dj/icon.png'
	};
	
    this.commandRouter.volumioAddToBrowseSources(data);
};

ControllerMusicGenieDj.prototype.handleBrowseUri = function (curUri) {
    var self = this;
	var defer = libQ.defer();

	if (curUri === 'musicgeniedj') {
		var response = {
			navigation: {
				lists: [{
					title: 'Music Genie DJ',
					icon: 'fa fa-music',
					availableListViews: ['list'],
					items: [
						{
							service: 'music-genie-dj',
							type: 'item-no-menu',
							title: 'Weather',
							icon: 'fa fa-cloud',
							uri: 'musicgeniedj/weather'
						},
						{
							service: 'music-genie-dj',
							type: 'item-no-menu',
							title: 'Joke',
							icon: 'fa fa-smile-o',
							uri: 'musicgeniedj/joke'
						},
						{
							service: 'music-genie-dj',
							type: 'item-no-menu',
							title: 'Shoutout',
							icon: 'fa fa-bullhorn',
							uri: 'musicgeniedj/shoutout'
						}
					]
				}],
				prev: {
					uri: '/'
				}
			}
		};
		defer.resolve(response);
	}

    return defer.promise;
};



// Fetch audio stream from Music Genie API
ControllerMusicGenieDj.prototype.fetchTrackStream = function(messageId) {
	var self = this;
	var defer = libQ.defer();
	
	var apiHost = self.config.get('api_host') || 'http://localhost:3000';
	self.logger.info('API Host from config: ' + apiHost);
	
	if (!apiHost || apiHost === 'undefined') {
		self.logger.error('API host is not configured');
		defer.reject(new Error('API host not configured'));
		return defer.promise;
	}
	
	var apiUrl = apiHost + '/api/message?id=' + messageId;
	
	self.logger.info('Fetching track from: ' + apiUrl);
	
	var client = apiUrl.startsWith('https') ? https : http;
	
	client.get(apiUrl, function(res) {
		if (res.statusCode === 200) {
			var track = {
				service: 'music-genie-dj',
				type: 'track',
				title: "A message from Music Genie",
				name: "A message from Music Genie",
				uri: apiUrl,
				trackType: 'audio/mpeg',
				albumart: '/albumart?sourceicon=music_service/music-genie-dj/icon.png'
			};
			defer.resolve(track);
		} else {
			self.logger.error('Failed to fetch track: ' + res.statusCode);
			defer.reject(new Error('Failed to fetch track'));
		}
	}).on('error', function(err) {
		self.logger.error('Error fetching track: ' + err.message);
		defer.reject(err);
	});
	
	return defer.promise;
};

// Define a method to clear, add, and play an array of tracks
ControllerMusicGenieDj.prototype.clearAddPlayTrack = function(track) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMusicGenieDj::clearAddPlayTrack');

	self.commandRouter.logger.info(JSON.stringify(track));

	return self.mpdPlugin.sendMpdCommand('stop', [])
		.then(function() {
			return self.mpdPlugin.sendMpdCommand('clear', []);
		})
		.then(function() {
			return self.mpdPlugin.sendMpdCommand('add "' + track.uri + '"', []);
		})
		.then(function() {
			return self.mpdPlugin.sendMpdCommand('play', []);
		});
};

ControllerMusicGenieDj.prototype.seek = function (timepos) {
	var self = this;
    this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMusicGenieDj::seek to ' + timepos);

    return self.mpdPlugin.seek(timepos);
};

// Stop
ControllerMusicGenieDj.prototype.stop = function() {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMusicGenieDj::stop');

	return self.mpdPlugin.stop();
};

// Pause
ControllerMusicGenieDj.prototype.pause = function() {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMusicGenieDj::pause');

	return self.mpdPlugin.pause();
};

// Get state
ControllerMusicGenieDj.prototype.getState = function() {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMusicGenieDj::getState');


};

//Parse state
ControllerMusicGenieDj.prototype.parseState = function(sState) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMusicGenieDj::parseState');

	//Use this method to parse the state and eventually send it with the following function
};

// Announce updated State
ControllerMusicGenieDj.prototype.pushState = function(state) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerMusicGenieDj::pushState');

	return self.commandRouter.servicePushState(state, self.servicename);
};


ControllerMusicGenieDj.prototype.explodeUri = function(uri) {
	var self = this;
	var defer = libQ.defer();

	// Parse the URI to extract the message ID
	// Expected format: musicgeniedj:12345
	if (uri.startsWith('musicgeniedj:')) {
		var parts = uri.split(':');
		var messageId = parts[1];
		
		if (!messageId) {
			self.logger.error('No message ID found in URI: ' + uri);
			defer.reject(new Error('Invalid URI: missing message ID'));
			return defer.promise;
		}
		
		// Fetch the track stream from the API
		self.fetchTrackStream(messageId)
			.then(function(track) {
				defer.resolve(track);
			})
			.fail(function(err) {
				self.logger.error('Error exploding URI: ' + err);
				defer.reject(err);
			});
	} else {
		self.logger.error('Invalid URI format: ' + uri);
		defer.reject(new Error('Invalid URI'));
	}

	return defer.promise;
};

ControllerMusicGenieDj.prototype.getAlbumArt = function (data, path) {

	var artist, album;

	if (data != undefined && data.path != undefined) {
		path = data.path;
	}

	var web;

	if (data != undefined && data.artist != undefined) {
		artist = data.artist;
		if (data.album != undefined)
			album = data.album;
		else album = data.artist;

		web = '?web=' + nodetools.urlEncode(artist) + '/' + nodetools.urlEncode(album) + '/large'
	}

	var url = '/albumart';

	if (web != undefined)
		url = url + web;

	if (web != undefined && path != undefined)
		url = url + '&';
	else if (path != undefined)
		url = url + '?';

	if (path != undefined)
		url = url + 'path=' + nodetools.urlEncode(path);

	return url;
};





ControllerMusicGenieDj.prototype.search = function (query) {
	var self=this;
	var defer=libQ.defer();

	// Mandatory, search. You can divide the search in sections using following functions

	return defer.promise;
};

ControllerMusicGenieDj.prototype._searchArtists = function (results) {

};

ControllerMusicGenieDj.prototype._searchAlbums = function (results) {

};

ControllerMusicGenieDj.prototype._searchPlaylists = function (results) {


};

ControllerMusicGenieDj.prototype._searchTracks = function (results) {

};

ControllerMusicGenieDj.prototype.goto=function(data){
    var self=this
    var defer=libQ.defer()

// Handle go to artist and go to album function

     return defer.promise;
};
