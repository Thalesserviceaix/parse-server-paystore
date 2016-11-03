var MonextAPI = require("./monextAPI.js");
var Utils = require("./utils");
var md5 = require("./md5.js");
var _ = require('underscore');
var fs = require('fs');
var Mailgun = require('mailgun-js')({
    apiKey: 'key-ffff71fcee9784638da21c7f37207ab5',
    domain: 'sandboxf01b5d36c43d4ed0ba2d37c1a3776f40.mailgun.org'
});
var moment = require('moment');

// load languages
var fr = require('./i18n/fr');
var en = require('./i18n/en');

Parse.Cloud.define("checkauth", function (request, response) {
    if (!request.params.username || !request.params.password) {
        console.log("Missing parameters");
        res.error(422, "Missing parameters"); // HTTP code 422: we received correctly formated data but not enought to proceed
    }

    Parse.Cloud.useMasterKey();

    var username = request.params.username;
    var password = request.params.password;

    // Monext test user : { Login: 'USR1111', Password: 'Usr1111!!!' }
    var nepToken = null;

    return MonextAPI.User.login(username, password).then(function (response) {
        if (response.Code !== 0) {
            console.log("Monext rejected the user");
            return Parse.Promise.error({message: "Monext rejected the user", code: response.Code});
        }
        console.log("Monext accepted the user");
        console.log("DEBUG JULIEN BEGIN");
        console.log(response);
        console.log(response.Code);
        console.log(response.NepToken);
        nepToken = response.NepToken
        console.log(response.NepTokenExpirationTime);
        console.log("DEBUG JULIEN FIN");
        /*
         Response looks like this: {
         "PasswordExpirationInMinutes": 122239,
         "UserRef": "0IF5LHFOF0000913HCJJKJEUW401",
         "Code": 0
         }
         */

        return response.UserRef;
    }).then(function (userRef) {
        return new Parse.Query("_User").equalTo("username", username).first({useMasterKey: true})
    }).then(function (user) {
        user.set("nepToken", nepToken)

        user.save().then(function () {
            response.success(user)
        })
    }).fail(function (err) {
        console.log('checkauth')
        console.log(err)
        response.error({code: 400, error: err})
    })
})

Parse.Cloud.define("available_languages", function (request, response) {

    // return the list of available languages (must be the keys used in the i18n file)
    response.success(["en", "fr"]);

})

Parse.Cloud.define("i18n", function (request, response) {

    var lang = request.params.lang;

    console.log("Requestion translations for lang " + lang);

    // return the correct translations depending on lang
    response.success(lang == 'fr' ? fr : en);
});

Parse.Cloud.define("change_password", function (request, response) {
    console.log("changePassword");
    console.log("REQUEST:");
    console.log(request);

    var username = request.params.username;
    var password = request.params.password;
    var newPassword = request.params.newPassword
    var newPasswordConfirm = request.params.newPasswordConfirm;

    if (!username || username.length === 0 || !password || password.length === 0 || !newPassword || newPassword.length === 0 || !newPasswordConfirm || newPasswordConfirm.length === 0) {

        response.error({code: 422, message: "Missing parameters"}); // HTTP code 422: we received correctly formated data but not enought data to proceed
    }
    else if (newPassword !== newPasswordConfirm) {
        response.error({code: 422, message: "Les nouveaux mots de passe doivent être identiques"});
    }

    return MonextAPI.User.login(username, password).then(function (monextResponse) {
        if (monextResponse.Code !== 0) {
            console.log("Monext rejected the user");
            return Parse.Promise.error({message: "Monext rejected the user", code: monextResponse.Code});
        }
        return MonextAPI.User.modifyPassword(username, password, newPassword).then(function (monextResponse) {
            response.success(monextResponse)
        })
    }).fail(function (error) {
        response.error(error);
    });
});

Parse.Cloud.define("resetpassword", function (request, response) {
    if (!request.params.username) {
        console.log("Missing parameters");
        response.error(422, "Missing parameters"); // HTTP code 422: we received correctly formated data but not anought data to proceed
    }

    var username = request.params.username;

    return MonextAPI.User.resetPassword(username).then(function (monextResponse) {
        if (monextResponse.Code === 0) {
            return response.success();
        }

        return response.error();
    });
});

Parse.Cloud.define("dashboard_transactions", function (request, response) {
    var startDate = request.params.startDate;
    var endDate = request.params.endDate;

    if (!startDate || !endDate) {
        response.error(422, "Missing parameters"); // HTTP code 422: we received correctly formated data but not anought data to proceed
    }

    return Parse.Promise.when([
        new Parse.Query('Transaction').greaterThanOrEqualTo('createdAt', startDate).lessThan('createdAt', endDate).find(),
        new Parse.Query('TransactionCancel').greaterThanOrEqualTo('createdAt', startDate).lessThan('createdAt', endDate).find(),
        new Parse.Query('TransactionCredit').greaterThanOrEqualTo('createdAt', startDate).lessThan('createdAt', endDate).find()
    ]).then(function (transactionRows, transactionCancelRows, transactionCreditRows) {
        var allTransactions = transactionRows.concat(transactionCancelRows).concat(transactionCreditRows);

        return _.chain(allTransactions).sortBy('createdAt').value().reverse();
    }).then(function (allTransactions) {
        response.success(allTransactions);
    });
});

/****** MARCEL *******/
Parse.Cloud.define("add_kiosk_transaction", function (request, response) {
    console.log("BEGIN add_kiosk_transaction")

    var usermane = request.params.username
    var password = request.params.password
    var kioskTransaction = request.params.kioskTransaction;
    if (!kioskTransaction) {
        response.error(422, "Missing parameters"); // HTTP code 422: we received correctly formated data but not enought data to proceed
    }

    return MonextAPI.Transaction.addKioskTransaction(usermane, password, kioskTransaction).then(function (monextResponse) {
        if (monextResponse.data.Code === 0) {
            return response.success();
        }
        console.log("ERROR-add_kiosk_transaction")
        console.log(monextResponse)
        console.log("'----'")
        return response.error();
    }).fail(function (error) {
        return response.error(error);
    });
});

Parse.Cloud.define("proxyauthter", function (request, res) {
    if (!request.params.username || !request.params.password) {
        console.log("Missing parameters");
        res.error(422, "Missing parameters"); // HTTP code 422: we received correctly formated data but not enought to proceed
    }

    //Parse.Cloud.useMasterKey();

    var username = request.params.username;
    var password = request.params.password;

    // Monext test user : { Login: 'USR1111', Password: 'Usr1111!!!' }
    var nepToken = null;


    return MonextAPI.User.login(username, password).then(function (response) {
        if (response.Code !== 0) {
            console.log("Monext rejected the user");
            return Parse.Promise.error({message: "Monext rejected the user", code: response.Code});
        }
        console.log("Monext accepted the user");
        nepToken = response.NepToken;
        return response.UserRef;
    }).then(function (userRef) {
        return MonextAPI.User.findByRef(userRef);
    }).then(function (monextUser) {
        return Parse.Promise.when([
            Parse.Promise.as(monextUser),
            MonextAPI.Merchant.findByRef(monextUser.Users[0].MerchantRef)
        ]);
    }).then(function (data) {
        var monextUser = data[0];
        var monextMerchant = data[1];
        if (monextUser.Code !== 0) {
            response.error(monextUser.Label);
        }

        var contractId = monextUser.Users[0].MerchantRef;
        console.log("merchantRef:");
        console.log(contractId);

        // return an array:[contract, adminRole, commerceRole]
        var findOrCreateContract = function (id, params) {
            console.log('>findOrCreateContract');
            var params = params || {};
            var name = params.name;
            var city = params.city
            var zip = params.zip
            var street = params.street
            var number = params.number

            return new Parse.Query("Contrat").equalTo("contractId", id).first({useMasterKey: true}).then(function (contract) {
                if (contract) {
                    var adminRoleName = 'admin_' + id;
                    var commerceRoleName = 'commerce_' + id;

                    return Parse.Promise.when([
                        contract,
                        new Parse.Query("_Role").equalTo("name", adminRoleName).first({useMasterKey: true}), // Should alway return a role, not null
                        new Parse.Query("_Role").equalTo("name", commerceRoleName).first({useMasterKey: true})  // Should alway return a role, not null
                    ]);
                }

                var newContract = new Parse.Object("Contrat");
                newContract.set("contractId", id);
                newContract.set("name", name);

                newContract.set("city", city);
                newContract.set("zip", zip);
                newContract.set("street", street);
                newContract.set("number", number);

                return newContract.save(newContract.get('data'), {useMasterKey: true}).then(function () {

                    console.log("contract: ", newContract);

                    var buildRolesForContract = function (contract) {
                        var adminRole = new Parse.Role()
                        adminRole.set("contract", contract);
                        adminRole.setName("admin_" + contractId);
                        var adminRoleACL = new Parse.ACL()
                        adminRoleACL.setPublicReadAccess(true);
                        adminRole.setACL(adminRoleACL);

                        var commerceRole = new Parse.Role()
                        commerceRole.set("contract", contract);
                        commerceRole.setName("commerce_" + contractId);
                        var commerceRoleACL = new Parse.ACL()
                        commerceRoleACL.setPublicReadAccess(true);
                        commerceRole.setACL(commerceRoleACL);

                        return {
                            admin: adminRole,
                            commerce: commerceRole
                        };
                    };

                    var roles = buildRolesForContract(newContract);

                    return Parse.Promise.when([
                        Parse.Promise.as(newContract),
                        roles.admin.save().then(function () {
                            return roles.admin
                        }),
                        roles.commerce.save().then(function () {
                            return roles.commerce
                        })
                    ]).then(function (data) {

                        var contract = data[0];
                        var adminRole = data[1];
                        var commerceRole = data[2];
                        console.log("contract: ");
                        console.log(contract);
                        console.log("adminRole");
                        console.log(adminRole);
                        console.log("commerceRole");
                        console.log(commerceRole);

                        var contractACL = new Parse.ACL();
                        contractACL.setRoleReadAccess(adminRole, true);
                        contractACL.setRoleWriteAccess(adminRole, true);
                        contractACL.setRoleReadAccess(commerceRole, true);
                        contractACL.setRoleWriteAccess(commerceRole, false);

                        contract.setACL(contractACL);

                        return Parse.Promise.when([
                            contract.save().then(function () {
                                return contract;
                            }),
                            Parse.Promise.as(adminRole),
                            Parse.Promise.as(commerceRole)
                        ]);
                    });
                });
            });
        };

        var findOrCreateUser = function (params) {
            console.log('>findOrCreateUser');
            var params = params || {}

            var username = params.username;
            var firstname = params.firstname;
            var lastname = params.lastname;

            return new Parse.Query("_User").equalTo("username", username).first({useMasterKey: true}).then(function (user) {


                console.log("findOrCreateUser | tmp pwd? " + MonextAPI.isTmpPassword());
                var h = md5.hex_md5(firstname+lastname);
                var randomPassword = 'c635e8b836f4eab4a029e2787e59e6fb'+h;
                if (user) {
                    console.log("findOrCreateUser | found user:");
                    console.log(user);

                    //var randomPassword = Utils.StringGenerator.getString();
                    user.set("password", randomPassword);
                    user.set("firstname", firstname);
                    user.set("lastname", lastname);
                    user.set("tmpPassword", MonextAPI.isTmpPassword());
                    console.log('findOrCreateUser | found user | nepToken to be saved: ', nepToken);
                    user.set("nepToken", nepToken);

                    // return user.save(user.get('data'),/*{useMasterKey:true}*/{sessionToken:user._sessionToken}).then(function () {
                    return user.save(user.get('data'), /*{useMasterKey:true}*/{useMasterKey: true}).then(function () {
                        return Parse.User.logIn(user.get("username"), randomPassword);
                    }).then(function (user_loggedin) {
                        console.log("current user session token:");
                        console.log(user_loggedin.getSessionToken());
                        return user_loggedin;
                    });
                }

                console.log('findOrCreateUser | signUp');
                return Parse.User.signUp(username, randomPassword).then(function (newUser) {
                    console.log("findOrCreateUser | created user");
                    console.log("findOrCreateUser | created user | newUser", newUser);

                    newUser.set("password", randomPassword);
                    newUser.set("firstname", firstname);
                    newUser.set("lastname", lastname);
                    newUser.set("tmpPassword", MonextAPI.isTmpPassword());
                    console.log('findOrCreateUser | created user | nepToken to be saved: ', nepToken);
                    newUser.set("nepToken", nepToken);

                    return newUser.save(newUser.get('data'), {useMasterKey: true}).then(function () {
                        console.log('findOrCreateUser | created user | return ', newUser);
                        return newUser;
                    });
                });
            })
        };

        console.log("Using company name: ");
        console.log(monextMerchant.CompanyName);

        return findOrCreateContract(contractId, {
            name: monextMerchant.CompanyName,
            zip: monextMerchant.POSAddress.ZipCode,
            city: monextMerchant.POSAddress.Locality,
            street: monextMerchant.POSAddress.StreetName,
            number: monextMerchant.POSAddress.StreetNumber
        }).then(function (data) {
            console.log('findOrCreateContract | then');
            var contract = data[0];
            var adminRole = data[1];
            var commerceRole = data[2];
            console.log("findOrCreateContract | then | contract: ", contract);
            console.log("findOrCreateContract | then | adminRole", adminRole);
            console.log("findOrCreateContract | then | commerceRole", commerceRole);

            if (typeof adminRole == "undefined" || commerceRole == "undefined") {
                var msg = 'mauvaise initialisation de la bdd : ajouter les profils admin_generic & commerce_generic !!!';
                console.error(msg);
                throw msg;
            }

            return findOrCreateUser({
                username: username,
                firstname: monextUser.Users[0].FirstName,
                lastname: monextUser.Users[0].LastName
            }).then(function (user) {
                console.log('findOrCreateUser | then', user);
                var monextRole = monextUser.Users[0].AccreditationProfile;

                var hasAdminRole = monextRole === "MERCHANT_ADMIN";
                var hasCommerceRole = hasAdminRole || monextRole === "MERCHANT_STAFF";

                if (hasAdminRole) {
                    adminRole.getUsers().add(user);
                }

                if (hasCommerceRole) {
                    commerceRole.getUsers().add(user);
                }

                return Parse.Object.saveAll([adminRole, commerceRole], {useMasterKey: true}).then(function (rolesAgain) {

                    var updateRole = function (roleName, roleToAdd) {
                        console.log('>updateRole', roleName, roleToAdd);
                        return new Parse.Query("_Role").equalTo("name", roleName).first({useMasterKey: true}).then(function (role) {
                            console.log('updateRole | find ', roleName, role);
                            var relation = role.relation("roles");
                            relation.add([roleToAdd]);

                            return role.save(role.get('data'), {useMasterKey: true}).then(function () {
                                console.log('updateRole | role.save', role);
                                return role;
                            });
                        });
                    };

                    return Parse.Promise.when([
                        updateRole("admin_generic", rolesAgain[0]),
                        updateRole("commerce_generic", rolesAgain[1])
                    ]).then(function () {
                        console.log('updateRole | then');
                        user.set('contract', contract)
                        return user.save(user.get('data'), {useMasterKey: true}).then(function () {
                            //user.set('nepToken', nepToken)
                            console.log('updateRole | then | user.save', user);
                            user._sessionToken = user.getSessionToken()
                            return user;
                        });
                    });
                });
            })
        });
    }).then(function (user) {
        res.success(user);
    }).fail(function (error) {
        res.error(error);
    });
});

Parse.Cloud.beforeDelete("Article", function (request, response) {
    var softDeletedError = new Parse.Error(12345, "Article soft deleted");

    var article = request.object;
    return new Parse.Query("TransactionArticle").equalTo("article", article).count().then(function (count) {
        if (count > 0) {
            article.set('isDeleted', true);
            return article.save().then(function () {
                return response.error(softDeletedError.code);
            }).fail(function (error) {
                return response.error(error);
            });
        }

        return response.success();
    });
});

Parse.Cloud.beforeDelete("Category", function (request, response) {
    var softDeletedError = new Parse.Error(12345, "Category soft deleted");

    var category = request.object;
    return new Parse.Query("TransactionArticle").equalTo("category", category).count().then(function (count) {
        if (count > 0) {
            category.set('isDeleted', true);
            return category.save().then(function () {
                return response.error(softDeletedError.code);
            }).fail(function (error) {
                return response.error(error);
            });
        }

        return response.success();
    });
});

Parse.Cloud.beforeDelete("Unit", function (request, response) {
    var softDeletedError = new Parse.Error(12345, "Unit soft deleted");

    var unit = request.object;
    return new Parse.Query("TransactionArticle").equalTo("unit", unit).count().then(function (count) {
        if (count > 0) {
            unit.set('isDeleted', true);
            return unit.save().then(function () {
                return response.error(softDeletedError.code);
            }).fail(function (error) {
                return response.error(error);
            });
        }

        return response.success();
    });
});

// TODO: Watch out for model changes
Parse.Cloud.beforeDelete("PaymentMode", function (request, response) {
    var softDeletedError = new Parse.Error(12345, "Unit soft deleted");

    var paymentMode = request.object;
    return new Parse.Query("Transaction").equalTo("paymentMode", paymentMode).count().then(function (count) {
        if (count > 0) {
            paymentMode.set('isDeleted', true);
            return paymentMode.save().then(function () {
                return response.error(softDeletedError.code);
            }).fail(function (error) {
                return response.error(error);
            });
        }

        return response.success();
    });
});

// Mailgun.initialize('sandboxf01b5d36c43d4ed0ba2d37c1a3776f40.mailgun.org', 'key-ffff71fcee9784638da21c7f37207ab5');
Parse.Cloud.define('SendEmail', function (request, response) {
    var tid = request.params.tid;
    var to = request.params.to;
    var image = request.params.image;

    var agentFirstname = request.user.get('firstname');
    var agentLastname = request.user.get('lastname');

    console.log(request);

    if (!tid || !to || to.length == 0) {
        console.error('SendMail: Missing parameters');
        response.error("Uh oh, something went wrong");
        return;
    }

    Parse.Cloud.useMasterKey();

    console.log('check:');
    console.log(request.user);
    console.log(request.user.get('contract'));
    console.log(request.user.get('contract').id);

    return Parse.Promise.when([
        new Parse.Query('Transaction').get(tid),
        new Parse.Query('Contrat').get(request.user.get('contract').id)
    ]).then(function (transaction, contract) {
        if (!transaction) {
            return Parse.Promise.error("couldn't find tid: " + tid);
        }

        if (!contract) {
            return Parse.Promise.error("couldn't find contract: " + request.user.get('contract').id);
        }

        console.log('Found transaction: ');
        console.log(transaction);

        console.log('tid: ');
        console.log(tid);

        return Parse.Promise.when([
            new Parse.Query('TransactionArticle').equalTo('transaction', transaction).find(),
            new Parse.Query('TransactionPaymentMode').equalTo('transaction', transaction).find()
        ]).then(function (transactionArticles, transactionPaymentModes) {
            console.log('articles: ');
            console.log(transactionArticles);
            console.log('length: ');
            console.log(transactionArticles.length);
            console.log('first: ');
            console.log(transactionArticles[0]);

            var articles = [];
            for (var i = 0; i < transactionArticles.length; i++) {
                var ta = transactionArticles[i];
                articles.push({
                    label: ta.get('label'),
                    description: ta.get('description'),
                    price: ta.get('price'),
                    quantity: ta.get('quantity')
                });
            }

            var paymentModes = [];
            for (var i = 0; i < transactionPaymentModes.length; i++) {
                var pm = transactionPaymentModes[i];
                paymentModes.push({
                    name: pm.get('name'),
                    price: pm.get('price')
                });
            }

            var template = fs.readFileSync('./templates/receipt.js', 'utf8');
            var template_to_compile = _.template(template);
            var html = template_to_compile({
                image: image,
                articles: articles,
                paymentModes: paymentModes,
                to: to,
                discount: transaction.get('discount'),
                amountWithheld: transaction.get('amountWithheld'),

                userFirstname: agentFirstname,
                userLastname: ( agentLastname && agentLastname.length > 0 ? agentLastname[0] + '.' : '' ),

                companyName: contract.get('name'),
                companyImageBase64: contract.get('image'),

                number: contract.get('number'),
                street: contract.get('street'),
                zip: contract.get('zip'),
                city: contract.get('city')
            });

            return Mailgun.sendEmail({
                to: to, // TODO insert real email
                from: "postmaster@joeyrogues.com",
                subject: "Ticket de caisse",
                html: html
            }, {
                success: function (httpResponse) {
                    console.log(httpResponse)
                    console.log('email sent');
                },
                error: function (httpResponse) {
                    console.error(httpResponse);
                }
            });
        })
    }).fail(function (error) {
        response.error(error);
    }).done(function () {
        response.success();
    });
});

// Version Monext
Parse.Cloud.define('SendEmailMailgun', function (request, response) {
    var tid = request.params.tid;
    var to = request.params.to;
    var image = request.params.image;
    var format = function number_format(number, decimals, dec_point, thousands_sep) {
        var n = number, prec = decimals;

        var toFixedFix = function (n, prec) {
            var k = Math.pow(10, prec);
            return (Math.round(n * k) / k).toString();
        };

        n = !isFinite(+n) ? 0 : +n;
        prec = !isFinite(+prec) ? 0 : Math.abs(prec);
        var sep = (typeof thousands_sep === 'undefined') ? '' : thousands_sep;
        var dec = (typeof dec_point === 'undefined') ? '.' : dec_point;

        var s = (prec > 0) ? toFixedFix(n, prec) : toFixedFix(Math.round(n), prec);
        //fix for IE parseFloat(0.55).toFixed(0) = 0;

        var abs = toFixedFix(Math.abs(n), prec);
        var _, i;

        if (abs >= 1000) {
            _ = abs.split(/\D/);
            i = _[0].length % 3 || 3;

            _[0] = s.slice(0, i + (n < 0)) +
                _[0].slice(i).replace(/(\d{3})/g, sep + '$1');
            s = _.join(dec);
        } else {
            s = s.replace('.', dec);
        }

        var decPos = s.indexOf(dec);
        if (prec >= 1 && decPos !== -1 && (s.length - decPos - 1) < prec) {
            s += new Array(prec - (s.length - decPos - 1)).join(0) + '0';
        }
        else if (prec >= 1 && decPos === -1) {
            s += dec + new Array(prec).join(0) + '0';
        }
        return s;
    };

    var agentFirstname = request.user.get('firstname');
    var agentLastname = request.user.get('lastname');

    console.log(request);

    if (!tid || !to || to.length == 0) {
        console.error('SendMail: Missing parameters');
        response.error("Uh oh, something went wrong");
        return;
    }

    Parse.Cloud.useMasterKey();

    console.log('check:');
    console.log(request.user);
    console.log(request.user.get('contract'));
    console.log(request.user.get('contract').id);

    return Parse.Promise.when([
        new Parse.Query('Transaction').get(tid),
        new Parse.Query('Contrat').get(request.user.get('contract').id)
    ]).then(function (transaction, contract) {
        if (!transaction) {
            return Parse.Promise.error("couldn't find tid: " + tid);
        }

        if (!contract) {
            return Parse.Promise.error("couldn't find contract: " + request.user.get('contract').id);
        }

        console.log('Found transaction: ');
        console.log(transaction);

        console.log('tid: ');
        console.log(tid);

        return Parse.Promise.when([
            new Parse.Query('TransactionArticle').equalTo('transaction', transaction).find(),
            new Parse.Query('TransactionPaymentMode').equalTo('transaction', transaction).find()
        ]).then(function (transactionArticles, transactionPaymentModes) {
            console.log('articles: ');
            console.log(transactionArticles);
            console.log('length: ');
            console.log(transactionArticles.length);
            console.log('first: ');
            console.log(transactionArticles[0]);

            var articles = {};
            // Articles est la catégorie
            articles.Articles = [];

            for (var i = 0; i < transactionArticles.length; i++) {
                var ta = transactionArticles[i];
                articles.Articles.push({
                    NomArticle: ta.get('label'),
                    //description: ta.get('description'),
                    PrixUnitaire: format(ta.get('price'), 2) + ' €',
                    Quantite: ta.get('quantity'),
                    MontantHt: null,
                    MontantTtc: format((ta.get('price') * ta.get('quantity')), 2) + ' €'
                });
            }

            var paymentModes = [];
            for (var i = 0; i < transactionPaymentModes.length; i++) {
                var pm = transactionPaymentModes[i];
                paymentModes.push({
                    TypeReglement: pm.get('name'),
                    Montant: format(pm.get('price'), 2) + ' €'
                });
            }

            var dateTransaction = moment(transaction.get('createdAt'));
            dateTransaction.add('hours', 1);

            var data = {

                DateTransaction: dateTransaction.format('D/MM/YYYY à HH:mm'),
                //DateTransaction: moment(transaction.get('createdAt')).utcOffset('+0100').format("D MMMM YYYY à hh:mm"),
                PhotoEntreprise: image,

                Reglement: paymentModes,

                AdresseDestinataire: to,
                Remise: format(transaction.get('discount'), 2) + ' €',
                TotalPaye: format(transaction.get('amountWithheld'), 2) + ' €',
                //TotalPanier:  format(transaction.get('amount'),2 ) + ' €',
                TotalPanier: format(transaction.get('discount') + transaction.get('amountWithheld'), 2) + ' €',

                // NomCommercant:  agentFirstname + ( agentLastname && agentLastname.length > 0 ? agentLastname: '' ),
                NomCommercant: agentFirstname + ( agentLastname && agentLastname.length > 0 ? ' ' + agentLastname[0] + '.' : '' ),
                Vendeur: 'Claude',

                // compan:    contract.get('name'),
                PhotoEntreprise: contract.get('image'),
                //AdresseCommercant: contract.get('number') + ' ' + contract.get('street') + ' ' +  contract.get('zip') + ' ' + contract.get('city')
                AdresseCommercant: contract.get('zip') + ' ' + contract.get('city')
            };

            data.Articles = articles;

            console.log(data);

            return MonextAPI.Email.sendEmail(data
                , {
                    success: function (httpResponse) {
                        console.log(httpResponse)
                        console.log('email sent');
                    },
                    error: function (httpResponse) {
                        console.error(httpResponse);
                    }
                });
        })
    }).fail(function (error) {
        response.error(error);
    }).done(function () {
        response.success();
    });
});

Parse.Cloud.define('SendContactEmail', function (request, response) {
    var to = request.params.to;
    var username = request.params.username;
    var subject = request.params.subject;
    var message = request.params.message;

    console.log(request);

    if (!to) {
        to = "support.letspay@sfr.fr" // "Jean-Philippe.BROCARD@monext.net",
    }

    if (!to || !username || !message || !subject) {
        console.error('SendMail: Missing parameters');
        response.error("Uh oh, something went wrong");
        return;
    }

    var template = fs.readFileSync('./templates/contact.js', 'utf8');
    var template_to_compile = _.template(template);
    var html = template_to_compile({
        username: username,
        message: message
    });

    return Mailgun.sendEmail({
        to: to,
        from: "postmaster@joeyrogues.com",
        subject: subject,
        html: html
    }, {
        success: function (httpResponse) {
            response.success('OK');
        },
        error: function (httpResponse) {
            response.error(error);
        }
    });
});

var Transaction = require('./transaction');
Parse.Cloud.afterSave('Transaction', function (request) {
    console.log(request);

    Parse.Cloud.useMasterKey();
    return new Parse.Query('Contrat').get(request.user.get('contract').id).then(function (contract) {
        if (!contract) {
            return Parse.Error('Object not found: Contract');
        }

        return contract;
    }).then(function (contract) {
        var updateParams = {
            tid: request.object.get('objectId'),
            amountWithheld: +request.object.get('amountWithheld'),
            contractId: contract.get('contractId')
        };

        return Parse.Promise.when([
            Transaction.updateDayView(updateParams)
        ]).then(function (dayRow) {
            console.log('success');
            console.log(dayRow);
        }).fail(function (error) {
            console.log('failure');
            console.log(error);
        });
    });
});

var TransactionCancel = require('./transaction-cancel');
Parse.Cloud.afterSave('TransactionCancel', function (request) {
    console.log(request);

    Parse.Cloud.useMasterKey();
    return new Parse.Query('Contrat').get(request.user.get('contract').id).then(function (contract) {
        if (!contract) {
            return Parse.Error('Object not found: Contract');
        }

        return contract;
    }).then(function (contract) {
        var updateParams = {
            tid: request.object.get('objectId'),
            amountWithheld: +request.object.get('amountWithheld'),
            contractId: contract.get('contractId')
        };

        return Parse.Promise.when([
            TransactionCancel.updateDayView(updateParams)
        ]).then(function (dayRow) {
            console.log('success');
            console.log(dayRow);
        });
    }).fail(function (error) {
        console.log('failure');
        console.log(error);
    });
});

var TransactionCredit = require('./transaction-credit');
Parse.Cloud.afterSave('TransactionCredit', function (request) {
    console.log(request);

    Parse.Cloud.useMasterKey();
    return new Parse.Query('Contrat').get(request.user.get('contract').id).then(function (contract) {
        if (!contract) {
            return Parse.Error('Object not found: Contract');
        }

        return contract;
    }).then(function (contract) {
        var updateParams = {
            tid: request.object.get('objectId'),
            amountWithheld: +request.object.get('amountWithheld'),
            contractId: contract.get('contractId')
        };

        return Parse.Promise.when([
            TransactionCredit.updateDayView(updateParams)
        ]).then(function (dayRow) {
            console.log('success');
            console.log(dayRow);
        });
    }).fail(function (error) {
        console.log('failure');
        console.log(error);
    });
});

