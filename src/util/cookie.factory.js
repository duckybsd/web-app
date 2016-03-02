(function(window, angular) {
    'use strict';

    angular.module('app.util')
        .factory('Cookie', CookieFactory);

    CookieFactory.$inject = ['ipCookie'];

    var DEFAULT_COOKIE_OPTIONS = {path: '/'};

    function CookieFactory(ipCookie) {
        var Cookie = {};

        Cookie.set = function(key, value, options) {
            options = makeOptions(options);
            return ipCookie(key, value, options);
        };

        Cookie.get = function(key) {
            return ipCookie(key);
        };

        Cookie.remove = function(key, options) {
            options = makeOptions(options);
            return ipCookie.remove(key, options);
        };

        function makeOptions(options) {
            if (!options || 'object' !== typeof options) {
                options = {};
            }
            return angular.extend(DEFAULT_COOKIE_OPTIONS, options);
        }

        return Cookie;
    }

})(window, window.angular);
