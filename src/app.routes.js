(function(window, angular) {
    'use strict';

    angular.module('app')
        .config(config);

    config.$inject = ['$routeProvider', '$locationProvider'];

    function config($routeProvider, $locationProvider) {
        $locationProvider.html5Mode(true).hashPrefix('!');
        $routeProvider.otherwise('/bitlox_hardware_wallet');
        $routeProvider.when('/bitlox_hardware_wallet', {
            controller: 'WalletCtrl',
            controllerAs: 'vm',
            templateUrl: 'bitlox_hardware_wallet/wallet/wallets.html'
        });

//         $routeProvider.when('/', {
//             templateUrl: 'core/landing.html'
//         });
    }

})(window, window.angular);
