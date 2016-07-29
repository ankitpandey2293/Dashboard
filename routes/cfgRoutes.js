var http = require('http'),
    url  = require('url'),
    express = require('express'),
    router = express.Router(),
    mongoose = require('mongoose'),
	applicationReference = require('../model/applicationReference'),
	Alert_MTSQA = require('../model/Alert_MTSQA'),
    bodyParser = require('body-parser'),
    methodOverride = require('method-override');
	
// Laod Application data Cache on initiation of App as a promise 
	                         
var getAppReferenceData = function (appName){

   var promise = applicationReference.find({ 'appname' : appName },{ appname : 1 , machineID : 1 , data : 1 }).exec(); 
   return promise;	
}

// Dynamic sort dunction 
function dynamicSort(property) {
    var sortOrder = 1;
    if(property[0] === "-") {
        sortOrder = -1;
        property = property.substr(1);
    }
    return function (a,b) {
        var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
        return result * sortOrder;
    }
}

// Dynamic float to app status
function getObjFromFloat(checkValue , totalValue) {
	//console.log(checkValue, totalValue);
	if(totalValue == 0 ) return { color : "green" , value : "Green"};
    var temp = (checkValue/(parseFloat(totalValue))).toPrecision(2);
	//console.log(temp);
	if(temp <= 0.20 ) return { color : "green" , value : "Green"} ;
	if(temp >= 0.21 && temp <= 0.60 ) return { color : "yellow" , value : "Amber"} ;
	if(temp >= 0.61 && temp <= 1 ) return { color : "red" , value : "Red"} ;
}

// accessPath :  http://127.0.0.1:3000/

// evaluateAlert method : ARGZ(Reference App Object , Set of Alert Objects )  : Return Evaluated Alert Set with timestamp

var evaluateAlerts = function(referenceObject , alertObjectSet){
   
   var resultAlertObjSet = new Object();   
   resultAlertObjSet.appname = referenceObject.appname ; 
   resultAlertObjSet.dataPoints = [] ;
	//console.log(resultAlertObjSet);
    var paramInfraRef = referenceObject.data.paramInfra.sort(dynamicSort("paramName")) ;
    var paramCustomRef = referenceObject.data.paramCustom.sort(dynamicSort("paramName")) ;
	
alertObjectSet.forEach(function(alertObject){
   var resultAlertObj = new Object(); 
   resultAlertObj.machineID = alertObject.machineID ;
   resultAlertObj.data = { paramInfra : [] , paramCustom : [] };
   // To be changed when fileFeeder created_at property is populated 
   resultAlertObj.timeStamp = Date();
   	
    //resultAlertObj.timeStamp = alertObject.created_at;
    //console.log(alertObject);    
	var paramInfraAlert = alertObject.data.paramInfra.sort(dynamicSort("paramName")) ;
    var paramCustomAlert = alertObject.data.paramCustom.sort(dynamicSort("paramName")) ;
	
	for ( var i = 0 ; i<paramInfraAlert.length ; i++ ){
			switch(paramInfraAlert[i].paramType){
				case 'CPU' : 
						if(parseInt(paramInfraAlert[i].value) >= parseInt(paramInfraRef[i].value)) paramInfraAlert[i]['flag'] = "true" ; else  paramInfraAlert[i]['flag'] = "false" ;
						break; 
				case 'Disk':
						if(parseInt(paramInfraAlert[i].value.slice(0, -1)) >= parseInt(paramInfraRef[i].value.slice(0, -1)))  paramInfraAlert[i]['flag'] = "true" ; else  paramInfraAlert[i]['flag'] = "false";
						break;
				case 'System':
						paramInfraAlert[i]['flag'] = "false";
				                break;
  	
			};
			resultAlertObj.data.paramInfra.push(paramInfraAlert[i]);
	};
	
	for ( var i = 0 ; i<paramCustomAlert.length ; i++ ){
			//console.log("Reference : " +paramCustomRef[i]);
			//console.log("Alert Obj : " +paramCustomAlert[i]);
				
			switch(paramCustomAlert[i].paramType){
				case 'Lines' : 
						paramCustomAlert[i].value == "Up" || paramCustomAlert[i].value == "UP" ?  paramCustomAlert[i]['flag'] = "false" : paramCustomAlert[i]['flag'] = "true";
						break;
				case 'Services' : 
						paramCustomAlert[i].value == "true" || paramCustomAlert[i].value == "Running" || paramCustomAlert[i].value == "running" ?  paramCustomAlert[i]['flag'] = "false" : paramCustomAlert[i]['flag'] = "true";
						break; 
				
				case 'FILE_TYPE_COUNT':
						//console.log(paramCustomRef[i].frequency);
						switch(paramCustomRef[i].frequency){
							
								case 'Daily' :  if(parseInt(paramCustomAlert[i].value) < parseInt(paramCustomRef[i].value)) paramCustomAlert[i]["flag"] = "true" ; else paramCustomAlert[i]["flag"] = "false" ;break;
								case 'Monthly': paramCustomAlert[i]["flag"] = "false";break;

							};
						break;
				case 'Scalar':
						paramCustomAlert[i]['flag'] = "false";
				                break;
  	
				};
			resultAlertObj.data.paramCustom.push(paramCustomAlert[i]);		
			
			};
	//console.log(resultAlertObj);		
	resultAlertObjSet.dataPoints.push(resultAlertObj)
	//console.log(resultAlertObjSet);
		}
	);
	
	return resultAlertObjSet;
};


var evaluateAverageAlerts = function(referenceObject ,alertObjectSet){
   
	var resultAlertObj = new Object(); 
	var paramInfraRef = referenceObject.data.paramInfra.sort(dynamicSort("paramName")) ;
    var paramCustomRef = referenceObject.data.paramCustom.sort(dynamicSort("paramName")) ;
	
	var CPUCount=1 , DiskCount=1 , MemoryCount=1 ,LinesCount=1,FilesCount=1,ServicesCount=1,ScalarCount=1;
	var CPUtrue=1 , Disktrue=1 , Memorytrue=1 , Linestrue=1,Filestrue=1,Servicestrue=1,Scalartrue=1; 
   
   
	alertObjectSet.forEach(function(alertObject){
	var paramInfraAlert = alertObject.data.paramInfra.sort(dynamicSort("paramName")) ;
    var paramCustomAlert = alertObject.data.paramCustom.sort(dynamicSort("paramName")) ;
	
	for ( var i = 0 ; i<paramInfraAlert.length ; i++ ){
			switch(paramInfraAlert[i].paramType){
				case 'CPU' : 
						CPUCount = CPUCount + 1;
						if(parseInt(paramInfraAlert[i].value) >= parseInt(paramInfraRef[i].value)) {paramInfraAlert[i]['flag'] = "true"; CPUtrue = CPUtrue + 1; } else  paramInfraAlert[i]['flag'] = "false" ;
						break; 
				case 'Disk':
						DiskCount = DiskCount + 1;
						if(parseInt(paramInfraAlert[i].value.slice(0, -1)) >= parseInt(paramInfraRef[i].value.slice(0, -1))) { paramInfraAlert[i]['flag'] = "true" ; Disktrue = Disktrue + 1;} else  paramInfraAlert[i]['flag'] = "false";
						break;
				case 'Memory':
						MemoryCount++;
						if(parseInt(paramInfraAlert[i].value) >= parseInt(paramInfraRef[i].value)) { paramInfraAlert[i]['flag'] = "true" ; Memorytrue= Memorytrue + 1;} else  paramInfraAlert[i]['flag'] = "false";
						break;		
				case 'System':
						paramInfraAlert[i]['flag'] = "false";
				                break;
  	
			};
	};
	for ( var i = 0 ; i<paramCustomAlert.length ; i++ ){
			//console.log("Reference : " +paramCustomRef[i]);
			//console.log("Alert Obj : " +paramCustomAlert[i]);
				
			switch(paramCustomAlert[i].paramType){
				case 'Lines' : 
						LinesCount++;
						if(paramCustomAlert[i].value == "Up" || paramCustomAlert[i].value == "UP")  { paramCustomAlert[i]['flag'] = "false" ;} else {paramCustomAlert[i]['flag'] = "true";Linestrue=Linestrue+1;};
						break;
				case 'Process' : 
						ServicesCount++;
						if(paramCustomAlert[i].value == "Up" || paramCustomAlert[i].value == "UP" || paramCustomAlert[i].value == "true" || paramCustomAlert[i].value == "running" || paramCustomAlert[i].value == "Running" ) { paramCustomAlert[i]['flag'] = "false" ;} else { paramCustomAlert[i]['flag'] = "true";Servicestrue=Servicestrue+1;};
						break;
				case 'FILE_TYPE_COUNT':
						FilesCount++;
						switch(paramCustomRef[i].frequency){
							
								case 'Daily' :  if(parseInt(paramCustomAlert[i].value) < parseInt(paramCustomRef[i].value)) { paramCustomAlert[i]["flag"] = "true" ;Filestrue=Filestrue+1;} else paramCustomAlert[i]["flag"] = "false" ;break;
								case 'Monthly': paramCustomAlert[i]["flag"] = "false";break;

							};
						break;
				case 'Scalar':
						ScalarCount++;
						paramCustomAlert[i]['flag'] = "false";
				                break;
  	
				};		
			
			};
		}
	);
   // Modification to DB required for avoiding call on NaN values	
   resultAlertObj.CPU = getObjFromFloat(CPUtrue,CPUCount) ;
   resultAlertObj.Disk = getObjFromFloat(Disktrue,DiskCount);
   resultAlertObj.Memory = { color : "green" , value : "Green"};
   resultAlertObj.Uptime = { color : "green" , value : "Green"};
   resultAlertObj.Lines = getObjFromFloat(Linestrue,LinesCount);
   resultAlertObj.FILE_TYPE_COUNT = getObjFromFloat(Filestrue,FilesCount);
   resultAlertObj.Services = { color : "green" , value : "Green"};
   resultAlertObj.Scalar = getObjFromFloat(Scalartrue,ScalarCount);
   //console.log(resultAlertObj);	
	
	return resultAlertObj;
};

router.route('/AppData')

//GET data for /AppData

    .get(function(req, res, next) {
        var url_parts = url.parse(req.url, true),
        query = url_parts.query;
		var collectionName  = "Alert_"+query.appName;
        var metricValue = query.value;
		
		Alert_MTSQA.find({ },{ appname : 1 , machineID : 1 , data : 1 , created_at : 1}, { limit : parseInt(metricValue) }, function (err, alerts) {
              if (err) {
                  return console.error(err);
              } else {
		  res.format({
                  //HTML response
		  
                  //JSON response
                  
		  json: function(){
							//console.log(alerts);
							var promise = getAppReferenceData(query.appName);
							promise.then(function(appReferenceData){
							appReferenceData.forEach(function(obj){		
							var result = evaluateAlerts(obj,alerts.slice());		
							res.json(result);
								});
							});
        	            }
                });
              }     
        });
    });

router.route('/AvgAppData')

//GET data for /AvgAppData

    .get(function(req, res, next) {
        var url_parts = url.parse(req.url, true),
        query = url_parts.query;
		var collectionName  = "Alert_"+query.appName;
        var averageValue = query.value;
		
		Alert_MTSQA.find({ },{ appname : 1 , machineID : 1 , data : 1 , created_at : 1}, { limit : parseInt(averageValue) }, function (err, alerts) {
              if (err) {
                  return console.error(err);
              } else {
		  res.format({
                  //HTML response
		  
                  //JSON response
                  
		  json: function(){
							//console.log(alerts);
							var promise = getAppReferenceData(query.appName);
							promise.then(function(appReferenceData){
							appReferenceData.forEach(function(obj){		
							var result = evaluateAverageAlerts(obj,alerts.slice());		
							res.json(result);
								});
							});
        	            }
                });
              }     
        });
    });	
	
router.route('/ReferenceData')

//GET reference data for /ReferenceAppData

    .get(function(req, res, next) {
        var url_parts = url.parse(req.url, true),
        query = url_parts.query;
		var promise = getAppReferenceData(query.appName);
		promise.then(function(appReferenceData){
		appReferenceData.forEach(function(obj){		
		res.json(obj);
						});
					});
        });   
	
module.exports = router;