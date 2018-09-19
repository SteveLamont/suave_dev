var DBH = require('./database-handler');
var crypto 		= require('crypto');
var ObjectId = require('mongodb').ObjectID;
var Server 		= require('mongodb').Server;
var moment 		= require('moment');
var fsx = require('fs-extra');
var fs = require('fs'); //file system
var path = require('path');
var loader = require('./collection-loader');
var GL = require('../global');

var surveys;
var snapshots;
var comments;

DBH.connectDB( [ 'surveys', 'snapshots', 'comments' ],
	       function( result ) {

		   surveys = result['surveys'];
		   snapshots = result['snapshots'];
		   comments = result['comments'];

	       } );


/**
* Get a snapshot by id
* @param {String} id
* @param {Function} callback: 1. err 2.output
*/
exports.getSnapshotById = function(id, callback){
	var newId = new ObjectId(id);
	snapshots.findOne({_id: newId}, function(e, o){
		if(e){
			callback(error, null);
		}else{
			callback(null, o);
		}
	});
};

/**
* Get a snapshot's paraid by querying with parameters,
* if queried item doesn't exist, insert a new one
* @param {String} file
* @param {String} user
* @param {JSON} para
* @param {JSON} graphPara: used to render chart
* @param {Function} callback: 1. err 2.output
*/
exports.getParaIdByParamters = function(file, user, para, graphPara, callback){
	para.file = file;
	snapshots.findOne(para, function(e, o){
		if(e){
			callback(e, null);
		}
		if(o != null){
      callback(null, o._id);
    }else{
			para.file = file;
			para.user = user;
			para.graph_para = graphPara;
			var date = new Date();
			para.date = date.toString();
			snapshots.insert(para, function(error, result){
				if(e){
					callback(e, null);
				} else{
		      callback(null, para._id);
				}
      });
		}
	});
};

/**
* Add a comment to snapshot by parameters
* @param {String} file
* @param {String} user
* @param {JSON} para
* @param {JSON} graphPara: used to render chart
* @param {String} comment
* @param {String} replyUser: who commented
* @param {Function} callback: 1. err 2.output
*/
exports.addCommentByParameters = function(file, user, para, graphPara, comment, replyUser, callback){
  snapshots.findOne(para, function(e, o){
		var date = new Date();
    if(o != null){
      comments.insert({"user": replyUser, "owner": user, "content": comment, "para_id": o._id,
      "date": date.toString()}, function(e, out){
        if(e){
          callback(e);
        }else{
          callback(null);
        }
      });
    }else{
			para.file = file;
			para.user = user;
			para.graph_para = graphPara;
			para.date = date.toString();
      snapshots.insert(para, function(error, result){
        comments.insert({"user": replyUser, "owner": user,"content": comment, "para_id": para._id,
        "date": date.toString()}, function(e, o){
          if(e){
            callback(e);
          }else{
            callback(null);
          }
        });
      });
    }
	});
};

/**
* Query the databse to get comments by parameters
* @param {JSON} para
* @param {Function} callback: 1. err 2.output
*/
exports.getCommentsByParameters = function(para, callback){
  snapshots.findOne(para, function(e, o){
		if(e){
			callback(e, null);
		}else{
			//check if there exists such a paramter in the database
			if(o == null){
				callback(null, null);
			}else{
				comments.find({para_id: o._id}).toArray(function(error, result){
	        if(error){
						callback(error, null);
					}else if(result.length == 0){
						//check if there exists at least one comment in the database
						callback(null, null);
					}else{
						//found any
						callback(null, result);
					}
	      });
			}
		}
	});
};

/**
* Query the databse to get comments by parameters without using filters
* @param {JSON} para
* @param {Function} callback: 1. err 2.output
*/
exports.getCommentsByParametersWithoutFilters = function(para, callback){
  snapshots.find(para, {_id:1}).toArray(function(e, o){
		if(e){
			callback(e, null);
		}else{

			var ids = [];
			for(var i = 0; i < o.length; i++){
				ids.push(o[i]._id);
			}
			comments.find({para_id:{$in: ids}}).toArray(function(error, result){
        if(error){
					callback(error, null);
				}else if(result.length == 0){
					//check if there exists at least one comment in the database
					callback(null, null);
				}else{
					//found any
					callback(null, result);
				}
      });

		}
	});
};

/**
* Get comments by parameter id
* @param {String} id
* @param {Function} callback: 1. err 2.output
*/
exports.getCommentsById = function(id, callback){
	var newId = new ObjectId(id);
	comments.find({para_id: newId}).toArray(function(error, result){
    if(error){
			callback(error, null);
		}else{
			//found any
			callback(null, result);
		}
  });
};

/**
* Add a comment by parameter id
* @param {String} id
* @param {String} user: who commented
* @param {String} owner: who owns the survey
* @param {String} comment: content
* @param {Function} callback: 1. err 2.output
*/
exports.addCommentById = function(id, user, owner, comment, callback){
	var newId = new ObjectId(id);
	var date = new Date();
	comments.insert({"content": comment, "user": user, "owner": owner,"para_id": newId,
	"date": date.toString()}, function(e, o){
		if(e){
			callback(e);
		}else{
			comments.find({para_id: newId}).toArray(function(error, result){
		    if(error){
					callback(error, null);
				}else{
					//found any
					callback(null, result);
				}
		  });
		}
	});
};

/**
* Delete a comment by parameter id
* @param {String} id
* @param {Function} callback: 1. err 2.output
*/
exports.deleteCommentsById = function(id, callback){
	var ids = [];
	for(var i = 0; i < id.length; i++){
		ids.push(new ObjectId(id[i]));
	}
	comments.remove({_id:{$in: ids}}, function(e, o){
		if(e){
			callback(e);
		}else{
			callback(null, o);
		}
	});
};

/**
* Delete all comments on a survey
* @param {String} filename
* @param {String} user: who owns the survey
* @param {Function} callback: 1. err 2.output
*/
exports.deleteSnapshotsBySurvey = function(filename, user, callback){

	snapshots.find({"file": filename, "user": user}, {_id: 1}).toArray(function(error, ids){
		var paraIds = [];

		for(var i = 0; i < ids.length; i++){
			paraIds.push(ids[i]._id);
		}
		snapshots.remove({"file": filename, "user": user}, function(e, o){
			if(e){
				callback(e);
			}else{
				comments.remove({"para_id":{$in: paraIds}}, function(e, o){
					if(e){
						callback(e);
					}else{
						callback(null, o);
					}
				});
			}
		});
	});

};

/**
* Get a user's comments, used in admin home
* @param {String} user
* @param {Function} callback: 1. err 2.output
*/
exports.getCommentsByUser = function(user, callback){

	comments.aggregate([
		{$lookup: {from: "snapshots",
							localField: "para_id",
							foreignField: "_id",
							as: "snapshot" }},
		{$match: {"owner": user}}]).toArray(function(error, result){
    if(error){
			callback(error, null);
		}else{
			var comments = [];
			for(var i = 0; i < result.length; i++){
				var res = result[i]
				var snapshot = res.snapshot[0];
				var temp = {};
				temp.comment_id = res._id;
				temp.para_id = res.para_id;
				temp.content = "<div class='scroll-td'>" + res.content + "</div>";
				temp.commenter = res.user;
				temp.view = snapshot.view;
				temp.file = snapshot.file;
				temp.type = snapshot.selected_id != -1 ? 'selected item' : 'view';
				if(snapshot.y_axis.length > 0){
					temp.category = "X:<br>"+snapshot.x_axis+"<br> Y:<br> "+snapshot.y_axis;
				}else{
					temp.category = "X: <br>"+snapshot.x_axis;
				}
				temp.filters = "";
				if(snapshot.string_filters != "None"){
					var string_filters = snapshot.string_filters;
					var filterString = "<div class='scroll-td'>String filters: <br>";
					for(var j = 0; j < string_filters.length; j++){
						var filter = string_filters[j];
						if(j>0){
	            filterString = filterString +"<br>"+ filter.facet + "(";
	          }else{
	            filterString = filterString + filter.facet + "(";
	          }

						filterString = filterString +filter.value[0];
						for(var k =1; k < filter.value.length; k++){
							filterString = filterString +", "+filter.value[k];
						}
						filterString = filterString +")";
					}
						temp.filters += filterString;
				}
				if(snapshot.num_filters != "None"){
					var num_filters = snapshot.num_filters;
					var filterString = "";
					if(temp.filters != ""){
						filterString += "<br>Numeric filters: <br>";
					}else{
						filterString += "<div>Numeric filters:<br>";
					}
					for(var j = 0; j < num_filters.length; j++){
						var filter = num_filters[j];
						if(j>0){
	            filterString = filterString +"<br>"+ filter.facet + "(";
	          }else{
	            filterString = filterString + filter.facet + "(";
	          }

	          filterString = filterString + filter.selectedMin + " to " + filter.selectedMax;
	          filterString = filterString + ")";
					}
					temp.filters += filterString;
				}
				if(temp.filters == "") temp.filters = "None";
				else temp.filters += "</div>";
				temp.date = "<div class='scroll-td'>"+
					res.date.toString()+"</div>";

				comments.push(temp);
			}

			callback(null, comments);
		}
  });
};
