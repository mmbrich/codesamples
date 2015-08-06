function Assistant($scope, $http) {

	$scope.init = function(input) {
    		$http.get(
			'https://jeannie.p.mashape.com/api?input='+input+'&locale=en&location=53.0%2C9.0&page=1&timeZone=%2B120', 
			{
				headers: 
				{
					"X-Mashape-Key": "T1dtftoMwOmshGpyzFC0tOHA5FEup1TyV8yjsnYbXbkG1qlT7K",
		  			"Accept": "application/json"
				}
			}).
        	success(function(data) {
            		$scope.jsonObj = data;
        	});
	}
}
