var http = require('http');
//var toCSV = require('array-to-csv');
var csvWriter = require('csv-write-stream');
var fs = require('fs'); //file system
global.changedFile = [];
global.headColumn = [];
global.numOfitem = 0;
global.size = 0;
global.processFilePath  = "";
global.doneCallBack;

geocodeAppend = function(gc_file){
    global.size;
    global.headColumn;
    //Check if #textlocation is in the columns name
    textLocationIndex = -1;

    for(i = 0;i<gc_file[0].length;i++){
//        if(gc_file[0][i].toString().includes('#textlocation')){
        if(gc_file[0][i].toString().indexOf('#textlocation') !== -1){
            textLocationIndex = i;
        }
    }
    // disabling auto-geocoder until fixed -tw
    //if(textLocationIndex != -1){
    if (false){
        var numOfCol = gc_file[0].length;
        size = gc_file.length - 1;
        headColumn.push(gc_file[0]);
        headColumn[0][numOfCol] = "Latitude#hidden";
        headColumn[0][numOfCol+1] = "Longitude#hidden";
        var addresses = [];
        //Save all the #textlocation to an array
        var i;
        // For each data, get the address and call geocoder to get back the latitude and longitude
        for (i = 1; i < gc_file.length; i++) {
            geocoder(gc_file[i],gc_file[i][textLocationIndex],appendLatAndLong);
        }
    }else{
        doneCallBack();
    }
};

changeFieldName = function(gc_file,callbackFunction){
    textLocationIndex = -1;
    for(i = 0;i<headColumn[0].length;i++){
//        if(headColumn[0][i].toString().m('#textlocation')){
        if(headColumn[0][i].toString().indexOf('#textlocation') !== -1){
            textLocationIndex = i;
        }
    }
    if(textLocationIndex != -1){
//        if(headColumn[0][textLocationIndex].includes('#hidden')){
        if(headColumn[0][textLocationIndex].indexOf('#hidden') > -1){
            headColumn[0][textLocationIndex] = headColumn[0][textLocationIndex].toString().replace("#textlocation","");
        }else{
            headColumn[0][textLocationIndex] = headColumn[0][textLocationIndex].toString().replace("#textlocation","#hidden");
        }
    }
    callbackFunction(gc_file);
};

geocoder = function(data,locName,callbackFunction){
    /* Since datasciencetoolkit server is down, use random number for testing */
    //latitude = (Math.random() * (33.000000 - 48.000000) + 48.000000).toFixed(6)
    //longitude =  (Math.random() * (67.000000 + 123.000000) - 123.000000).toFixed(6)
    //callbackFunction(latitude,longitude,data);
    var nominatimUrl = "http://www.datasciencetoolkit.org/maps/api/geocode/json?sensor=false&address=" + encodeURIComponent(locName);
    var options = {
        host: 'www.datasciencetoolkit.org',
        path: nominatimUrl,
        method: 'GET'
      };
      
    http.request(options, function(res) {
        if(res.statusCode == 200){
            res.setEncoding('utf8');
            res.on('data', function(chunk) {
                resultInJson = JSON.parse(chunk);
                var latitude = resultInJson.results[0].geometry.location.lat;
                var longitude = resultInJson.results[0].geometry.location.lng;
                callbackFunction(latitude,longitude,data);
            });
        }
    }).end();
};

done = function(file){
    file = headColumn.concat(file);
    var finalCSV = "";
    var doubleQuote = "\"\"";
    //Comma separated and use " " for the format
    for (i = 0; i < file.length; i++) {
        finalCSV = finalCSV.concat('"');
        finalCSV = finalCSV.concat(file[i][0].toString().replace(/"/g,doubleQuote));
        finalCSV = finalCSV.concat('"');
        finalCSV = finalCSV.concat(',');
        for( j = 1; j < file[i].length-1 ; j++){
            finalCSV = finalCSV.concat('"');
            finalCSV = finalCSV.concat(file[i][j].toString().replace(/"/g,doubleQuote));
            finalCSV = finalCSV.concat('"');
            finalCSV = finalCSV.concat(',');
        }
        finalCSV = finalCSV.concat('"');
        finalCSV = finalCSV.concat(file[i][file[i].length-1].toString().replace(/"/g,doubleQuote));
        finalCSV = finalCSV.concat('"\n');
    }
    fs.writeFile(processFilePath,finalCSV, function(err) {
        if(err) {
            return console.log(err);
            doneCallBack();
        }
        doneCallBack();
    }); 
};

appendLatAndLong = function(lat,long,columnOfData){
    columnOfData.push(lat);
    columnOfData.push(long);
    global.changedFile.push(columnOfData);
    global.numOfitem = global.numOfitem+1;
    if(numOfitem == global.size){
        changeFieldName(global.changedFile,done);
    }
};

//var testAddress = '2200 W. Main St, Suite 710, Durham, NC'
//var nominatimUrl = "http://www.datasciencetoolkit.org/maps/api/geocode/json?sensor=false&address=" + encodeURIComponent(testAddress);
//geocoder(testAddress);
exports.processFile = function(loader,filePath,callbackFunction){
    global.changedFile = [];
    global.headColumn = [];
    global.numOfitem = 0;
    global.size = 0;
    global.processFilePath  = "";
    global.doneCallBack;
    processFilePath = filePath;
    doneCallBack = callbackFunction;
    loader.loadCSV(filePath,geocodeAppend);
};

//processFile('zaslavsk_iDigBio_.csv');
