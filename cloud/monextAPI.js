var MonextAPI = (function () {
    var self;
    return self = {
        _serviceURL: "https://homo.paystore-online.com/ws/services/",
        //_serviceURL: "https://recette.paystore-online.com/ws/services/",
        _getLongUrl: function (resourceName) {
            return self._serviceURL + resourceName;
        },

        getCommonHeaders: function () {
            return {
                "Content-Type": "application/json;charset=utf-8"
            };
        },

        getAuthenticatedHeaders: function ( sessionID ) {
            return {
                "Content-Type": "application/json;charset=utf-8",
                "SESSIONID"   : sessionID
            };
        },

        // On stocke l'identifiant permettant d'accéder au service Mail de Monext
        _password: null,
        getPassword: function () {
            return 'Admin007&'; //this._password;
        },

        _userName: null,
        getUserName: function () {
            return 'blc2@monex.net'; //this._userName;
        },

        User: {
            // Return a Parse.Promise resolved resolved as a the typical monext response
            login: function (username, password) {
                return Parse.Cloud.httpRequest({
                    method: "POST",
                    useMasterKey : true,
                    headers: self.getCommonHeaders(),
                    body: {
                        "Login"   : username,
                        "Password": password
                    },
                    url: self._getLongUrl("DoLogin")
                }).then(function (monextResponse) {
                    console.log("Monext/DoLogin:");
                    console.log(monextResponse);
                    console.log("-----");

                    return monextResponse;
                });

            },

            findByRef: function (userRef, sessionId) {
                return Parse.Cloud.httpRequest({
                    method: "POST",
                    useMasterKey : true,
                    headers: self.getAuthenticatedHeaders( sessionId ),
                    body: {
                        "UserRef": userRef
                    },
                    url: self._getLongUrl("UserFind")
                }).then(function (user) {
                    console.log("Monext/UserFind");
                    console.log(user);
                    console.log("-----");

                    return user.data
                });
            },
            // Return a Parse.Promise resolved as a boolean (true if password was reset, false otherwise)
            resetPassword: function (username) {
                return Parse.Cloud.httpRequest({
                    method: "POST",
                    headers: self.getCommonHeaders(),
                    body: {
                        "Login": username
                    },
                    url: self._getLongUrl("ForgetPassword")
                }).then(function (monextResponse) {
                    console.log("Monext/ResetPassword:");
                    console.log(monextResponse);
                    console.log("-----");

                    return monextResponse.data;
                });
            },
            modifyPassword: function (login, password, newPassword) {
                return Parse.Cloud.httpRequest({
                    method: "POST",
                    headers: self.getCommonHeaders(),
                    body: {
                        "Login"      : login,
                        "Password"   : password,
                        "NewPassword": newPassword,
                    },
                    url: self._getLongUrl("ModifyPassword")
                }).then(function (monextResponse) {
                    console.log("Monext/ModifyPassword:");
                    console.log(monextResponse);
                    console.log("-----");

                    return monextResponse;
                });
            }
        },

        Merchant: {
            findByRef: function (merchantRef, sessionId ) {
                return Parse.Cloud.httpRequest({
                    method: "POST",
                    headers: self.getAuthenticatedHeaders( sessionId ),
                    body: {
                        "MerchantRef": merchantRef
                    },
                    url: self._getLongUrl("GetMerchant")
                }).then(function (merchant) {
                    console.log("Monext/GetMerchant");
                    console.log(merchant);
                    console.log("-----");

                    return merchant.data
                });
            }
        },

        Email: {
            sendEmail: function(params, callbacks) {
                return Parse.Cloud.httpRequest({
                    method: "POST",
                    headers: self.getCommonHeaders(),
                    body: {
                        "Login"   : self.getUserName(),
                        "Password": self.getPassword()
                    },
                    url: self._getLongUrl("DoLogin")
                }).then(function (monextResponse) {
                    return Parse.Cloud.httpRequest({
            			method: "POST",
            			headers: self.getAuthenticatedHeaders( monextResponse.headers.sessionid ),
            			body: params,
            			url: self._getLongUrl("SendEmailTicketCaisse")
                    }).then(function (monextResponse) {
            			console.log("Monext/Emission Ticket:");
            			console.log(monextResponse);
            			console.log("-----");
            			callbacks.success(monextResponse);
                    }, function (monextResponse) {
                        callbacks.error(monextResponse);
                    });
                },
                function (monextResponse) {
                    callbacks.error(monextResponse);
                });
            }
        },

        Transaction: {
            addKioskTransaction: function(usermane, password, kioskTransaction) {
                var sessionId;
                return MonextAPI.User.login(usermane, password).then(function(monextResponse) {
                    if (monextResponse.data.Code !== 0) {
                        console.log("Monext rejected the user");
                        return Parse.Promise.error({message: "Monext rejected the user", code: monextResponse.Code});
                    }
		    console.log("MonextAPI.User.login: monextResponse = " + JSON.stringify(monextResponse));
                    sessionId = monextResponse.headers.sessionid ;
                    return MonextAPI.User.findByRef(monextResponse.data.UserRef, sessionId);
                }).then(function (monextResponse) {
                    if (monextResponse.Users.length < 1) {
                        console.log("Monext couldnt find user");
                        return Parse.Promise.error({message: "Monext couldnt find user", code: monextResponse.Code});
                    }
                    console.log("monextResponse.Users[0].Login = " + monextResponse.Users[0].Login);
	            console.log("monextResponse.Users[0].Email = " + monextResponse.Users[0].Email);
		    console.log("MonextAPI.User.findByRef: monextResponse = " + JSON.stringify(monextResponse));
		    kioskTransaction.UserRef     = monextResponse.Users[0].UserRef;
                    // kioskTransaction.Login       = monextResponse.Users[0].Email;
                    kioskTransaction.Login       = monextResponse.Users[0].Login;
                    kioskTransaction.MerchantRef = monextResponse.Users[0].MerchantRef;
                    return MonextAPI.Merchant.findByRef(kioskTransaction.MerchantRef, sessionId);

                }).then(function(monextResponse) {
                    kioskTransaction.DistributorMerchantContract = monextResponse.DistributorMerchantContract;
                    kioskTransaction.NomCommercant               = monextResponse.CompanyName;
                    kioskTransaction.AdresseCommercant           = monextResponse.POSAddress.ZipCode + " " + monextResponse.POSAddress.Locality;

                    console.log("Parse-addKioskTransaction:");
                    console.log(kioskTransaction)

                    return Parse.Cloud.httpRequest({
                        method: "POST",
                        headers: self.getAuthenticatedHeaders(sessionId),
                        body: kioskTransaction,
                        url: self._getLongUrl("AddKioskTransaction")
                    });
                }).then(function (monextResponse) {
                    console.log("Monext/Add Kiosk Transaction:");
                    console.log(monextResponse);
                    console.log("-----");
                    return monextResponse;
                });
            }
        }
    };
})();

module.exports = MonextAPI;

