angular.module('PassHuman.animations', [])
.animation('.panel', function() {
	console.log('test animation');
	var NG_HIDE_CLASS = 'is-active';
	return {
		beforeAddClass: function(element, className, done) {
			if(className === NG_HIDE_CLASS) {
				element.slideUp(done); 
			}
		},
		removeClass: function(element, className, done) {
			if(className === NG_HIDE_CLASS) {
				element.hide().slideDown(done);
			}
		}
	}
});