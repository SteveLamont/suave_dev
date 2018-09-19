var DBH = require( './database-handler' );
var crypto = require('crypto');
var Server = require('mongodb').Server;
// JUPYTER
var ObjectID = require('mongodb').ObjectID;
// JUPYTER
var moment = require('moment');
var fsx = require('fs-extra');
var fs = require('fs'); //file system
var path = require('path');
var loader = require('./collection-loader');
var GL = require('../global');
var AN = require('./annotation-manager');
var geocoder = require('./geocodeAppend');

var surveys;
DBH.connectDB( [ "surveys" ],
	       function( result ) {

		   surveys = result["surveys"];

	       } );		   

/**
 * Create a new survey
 * @param {JSON} files
 * @param {String} user
 * @param {Function} callback
 */
exports.createNewSurvey = function (files, user, callback) {

    // JUPYTER
    //clean name if it contains quotes
    if (user.indexOf('"') >= 0) {
	user = user.replace(/\"/g, "");
    }
    // JUPYTER
    
    //find the survey in database
    var name = files.body.name.replace(/[^\w]/gi, '_');
    surveys.findOne({
	"name": name,
	"user": user
    }, function (e, o) {
	if (o) {
	    callback("Name is taken");
	} else {
	    //read the raw file
	    fs.readFile(files.file.path, function (err, data) {
		if (!fs.existsSync(__dirname + "/../../public/surveys")) {
		    fs.mkdirSync(__dirname + "/../../public/surveys");
		}
		
		var newPath = __dirname + "/../../public/surveys/" + user + "_"
		    +name + ".csv";
		//save the survey
		fs.writeFile(newPath, data, function (err) {
		    if (err) {
			callback(err);
		    } else {
			geocoder.processFile(loader, newPath, function () {
			    var date = new Date();
			    //save into the database
			    surveys.insert({
				"fullname": files.body.name,
				"name": name,
				"user": user,
				"csv": newPath,
				"view": "grid",
				"views": 1110000,
				"collection": "default",
				"hidden": 0,
				"date": date.toString(),
				"originalname": files.file.originalname
			    }, callback);
			});
		    }
		});
		
		//initialize the about survey page
		var aboutPath = __dirname + "/../../public/surveys/" + user + "_"
		    +name + "about.html"
		var aboutContent = GL.getAbout(1) + files.body.name + GL.getAbout(2)
		    + GL.getAbout(3) + GL.getAbout(4) + GL.getAbout(5);
		fs.writeFile(aboutPath, aboutContent, function (err) {
		    if (err) {
			callback(err);
		    }
		});
	    });
	}
    });
}

/**
 * Replace a survey with a new csv
 * @param {JSON} files: req param
 * @param {String} user
 * @param {Function} callback
 */
exports.replaceSurvey = function (files, user, callback) {
    //find the survey in the database
    surveys.findOne({
	"name": files.body.name,
	"user": user
    }, function (e, o) {

	if (e) {
	    callback("Survey does not exist!");
	} else {
	    // JUPYTER
	    var name =
		files.file.originalname.replace( /\.csv$/, "" ).replace(/[^\w]/gi, '_');
	    var newPath = __dirname + "/../../public/surveys/" + user + "_"
		+name + ".csv";
	    // JUPYTER
	    var survey = o;
	    //reset the survey's parameters in database
	    surveys.findAndModify(
		{
		    "name": files.body.name,
		    "user": user
		}, [["name", '1']],
		/* OLD			{$set: {collection: {name: "default"}, iName: "", "originalname": files.file.originalname}},
		 */
		// JUPYTER
		{
		    $set: {
			collection: {
			    name: "default"
			},
			iName: "",
			csv: newPath,
			originalname: files.file.originalname
		    }
		},
		// JUPYTER
		
		{
		    new: true
		}, function (e, o) {
		    if (e)
			callback(e);
		});
	    
	    /*
	      surveys.findAndModify({"name":files.body.name, "user": user}, [["name", '1']],{$set: {iName: ""}}, {new:true}, function(e, o){
	      if(e) callback(e);
	      });*/
	    
	    //read new raw csv file
	    fs.readFile(files.file.path, function (err, data) {
		if (!fs.existsSync(__dirname + "/../../public/surveys")) {
		    fs.mkdirSync(__dirname + "/../../public/surveys");
		}
		/* OLD
		   var name = files.body.name.replace(/ /g,"-");
		*/
		// JUPYTER
		//spl:070618 -- wrong name was being set.
		var name = o.fullname.replace(/[^\w]/gi, '_');
		// JUPYTER
		var newPath = __dirname + "/../../public/surveys/" + user + "_"
		    +name + ".csv";
		//save the file
		fs.writeFile(newPath, data, function (err) {
		    if (err) {
			callback( "writeFile error: " + err);
		    } else {
			callback(null, survey);
		    }
		});
	    });
	}
    });
}

// JUPYTER
/*Written by Zeppelin Vanbarriger (3/2/18) */

/**
 * Finds survey matching filename and clones it under new user
 * @param old_name Name of survey user wishes to clone
 * @param new_name Name of (new) cloned survey
 * @param author User of original survey
 * @param user User cloning the survey
 * @param callback function to transmit errors
 */

exports.cloneSurvey = function (old_name, new_name, author, user, callback) {
    
    //clean name if it contains quotes
    if (user.indexOf('"')) {
	user.replace(/"/g, "");
    }
    
    //check if user has made a survey with this name before
    surveys.findOne({
	"name": new_name,
	"user": user
    }, function (e, o) {
	if (o) {
	    callback("Name is taken.");
	} else {
	    //check if survey user wishes to clone exists
	    surveys.findOne({
		"name": old_name,
		"user": author
	    }, function (e, doc) {
		if (!doc) {
		    callback("Survey does not exist.");
		} else {
		    //find old location of survey
		    var old_path = __dirname + "/../../public/surveys/" + author + "_"
			+ old_name + ".csv";
		    
		    var fullname = new_name;
		    new_name = new_name.replace(/[^\w]/gi, '_');
		    
		    //copy that survey data
		    fs.readFile(old_path, function (err, survey_data) {
			
			//create path for cloned survey
			var new_path = __dirname + "/../../public/surveys/" + user + "_"
			    + new_name + ".csv";
			
			//write cloned survey to file system
			fs.writeFile(new_path, survey_data, function (err) {
			    if (err) {
				callback(err);
			    } else {
				
				var date = new Date();
				
				//copy about survey page from original for the cloned survey
				var old_about_path = __dirname + "/../../public/surveys/" + author + "_"
				    + old_name + "about.html";
				
				var new_about_path = __dirname + "/../../public/surveys/" + user + "_"
				    + new_name + "about.html";
				
				fs.readFile(old_about_path, function (err, about_data) {
				    
				    if (err) {
					callback(err);
				    } else {
					fs.writeFile(new_about_path, about_data, function (err) {
					    if (err) {
						callback(err);
					    } else {
						//add to database
						surveys.insert({
						    "fullname": fullname,
						    "name": new_name,
						    "user": user,
						    "csv": new_path,
						    "view": "grid",
						    "views": doc.views,
						    "collection": doc.collection,
						    "hidden": 0,
						    "date": date.toString(),
						    "originalname": doc.originalname,
						    "dzc": doc.dzc
						}, callback(null, doc));
						
					    }
					});
				    }
				});
			    }
			});
		    });
		}
	    })
	}
    });
}
/**
 * Change the image collection for a survey
 * @param {JSON} files: req param
 * @param {String} user
 * @param {String} collection
 * @param {Function} callback
 */

// JUPYTER

exports.changeCollection = function (files, user, collection, callback) {
    // JUPYTER
    //clean name if it contains quotes
    if (user.indexOf('"') >= 0) {
	user = user.replace(/\"/g, "");
    }
    // JUPYTER
    var imgPath =
	    __dirname +
        "/../../public/surveys/" +
        user + "_" + files.body.name;
    if (!fs.existsSync(imgPath)) {
	fs.mkdirSync(imgPath);
    }
    var filePath =
        __dirname +
        "/../../public/surveys/" +
        user + "_" + files.body.name + ".csv";

    //modify the paras in database
    surveys.findAndModify({
	"name": files.body.name,
	"user": user
    }, [["name", '1']], {
	$set: {
	    collection: collection
	}
    }, {
	new: true
    }, function (e, o) {
	//		if(e) callback(e);
	// JUPYTER
	if (e)
	    callback("Error in db call");
	// JUPYTER
    });
    
    //modify and save the csv file
    var data;
    if (!collection.name)
	collection = JSON.parse(collection);
    loader.setCSV(filePath, collection, function (o, message) {
	if (o == "err") {
	    callback(message);
	} else {
	    data = o;
	    imgIndex = data[0].indexOf('#img');
	    imgSet = {};
	    for (var i = 1; i < data.length; i++) {
		if (!imgSet[data[i][imgIndex]])
		    imgSet[data[i][imgIndex]] = 1;
	    }
	    
	    loader.saveCSV(filePath, data, function (error) {
		if (error) {
		    callback("Unable to save file");
		} else {
		    loader.copyImages(imgPath, Object.keys(imgSet), function (error) {
			if (error) {
			    callback("Unable to match image set");
			} else {
			    callback(null);
			}
		    })
		}
	    });
	}
    });
}

/**
 * Change the image definition for a survey
 * @param {JSON} files: req param
 * @param {String} user
 * @param {String} dzc
 * @param {Function} callback
 */
exports.changeImageDefinition = function (files, user, dzc, callback) {
    // JUPYTER
    //clean name if it contains quotes
    if (user.indexOf('"') >= 0) {
	user = user.replace(/\"/g, "");
    }
    // JUPYTER
    //modify the paras in database
    surveys.findAndModify({
	"name": files.body.name,
	"user": user
    }, [["name", '1']], {
	$set: {
	    "dzc": dzc
	}
    }, {
	new: true
    }, function (e, o) {
	if (e)
	    callback(e);
	else
	    callback(null);
    });
}

/**
 * Change #name tag for the csv file
 * @param {JSON} files: req param
 * @param {String} user
 * @param {Function} callback
 */
exports.changeCollectionItemName = function (files, user, callback) {
    var filePath = __dirname + "/../../public/surveys/" + user + "_"
	+files.body.name + ".csv";
    
    surveys.findAndModify({
	"name": files.body.name,
	"user": user
    }, [["name", '1']], {
	$set: {
	    iName: files.body.iName
	}
    }, {
	new: true
    }, function (e, o) {
	if (e)
	    callback(e);
    });
    
    //load csv data
    var data;
    loader.setCSViName(filePath, files.body.iName, function (o) {
	if (o == "err") {
	    callback("Unable to read file");
	} else {
	    data = o;
	    loader.saveCSV(filePath, data, function (e) {
		if (e) {
		    callback("Unable to save file")
		} else {
		    callback(null);
		}
	    });
	}
    });
}

/**
 * Get surveys for a user
 * @param {String} username
 * @param {Function} callback: 1.err 2. output
 */
exports.getSurveyByUsername = function (username, callback) {
    surveys.find({
	user: username
    }).toArray(function (e, o) {
	callback(null, o);
    });
}

/**
 * Get surveys for users
 * @param {String} username
 * @param {Function} callback: 1.err 2. output
 */
exports.getSurveysByUserList = function (usernames, callback) {
    var users = usernames.map(function (user) {
	return user.user;
    });
    //spl:070518 Changed semantics to newer API.
    surveys.aggregate([
	// Match the selected documents by "user"
	{
	    "$match": {
		"user": {
		    "$in": users
		}
	    }
	}
    ] ).toArray( ( err, res ) => {

	if (err) {
	    callback(err, null);
	} else {
	    callback(err, res);
	}
    } );

}

/**
 * Get unhidden surveys for public purpose
 * @param {String} username
 * @param {Function} callback: 1.err 2. output
 */
exports.getPublicSurveyByUsername = function (username, callback) {
    surveys.find({
	user: username,
	"hidden": 0
    }).toArray(function (e, o) {
	callback(null, o);
    });
}

/**
 * Delete all surveys
 * @param {Function} callback: 1.err
 */
exports.delAllRecords = function (callback) {
    var tmp = __dirname + "/../surveys/*";
    var files = __dirname + "/../../public/surveys/*";
    fsx.remove(tmp, function (err) {
	if (err)
	    return console.error(err);
    });
    fsx.remove(files, function (err) {
	if (err)
	    return console.error(err);
    });
    surveys.remove({}, callback);
}

/**
 * Delete surveys for a user
 * @param {String} username
 * @param {Function} callback: 1.err 2. output
 */
exports.deleteSurvey = function (user, callback) {
    var tmp = __dirname + "/../surveys/*";
    var file = __dirname + "/../../public/surveys/" + user + "_*";
    fsx.remove(tmp, function (err) {
	if (err)
	    return console.error(err);
    });
    fsx.remove(file, function (err) {
	if (err)
	    return console.error(err);
    });
    
    surveys.find({
	"user": user
    }, {
	name: 1
    }).toArray(function (error, survey) {
	for (var i = 0; i < survey.length; i++) {
	    AN.deleteSnapshotsBySurvey(survey[i].name, user, function (e, o) {
		if (e)
		    callback(e);
	    });
	}
	surveys.remove({
	    "user": user
	}, callback);
    });
}

/**
 * Delete a survey
 * @param {String} filename
 * @param {String} user
 * @param {Function} callback: 1. err
 */
exports.deleteSurveyByName = function (filename, user, callback) {
    var tmp = __dirname + "/../surveys/*";
    var file = __dirname + "/../../public/surveys/" + user + "_" + filename + "*";
    fsx.remove(tmp, function (err) {
	if (err)
	    return console.error(err);
    });
    fsx.remove(file, function (err) {
	if (err)
	    return console.error(err);
    });
    surveys.remove({
	"name": filename,
	"user": user
    });
    AN.deleteSnapshotsBySurvey(filename, user, function (e, o) {
	if (e)
	    callback(e);
	else
	    callback();
    });
}

/**
 * Hide a survey by filename and user
 * @param {String} filename
 * @param {String} user
 * @param {Function} callback: 1. err 2.output
 */
exports.hideSurveyByNameID = function (filename, user, callback) {
    surveys.findOne({
	"name": filename,
	"user": user
    }, function (e, o) {
	if (e) {
	    callback(e);
	} else {
	    if (o.hidden == 1)
		o.hidden = 0;
	    else
		o.hidden = 1;
	    surveys.save(o, callback);
	}
    });
}

/**
 * Change a survey's default view
 * @param {String} filename
 * @param {String} user
 * @param {String} view: default view to be updated
 * @param {Function} callback: 1. err 2.output
 */
exports.changeViewByNameID = function (filename, user, view, callback) {
    surveys.findOne({
	"name": filename,
	"user": user
    }, function (e, o) {
	if (e) {
	    callback(e);
	} else {
	    o.view = view;
	    surveys.save(o, callback);
	}
    });
}

/**
 * Change a survey's view options
 * @param {String} filename
 * @param {String} user
 * @param {String} views: view options to be updated
 * @param {Function} callback: 1. err 2.output
 */
exports.changeViewOptionsByNameID = function (filename, user, views, callback) {
    surveys.findOne({
	"name": filename,
	"user": user
    }, function (e, o) {
	if (e) {
	    callback(e);
	} else {
	    o.views = views;
	    surveys.save(o, callback);
	}
    });
}

/**
 * Get a survey's view options
 * @param {String} filename
 * @param {String} user
 * @param {Function} callback: 1. err 2.output
 */
exports.getViewOptionsByName = function (filename, user, callback) {
    surveys.findOne({
	"name": filename,
	"user": user
    }, function (e, o) {
	if (e) {
	    callback(e);
	} else {
	    callback(null, o.views);
	}
    });
}

/**
 * Get a survey's dzc url
 * @param {String} user
 * @param {String} filename
 * @param {Function} callback: 1. err 2.output
 */
exports.getSurveyDzc = function (user, filename, callback) {
    surveys.findOne({
	"name": filename,
	"user": user
    }, function (e, o) {
	if (e) {
	    callback(e);
	} else {
	    if ( o != null )
		callback(null, o.dzc);
	    else
		callback( "Data for survey " + filename + " not found." );
	}
    });
}

/**
 * Change a survey's dzc url
 * @param {String} user
 * @param {String} filename
 * @param {String} dzc: dzc url
 * @param {Function} callback: 1. err 2.output
 */
exports.changeSurveyDzc = function (filename, user, dzc, callback) {
    surveys.findOne({
	"name": filename,
	"user": user
    }, function (e, o) {
	if (e) {
	    callback(e);
	} else {
	    o.dzc = dzc;
	    surveys.save(o, callback);
	}
    });
}
