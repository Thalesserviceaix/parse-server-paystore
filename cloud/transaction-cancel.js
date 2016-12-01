var DateUtil = require('./DateUtil')




var TransactionCancel = {
    updateDayView: function (params) {
        console.log('updateDayView()');
        console.log(params);

        var today = new Date(); // Should it be today ?
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
            new Parse.Query(Parse.Role).equalTo("name", adminRoleName).first({useMasterKey: true}),
            new Parse.Query(Parse.Role).equalTo("name", commerceRoleName).first({useMasterKey: true}),
	    ]).then(function (data) {
            var adminRole = data[0];
            var commerceRole = data[1];
		    return new Parse.Query('TransactionCancelDayView')
                .equalTo('userId', params.userId)
                .equalTo('transactionId', params.tid)
                .equalTo('yyyy', todayISO.yyyy)
                .equalTo('mm',   todayISO.mm)
                .equalTo('dd',   todayISO.dd)
                .first({useMasterKey: true}).then(function (row) {

                var row = row || new Parse.Object('TransactionCancelDayView');

                row.set('amountWithheld', (row.get('amountWithheld') || 0) + params.amountWithheld);
                row.set('count',          (row.get('count')          || 0) + 1);
                row.set('yyyy', todayISO.yyyy);
                row.set('mm',   todayISO.mm);
                row.set('dd',   todayISO.dd);
                row.set('ww',   todayISO.ww);
                row.set('userId',   params.userId);

                // Set ACL
                var acl = new Parse.ACL();
                acl.setRoleReadAccess(commerceRole, true);
                acl.setRoleWriteAccess(commerceRole, false);
                acl.setRoleReadAccess(adminRole, true);
                acl.setRoleWriteAccess(adminRole, true);
                row.set('ACL', acl);

                    console.log('TransactionCancel | updateDayView | then | row',row)

                return row.save().then(function () {
                    console.log('TransactionCancel | updateDayView | then | save | row',row);

				    return row;
			    });
            });
        });
	},

      updateDayViewAdmin: function (params) {
        console.log('updateDayViewAdmin()');
        console.log(params);

        var today = new Date(); // Should it be today ?
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
            new Parse.Query(Parse.Role).equalTo("name", adminRoleName).first({useMasterKey: true}),
            new Parse.Query(Parse.Role).equalTo("name", commerceRoleName).first({useMasterKey: true}),
        ]).then(function (data) {
            var adminRole = data[0];
            var commerceRole = data[1];
            return new Parse.Query('TransactionCancelDayView')
                .equalTo('userId', '----')
                .equalTo('transactionId', params.tid)
                .equalTo('yyyy', todayISO.yyyy)
                .equalTo('mm',   todayISO.mm)
                .equalTo('dd',   todayISO.dd)
                .first({useMasterKey: true}).then(function (row) {

                var row = row || new Parse.Object('TransactionCancelDayView');

                row.set('amountWithheld', (row.get('amountWithheld') || 0) + params.amountWithheld);
                row.set('count',          (row.get('count')          || 0) + 1);
                row.set('yyyy', todayISO.yyyy);
                row.set('mm',   todayISO.mm);
                row.set('dd',   todayISO.dd);
                row.set('ww',   todayISO.ww);
                row.set('userId', '----');

                // Set ACL
                var acl = new Parse.ACL();
                acl.setRoleReadAccess(commerceRole, true);
                acl.setRoleWriteAccess(commerceRole, false);
                acl.setRoleReadAccess(adminRole, true);
                acl.setRoleWriteAccess(adminRole, true);
                row.set('ACL', acl);

                    console.log('TransactionCancel | updateDayViewAdmin | then | row',row)

                return row.save().then(function () {
                    console.log('TransactionCancel | updateDayViewAdmin | then | save | row',row);

                    return row;
                });
            });
        });
    }


};

module.exports = TransactionCancel;