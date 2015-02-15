angular.module('PassHuman.controllers', ['PassHuman.services'])
.controller('PassHumanCtrl', function($scope, $rootScope, Public) {
	$scope.page = 'login';
	if(!Public.settings) {
		$scope.page = 'register';
	}
	$scope.error = Public.error;

	$rootScope.$on('login', function() {
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
				$rootScope.$emit('login');
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
				$rootScope.$emit('login');
			}
			$scope.$apply();
		});
	};
})
.controller('AddPasswordGroupCtrl', function($scope, PasswordGroup, PasswordGenerator) {
	var fs = require('fs');
	var passGroup = new PasswordGroup();
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
		
		$scope.saving = true;


	};
	$scope.$watch('group.path', function() {
		if(!$scope.group.path) {
			$scope.pathMessage = '';
		}
		else {
			passGroup.load($scope.group.path, $scope.group.cipher, $scope.group.password, function(err) {
				$scope.pathMessageClass = 'success';
				if(err) {
					if(err.type == 'read') {
						err = err.err;
						if(err.code == 'ENOENT') {
							$scope.pathMessage = 'The specified password group file \
							does not exist. PassHuman will create a new file for you.';
						}
						else if(err.code == 'EISDIR') {
							$scope.pathMessage = 'The specified password group file \
							points to a directory. Please choose a file instead.';
							$scope.pathMessageClass = 'alert';
						}
						else {
							$scope.pathMessage = 'An unkown error occurred.';
							$scope.pathMessageClass = 'alert';
						};
					}
					else if(err.type == 'decrypt') {
						err = err.err;
						$scope.pathMessage = 'The specified password group file \
						exists, but there was a problem decrypting it with the \
						specified password: '+err.message;
						$scope.pathMessageClass = 'alert';
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
	});
});