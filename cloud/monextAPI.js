var MonextAPI = (function () {
    var self;
    return self = {
        //_serviceURL: "https://homo.paystore-online.com/ws/services/",
        //_serviceURL: "https://recette.paystore-online.com/ws/services/",
        _serviceURL: "https://paystore-online.com/ws/services/",
        _getLongUrl: function (resourceName) {
            return self._serviceURL + resourceName;
        },
        getCommonHeaders: function () {
            return {
                "Content-Type": "application/json;charset=utf-8"
            };
        },
        getAuthenticatedHeaders: function () {
            return {
                "Content-Type": "application/json;charset=utf-8",
                "SESSIONID"   : this.getSessionId()
            };
        },

        _sessionId: null,
        setSessionId: function (id) {
            this._sessionId = id;
        },
        getSessionId: function () {
            return this._sessionId;
        },

        // on transgresse la regle de ne pas stoker le mot de passe dand la session....
        _password: null,
        setPassword: function (password) {
            this._password = password;
        },
        getPassword: function () {
            return 'Admin007&'; //this._password;
        },

        _userName: null,
        setUserName: function (userName) {
            this._userName = userName;
        },
        getUserName: function () {
            return 'blc2@monex.net'; //this._userName;
        },

        _tmpPassword : false,
        setTmpPassword : function(isTmp) {
            this._tmpPassword = isTmp;
        },
        isTmpPassword : function() {
            return this._tmpPassword;
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
                    

                    self.setSessionId(monextResponse.headers.sessionid);
                    self.setUserName(username);
                    self.setPassword(password);
                    self.setTmpPassword(monextResponse.data.IsTemporaryPassword);

                    return monextResponse.data;
                });

            },

            findByRef: function (userRef) {
                return Parse.Cloud.httpRequest({
                    method: "POST",
                    useMasterKey : true,
                    headers: self.getAuthenticatedHeaders(),
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
            findByRef: function (merchantRef) {
                return Parse.Cloud.httpRequest({
                    method: "POST",
                    headers: self.getAuthenticatedHeaders(),
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
		    self.setSessionId(monextResponse.headers.sessionid);
                    return Parse.Cloud.httpRequest({
            			method: "POST",
            			headers: self.getAuthenticatedHeaders(),
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
                // TODO : modify login
                //return MonextAPI.User.login('john_hom@test.fr', 'John123!').then(function(monextResponse) {
                return MonextAPI.User.login(usermane, password).then(function(monextResponse) {
                    if (monextResponse.Code !== 0) {
                        console.log("Monext rejected the user");
                        return Parse.Promise.error({message: "Monext rejected the user", code: monextResponse.Code});
                    }
                    return MonextAPI.User.findByRef(monextResponse.UserRef);
                }).then(function (monextResponse) {
                    if (monextResponse.Users.length < 1) {
                        console.log("Monext couldnt find user");
                        return Parse.Promise.error({message: "Monext couldnt find user", code: monextResponse.Code});
                    }
                    kioskTransaction.UserRef     = monextResponse.Users[0].UserRef;
                    kioskTransaction.Login       = monextResponse.Users[0].Email;
                    kioskTransaction.MerchantRef = monextResponse.Users[0].MerchantRef;
                    return MonextAPI.Merchant.findByRef(kioskTransaction.MerchantRef);

                }).then(function(monextResponse) {
                    kioskTransaction.DistributorMerchantContract = monextResponse.DistributorMerchantContract;
                    kioskTransaction.NomCommercant               = monextResponse.CompanyName;
                    kioskTransaction.AdresseCommercant           = monextResponse.POSAddress.ZipCode + " " + monextResponse.POSAddress.Locality;

                    console.log("Parse-addKioskTransaction:");
                    console.log(kioskTransaction)

                    return Parse.Cloud.httpRequest({
                        method: "POST",
                        headers: self.getAuthenticatedHeaders(),
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
