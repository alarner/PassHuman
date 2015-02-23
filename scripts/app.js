angular.module('PassHuman', [
	'PassHuman.controllers',
	'PassHuman.services',
	'PassHuman.filters'
])
.run(function(Public) {
	// require('nw.gui').Window.get().showDevTools();
});