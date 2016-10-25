##Docs
* [Docs JS](https://parseplatform.github.io/docs/js/guide/)
* [Javascript SDK API](https://parseplatform.github.io/Parse-SDK-JS/api/)

##Tester les webservices
installer [Postman](https://www.getpostman.com/) et importer les collections, environnements et globals depuis tests/api/
puis newman pour lancer en ligne de commande 
```
npm i -g newman
```
tester l'api de Monext
```
newman run tests/Paystore-Monext-api.postman_collection.json -e tests/Paystore-Monext-api-homo.postman_environment.json -g tests/globals.postman_globals.json
```
tester l'api Parse
```
newman run tests/Paystore-Parse-Api.postman_collection.json -e tests/Paystore-Parse-api-Heroku.postman_environment.json -g tests/globals.postman_globals.json
```

##Migration
* [Guide migration](https://parse.com/migration)
* [Parse-Server-Guide](https://github.com/ParsePlatform/parse-server/wiki/Parse-Server-Guide)
* [Compatibility-with-Hosted-Parse](https://github.com/ParsePlatform/Parse-Server/wiki/Compatibility-with-Hosted-Parse#Cloud-Code)
* [Session Migration Tutorial](https://parse.com/tutorials/session-migration-tutorial)
* [Parse Dashboard](https://github.com/ParsePlatform/parse-dashboard)

##Bugs connus

* [cloudcode: Parse.User( ) + save => error: code=206, message=cannot modify user](https://github.com/ParsePlatform/parse-server/issues/1674)
* [code: 206 error: cannot modify user ...](https://github.com/ParsePlatform/parse-server/issues/1729)
* [parse-server-js-sdk-error-206-when-saving-a-user-object](http://stackoverflow.com/questions/38564646/parse-server-js-sdk-error-206-when-saving-a-user-object)
* [i-can-not-update-a-record-in-parse-error-object-not-found-for-update-code-101](http://stackoverflow.com/questions/22190264/i-can-not-update-a-record-in-parse-error-object-not-found-for-update-code-1)
* [Using the master key in a save hook](https://github.com/ParsePlatform/parse-server/issues/1658)