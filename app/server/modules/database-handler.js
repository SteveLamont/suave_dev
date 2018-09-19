var MongoDB = require('mongodb').MongoClient;

var dbPort = process.env.STOREPORT || 27017;
var dbHost = process.env.STOREHOST || 'localhost';
var dbName = process.env.STOREDB || 'suave';

exports.connectDB = function( collections, callback ) {

    var url = "mongodb://" + dbHost + ":" + dbPort + "/" + dbName;

    MongoDB.connect( url,
		     function ( err, client ) {

			 var result = {};
			 for ( var i in collections ) {

			     var coll = collections[i];

			     result[coll] =
				 client.db( dbName ).collection( coll );

			 }
			 callback( result );

		     } );


}

		     
