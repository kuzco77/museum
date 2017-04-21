app.filter('maDeTaiFilter', function() {
	return function(input, search) {
	if (!input) return [""];
    if (!search) return [""];
    var result = [];
    angular.forEach(input, function(value, key) {
      if (value == search) {
        result.push(value)
      }
    });
    return result;
	}
})