angular.module('PassHuman.services', [])
.factory('Home', function() {
	return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
})
.factory('PasswordGroup', function(Home) {
	return function() {
		var fs = require('fs');
		var crypto = require('crypto');
		var path = require('path');
		var passwords = [];

		this.save = function() {

		};

		this.load = function(file, algorithm, password, cb) {
			if(file.charAt(0) === '~') {
				file = path.join(Home, file.substr(1));
			}
			var r = fs.createReadStream(path.resolve(file));
			// decrypt content
			var decrypt = crypto.createDecipher(algorithm, password)
			// start pipe
			r.pipe(decrypt);

			r.on('error', function(err) {
				cb({
					type: 'read',
					err: err
				});
			});

			decrypt.on('error', function(err) {
				cb({
					type: 'decrypt',
					err: err
				});
			});

			decrypt.on('end', function() {
				console.log(decrypt);
			});
		};
	}
})
.factory('PasswordGenerator', function() {
	return {
		generate: function(len, chars) {
			console.log('generate');
			if(!len) throw 'A length is required.';
			if(!_.isNumber(len)) throw 'The length must be a number.';
			
			var generatedPass = '';
			for(var counter=0; counter<len; counter++) {
				if(_.isString(chars) && chars.length) {
					var index = Math.floor(Math.random()*chars.length);
					if(index == chars.length) index = chars.length-1;
					generatedPass += chars.charAt(index);
					console.log(chars);
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
.service('Private', function(Public) {
	var fs = require('fs-extra');
	var path = require('path');
	var crypto = require('crypto');
	var pass = null;
	var settings = { groups: [] };
	var self = this;

	this.load = function(cb) {
		console.log('load');
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
				cb();
			}
			catch(e) {
				cb(e);
			}
		});
		

		// var r = fs.createReadStream(path.resolve(file));
		// // decrypt content
		// var decrypt = crypto.createDecipher(Public.settings.cipher, pass)
		// // start pipe
		// r.pipe(decrypt);

		// r.on('error', cb);
		// decrypt.on('error', cb);
		// decrypt.on('end', function() {
		// 	settings = JSON.parse(decrypt);
		// 	if(!settings) return cb({message: 'Unable to parse .lookup.json'});
		// 	console.log(settings);
		// 	cb();
		// });
	};

	this.save = function(cb) {;
		console.log('save')
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

	this.setPassword = function(p) {
		pass = p;
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