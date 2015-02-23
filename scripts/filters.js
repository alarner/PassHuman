angular.module('PassHuman.filters', [])
.filter('visible', function() {
	// console.log(passwords);
	// return passwords;
	return function(password) {
		return password.visible;
	}
});