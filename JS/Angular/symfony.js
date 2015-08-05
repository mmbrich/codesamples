function Symfony($scope, $http) {
    $http.get('http://127.0.0.1:8000/api/users').
        success(function(data) {
            $scope.greeting = data;
        });
}
