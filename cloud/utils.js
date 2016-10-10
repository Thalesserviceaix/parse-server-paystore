﻿var Utils = {
    StringGenerator: {
        getString: function (len) {
            var charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

            var randomString = '';
            for (var i = 0 ; i < len ; i++) {
                var randomPoz = Math.floor(Math.random() * charSet.length);
                randomString += charSet.substring(randomPoz, randomPoz + 1);
            }

            return randomString;
        }
    }
};

module.exports = Utils;