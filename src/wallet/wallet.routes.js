(function(window, angular) {
    'use strict';

    angular.module('app.wallet')
        .config(config);

    config.$inject = ['$routeProvider'];

    function config($routeProvider) {
        $routeProvider.when('/', {
            controller: 'WalletCtrl',
            controllerAs: 'vm',
            templateUrl: 'wallet/wallets.html'
        });
    }

})(window, window.angular);
