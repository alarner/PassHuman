angular.module('PassHuman.controllers', [])
.controller('AddPasswordGroupCtrl', function($scope) {

})
.controller('LeftFooterCtrl', function($scope, $rootScope) {
	$scope.togglePanel = function(panelName) {
		$rootScope.$emit('TOGGLE_PANEL', panelName);
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