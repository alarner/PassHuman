angular.module('PassHuman', [
	'PassHuman.controllers',
	'PassHuman.services'
])
.run(function(Public) {
	require('nw.gui').Window.get().showDevTools();
});