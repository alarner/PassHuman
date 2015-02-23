angular.module('PassHuman.filters', [])
.filter('DisplayPassword', function(password) {
	console.log(password);
	return 'test';
});