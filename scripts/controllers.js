angular.module('PassHuman.controllers', ['PassHuman.services'])
.controller('PassHumanCtrl', function($scope, $rootScope, Public) {
	$scope.page = 'login';
	if(!Public.settings) {
		$scope.page = 'register';
	}
	else {
		console.log('focus');
		console.log($('#login-password'));
		$('#login-password').focus();
	}
	$scope.error = Public.error;

	$rootScope.$on('LOGIN', function() {
		$scope.page = 'private';
	});

})
.controller('RegisterCtrl', function($scope, $rootScope, Home, Public, Private) {
	var path = require('path');
	$scope.registrationDetails = {
		password: '',
		confirm: '',
		cipher: 'aes256',
		path: ''
	}
	$scope.ciphers = require('crypto').getCiphers();
	$scope.register = function(rd) {
		$scope.error = '';
		if(!rd.password)
			return $scope.error = 'Enter a master password.';
		if(!rd.confirm)
			return $scope.error = 'Confirm your master password.';
		if(rd.password !== rd.confirm)
			return $scope.error = 'Master password and confirmation must match.';
		if(!rd.cipher)
			return $scope.error = 'Select a cipher.';
		if(!rd.path)
			return $scope.error = 'Enter a location to save files.';

		if(rd.path.charAt(0) === '~') {
			rd.path = path.join(Home, rd.path.substr(1));
		}

		Public.settings = {
			cipher: rd.cipher
		};

		async.series([
			function(cb) {
				Public.save(rd.path, function(err) {
					if(err) {
						$scope.error = err.message;
					}
					else {
						window.localStorage.setItem('path', rd.path);
					}
					$scope.$apply();
					cb(err);
				});
			},
			function(cb) {
				Private.setPassword(rd.password);
				Private.load(function(err) {
					if(err.code !== 'ENOENT') return cb(err);
					cb();
				});
			},
			function(cb) {
				Private.save(cb);
			}
		], function(err) {
			if(err) {
				$scope.error = err.message;
				$scope.$apply();
			}
			else {
				$rootScope.$emit('LOGIN');
			}
		});
	};

})
.controller('LoginCtrl', function($scope, $rootScope, Public, Private) {
	$scope.credentials = {
		password: ''
	};
	$scope.error = '';

	$scope.login = function(credentials) {
		console.log('login')
		$scope.error = '';
		Private.setPassword(credentials.password);
		Private.load(function(err) {
			if(err) {
				console.log(err);
				$scope.error = err.message;
			}
			else {
				$rootScope.$emit('LOGIN');
			}
			$scope.$apply();
		});
	};
})
.controller('AddPasswordGroupCtrl', function($scope, $rootScope, PasswordGroup, PasswordGenerator) {
	var fs = require('fs');
	// var passGroup = new PasswordGroup();
	$scope.group = {
		name: '',
		path: '',
		password: '',
		cipher: 'aes256'
	};
	$scope.pathMessage = '';
	$scope.pathMessageClass = 'success';
	$scope.ciphers = require('crypto').getCiphers();
	$scope.error = '';
	$scope.saving = false;

	$scope.generate = function() {
		$scope.group.password = PasswordGenerator.generate(20);
	};

	$scope.create = function(group) {
		$scope.error = '';
		if(!group.name)
			return $scope.error = 'Enter a name for this password group (eg. Personal).';
		if(!group.password)
			return $scope.error = 'Enter a password. The password is used to encrypt this group.';
		if(!group.path)
			return $scope.error = 'Enter a path where this password group will be saved.';
		if(!group.cipher)
			return $scope.error = 'Enter a cipher that will be used to encrypt your passwords. If you\'re not sure you can pick aes256.';

		var passGroup = new PasswordGroup($scope.group);

		$scope.saving = true;

		async.waterfall([
			function(cb) {
				fs.access(passGroup.getPath(), fs.F_OK, function(err) {
					console.log('fs.access', arguments);
					if(err && err.code === 'ENOENT') {
						return cb(null, false);
					}
					else if(err) {
						return cb(err);
					}
					else {
						return cb(null, true);
					}
				});
			},
			function(fileExists, cb) {
				console.log('fileExists', fileExists);
				if(!fileExists) return cb(null, fileExists);
				passGroup.load(function(err) {
					if(!err) return cb(null, fileExists);
					switch(err.code) {
						case 'NOPATH':
						case 'NOCIPHER':
						case 'ENOENT':
						case 'BADPATH':
							$scope.error = err.message;
						break;
						case 'EISDIR':
							$scope.error = 'The path points to a directory. '+
							'Please pick a file instead';
						break;
						case 'BADPARSE':
						case 'DECRYPT':
							$scope.error = 'The password you entered did not '+
							'decrypt the pre-existing file at: '+group.path+
							'. Please try a different password or cipher.';
						break;
						default:
							$scope.error = err.code;
						break;
					}
					cb(err, fileExists);
				});
			}
			,
			function(fileExists, cb) {
				if(fileExists)  return cb(null, fileExists);
				passGroup.save(function(err) {
					if(!err) return cb(null, fileExists);
					switch(err.code) {
						case 'NOPATH':
						case 'NOCIPHER':
						case 'ENOENT':
						case 'NONAME':
						case 'NOPASS':
						case 'BADPATH':
						case 'ENCRYPT':
							$scope.error = err.message;
						break;
						default:
							$scope.error = err.code;
						break;
					}
					cb(err, fileExists);
				});
			}
		], function(err) {
			$scope.saving = false;
			$scope.$apply();
			if(!err) {
				$rootScope.$emit(
					'SET_PANEL_VISIBILITY',
					{name: 'addPasswordGroup', visible: false}
				);
			}
		});
	};
	$scope.$watch('group.path', function() {
		if(!$scope.group.path) {
			$scope.pathMessage = '';
		}
		else {
			var passGroup = new PasswordGroup($scope.group);
			passGroup.load(function(err) {
				console.log(err.code);
				$scope.pathMessageClass = 'success';
				if(err) {
					switch(err.code) {
						case 'NOPATH':
							$scope.pathMessage = '';
						break;
						case 'ENOENT':
							$scope.pathMessage = 'The specified password group file '+
							'does not exist. PassHuman will create a new file for you.';
						break;
						case 'EISDIR':
							$scope.pathMessage = 'The path points to a directory. '+
							'Please pick a file instead';
							$scope.pathMessageClass = 'alert';
						break;
						case 'BADPATH':
							$scope.pathMessage = 'There was a problem loading that '+
							'particular file. Does it have the correct permissions?';
							$scope.pathMessageClass = 'alert';
						break;
						case 'NOCIPHER':
						case 'BADPARSE':
						case 'DECRYPT':
							$scope.pathMessage = 'The specified password group file '+
							'exists. PassHuman will use the existing file.';
						break;
					}
				}
				else {
					$scope.pathMessage = 'The specified password group file \
					exists. PassHuman will use the existing file.';
				}
				$scope.$apply();
			});
		}
	});
})
.controller('LeftFooterCtrl', function($scope, $rootScope) {
	var mainWindow = require('nw.gui').Window.get();
	$scope.togglePanel = function(panelName) {
		$rootScope.$emit('TOGGLE_PANEL', panelName);
	};
	$scope.showDevTools = function() {
		mainWindow.showDevTools();
	};
})
.controller('PanelsCtrl', function($scope, $rootScope) {
	$scope.panels = {
		'addPasswordGroup': ''
	}
	$rootScope.$on('TOGGLE_PANEL', function(e, panelName) {
		if(!$scope.panels.hasOwnProperty(panelName)) return;
		$scope.panels[panelName] = $scope.panels[panelName] ? '' : 'is-active';
		console.log($scope.panels[panelName]);
		$scope.$apply();
	});

	$rootScope.$on('SET_PANEL_VISIBILITY', function(e, obj) {
		console.log('SET_PANEL_VISIBILITY')
		if(!$scope.panels.hasOwnProperty(obj.name)) return;
		$scope.panels[obj.name] = obj.visible ? 'is-active' : '';
		$scope.$apply();
	});
});