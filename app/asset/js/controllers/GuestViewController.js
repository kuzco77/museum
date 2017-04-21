app.controller('GuestLandController', function ($scope, $http, AuthService) {
	$scope.name = "Donald";
	$scope.index = 0;
	var url =AuthService.hostName + "/content/tho-nhuong";
	$http.get(url).then(function success(res) {
		$scope.soils = res.data.soils;
		console.log(res);
	}, function error(err) {
		console.log(err);
	})
})