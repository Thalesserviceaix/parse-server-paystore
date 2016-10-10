var DateUtil = require('cloud/DateUtil')

var Transaction = {
    updateDayView: function (params) {
        console.log('updateDayView(): ', params);
        console.log(params);

        var today = new Date();
        var todaySplit = today.toISOString().split(/[-T]+/);
        var todayISO = {
            yyyy: todaySplit[0],
            mm:   todaySplit[1],
            dd:   todaySplit[2],
            ww:   new DateUtil(today).getWeek() + ''   
        };
        var adminRoleName    = "admin_"    + params.contractId;
        var commerceRoleName = "commerce_" + params.contractId;

        return Parse.Promise.when([
            new Parse.Query(Parse.Role).equalTo("name", adminRoleName).first(),
            new Parse.Query(Parse.Role).equalTo("name", commerceRoleName).first(),
        ]).then(function (adminRole, commerceRole) {
            return new Parse.Query('TransactionDayView')
                .equalTo('contractId', params.contractId)
                .equalTo('yyyy', todayISO.yyyy)
                .equalTo('mm',   todayISO.mm)
                .equalTo('dd',   todayISO.dd)
                .first().then(function (row) {

                var row = row || new Parse.Object('TransactionDayView');

                row.set('amountWithheld', (row.get('amountWithheld') || 0) + params.amountWithheld);
                row.set('count',          (row.get('count')          || 0) + 1);
                row.set('contractId', params.contractId);
                row.set('yyyy', todayISO.yyyy);
                row.set('mm',   todayISO.mm);
                row.set('dd',   todayISO.dd);
                row.set('ww',   todayISO.ww);

                 console.log('DEBUG JULIEN : params' + params)
                console.log('DEBUG JULIEN : params.amountWithheld ' + params.amountWithheld) 
                console.log('DEBUG JULIEN : row.get(amountWithheld)' +row.get('amountWithheld'))

                // Set ACL
                var acl = new Parse.ACL();
                acl.setRoleReadAccess(commerceRole, true);
                acl.setRoleWriteAccess(commerceRole, false);
                acl.setRoleReadAccess(adminRole, true);
                acl.setRoleWriteAccess(adminRole, true);
                row.set('ACL', acl);

                return row.save().then(function () {
                    console.log('day row: ');
                    console.log(row);

                    return row;
                });
            });
        });
    }
};

module.exports = Transaction;