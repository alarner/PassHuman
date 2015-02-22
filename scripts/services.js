angular.module('PassHuman.services', [])
.factory('Home', function() {
	return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
})
.factory('PasswordGroup', function(Home) {
	return function(obj) {
		var fs = require('fs-extra');
		var crypto = require('crypto');
		var path = require('path');
		var self = this;
		var errors = {
			NOPATH: {code: 'NOPATH', message: 'Missing path.'},
			NONAME: {code: 'NONAME', message: 'Missing name.'},
			NOPASS: {code: 'NOPASS', message: 'Missing password.'},
			NOCIPHER: {code: 'NOCIPHER', message: 'Missing cipher.'},
			BADPARSE: {code: 'BADPARSE', message: 'Unable to parse the file.'},
			DECRYPT: {code: 'DECRYPT', message: 'Unable to decrypt the file.'},
			ENCRYPT: {code: 'ENCRYPT', message: 'Unable to encrypt the file.'},
			BADPATH: {code: 'BADPATH', message: 'There was a problem trying to read the file.'},
			ENOENT: {code: 'ENOENT', message: 'The file doesn\'t exist.'},
			EISDIR: {code: 'EISDIR', message: 'The path points to a directory.'}
		};

		var settings = _.cloneDeep(obj);
		var passwords = [];
		if(_.isArray(settings.passwords)) {
			passwords = settings.passwords;
		}
		if(settings.path && settings.path.charAt(0) === '~') {
			settings.path = path.join(Home, settings.path.substr(1));
		}

		this.getPath = function() {
			return settings.path;
		};

		this.getSettings = function() {
			return settings;
		};

		this.getPasswords = function() {
			return passwords;
		};

		this.validate = function() {
			if(!settings.path) return errors.NOPATH;
			if(!settings.cipher) return errors.NOCIPHER;
			if(!settings.name) return errors.NONAME;
			if(!settings.password) return errors.NOPASS;
			return false;
		};

		this.save = function(cb) {
			var err = self.validate();
			if(err) return cb(err);

			fs.ensureFile(settings.path, function(err) {
				if(err) return cb(err);

				try {
					var cipher = crypto.createCipher(settings.cipher, settings.password);
					var crypted = cipher.update(JSON.stringify({
						passwords: passwords
					}),'utf8','hex');
					crypted += cipher.final('hex');

					fs.writeFile(settings.path, crypted, cb);
				}
				catch(e) {
					console.log(e);
					cb(errors.ENCRYPT);
				}
			});
		};

		this.load = function(cb) {
			if(!settings.path) return cb(errors.NOPATH);
			if(!settings.cipher) return cb(errors.NOCIPHER);

			fs.readFile(settings.path, function(err, data) {
				console.log('read file', settings.path);
				if(err) {
					if(err.code == 'ENOENT') {
						return cb(errors.ENOENT);
					}
					else if(err.code == 'EISDIR') {
						return cb(errors.EISDIR);
					}
					else {
						return cb(errors.BADPATH);
					}
				}
				var decipher = crypto.createDecipher(settings.cipher, settings.password || '');
				try {
					var dec = decipher.update(data.toString(),'hex','utf8');
					dec += decipher.final('utf8');
					var result = JSON.parse(dec);
					if(!result) return cb(errors.BADPARSE);
					passwords = result.passwords;
					cb();
				}
				catch(e) {
					return cb(errors.DECRYPT);
				}
			});
		};
	}
})
.factory('PasswordGenerator', function() {
	return {
		generate: function(len, chars) {
			if(!len) throw 'A length is required.';
			if(!_.isNumber(len)) throw 'The length must be a number.';
			
			var generatedPass = '';
			for(var counter=0; counter<len; counter++) {
				if(_.isString(chars) && chars.length) {
					var index = Math.floor(Math.random()*chars.length);
					if(index == chars.length) index = chars.length-1;
					generatedPass += chars.charAt(index);
				}
				else {
					var rand = Math.floor(Math.random()*95);
					if(rand >= 95) rand = 95;
					rand += 32;
					generatedPass += String.fromCharCode(rand);
				}
			}
			return generatedPass;
		}
	};
})
.service('Public', function(Home) {
	var fs = require('fs-extra');
	var path = require('path');
	var publicPath = window.localStorage.getItem('path');
	this.error = '';
	if(publicPath) {
		publicPath = path.join(publicPath, 'passhuman.json');
		try {
			this.settings = fs.readFileSync(publicPath);
			this.settings = JSON.parse(this.settings.toString());
		}
		catch(e) {
			if(e.code !== 'ENOENT') {
				this.error = e.message;
			}
		}
	}

	this.save = function(p, cb) {
		if(!this.settings.cipher) return cb('Missing cipher.');
		var file = path.join(p, 'passhuman.json');
		var self = this;
		
		async.series([
			function(cb) {
				fs.ensureFile(file, cb);
			},
			function(cb) {
				fs.writeJson(file, self.settings, cb)
			}
		], function(err) {
			if(!err) window.localStorage.setItem('path', p);
			cb(err);
		});
	};
})
.service('Private', function($rootScope, Public) {
	var fs = require('fs-extra');
	var path = require('path');
	var crypto = require('crypto');
	var pass = null;
	var settings = { groups: [] };
	var self = this;

	this.load = function(cb) {
		var file = getFile(cb);
		if(!file) return;

		fs.readFile(file, function(err, data) {
			if(err) return cb(err);
			var decipher = crypto.createDecipher(Public.settings.cipher, pass)
			try {
				var dec = decipher.update(data.toString(),'hex','utf8');
				dec += decipher.final('utf8');
				settings = JSON.parse(dec);
				if(!settings) return cb({message: 'Unable to parse .lookup.json'});
				$rootScope.$emit('PRIVATE.LOAD');
				cb();
			}
			catch(e) {
				cb(e);
			}
		});
	};

	this.save = function(cb) {;
		var file = getFile(cb);
		if(!file) return;

		fs.ensureFile(file, function(err) {
			if(err) return cb(err);

			var cipher = crypto.createCipher(Public.settings.cipher, pass);
			var crypted = cipher.update(JSON.stringify(settings),'utf8','hex');
			crypted += cipher.final('hex');

			fs.writeFile(file, crypted, cb);
		});
	};

	this.getGroups = function() {
		return settings.groups;
	};

	this.setPassword = function(p) {
		pass = p;
	};

	this.addGroup = function(group, cb) {
		settings.groups.push(group);
		this.save(function(err) {
			if(err) return cb(err);
			$rootScope.$emit('PRIVATE.CHANGE');
			cb();
		});
	};

	var getFile = function(cb) {
		if(!Public.settings || !Public.settings.cipher) {
			if(cb) {
				cb({message: 'Missing cipher in Public.'});
			}
			return false;
		}
		var file = window.localStorage.getItem('path');
		if(!file) {
			if(cb) {
				cb({message: 'Unknown private file location.'});
			}
			return false;
		}
		file = path.join(file, '.lookup.json');

		return file;
	};
});