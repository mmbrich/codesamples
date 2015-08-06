function Assistant($scope, $http) {

	$scope.init = function(input) {
        	$scope.jsonObj = '';
        	$scope.output = '';
		$scope.articleImage = '';
		$scope.articleTitles = '';
		$scope.articleText = '';
		$scope.articleURL = '';

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
            		$scope.output = data.output;
			
			try {
				if(typeof data.output[0].actions.say.text !== undefined)
					$scope.articleText = data.output[0].actions.say.text;
			} catch(e) {console.log(e);}
			try {
				if(typeof data.output[0].actions.open.url !== undefined)
					$scope.articleURL = data.output[0].actions.open.url;
			} catch(e) {console.log(e);}

			try {
				if(typeof data.output[0].actions.show.titles !== undefined)
					$scope.articleTitles = data.output[0].actions.show.titles[0];
			} catch(e) {console.log(e);}
			try {
				if(typeof data.output[0].actions.show.images !== undefined)
					$scope.articleImage = data.output[0].actions.show.images[0];
			} catch(e) {console.log(e);}
        	});
	}
}
