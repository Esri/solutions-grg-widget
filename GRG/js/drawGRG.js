///////////////////////////////////////////////////////////////////////////
// Copyright © 2014 Esri. All Rights Reserved.
//
// Licensed under the Apache License Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////

define([
  'esri/geometry/Point',
  'esri/geometry/Polygon',  
  'esri/geometry/geometryEngine',
  'esri/graphic',
  'esri/SpatialReference',
  'esri/geometry/Circle',
  'jimu/dijit/Message',
  'esri/request',
  'dojo/json'
], function(
  Point,
  Polygon,
  geometryEngine,
  Graphic,
  SpatialReference,
  EsriCircle,
  Message,
  esriRequest,
  JSON
) {
  
  var grg = {};
  
  grg.createGRG = function(HorizontalCells,VerticalCells,centerPoint,cellWidth,cellHeight,angle,labelStartPosition,labelStyle,gridStyle) {
    
    //set up variables
    var letterIndex = 0;
    var secondLetterIndex = 0;
    var letter = 'A';
    var secondLetter = 'A';
    var number = 1;
    var lastY = -9999;
    var features = [];    
    var startX = 0;
    var startY = 0;
    var radius = (cellWidth/2)/Math.cos(30* Math.PI/180);
    
    //work out required off set for first point
    var offsetX = (HorizontalCells*cellWidth)/2;
    if(gridStyle == "hexagon") {
      if(VerticalCells%2 == 1){
        var offsetY = ((((VerticalCells-1)/2) * (radius*3)) + radius)/2;
      } else {
        var offsetY = (((VerticalCells/2) * (radius*3)) + (radius/3))/2;
      }
    }else{
      var offsetY = (VerticalCells*cellHeight)/2;
    }
     
    
    var hexHorizontalCells = HorizontalCells
    
       
    for (var i = 0; i < VerticalCells; i++)
    {       
      for (var j = 0; j < HorizontalCells; j++)
      {
        var polygon = new Polygon(new SpatialReference({wkid:102100}));
          
        switch (labelStartPosition) {
          case 'Upper-Left':
            startX = centerPoint.x - offsetX;
            startY = centerPoint.y + offsetY;            
            if(gridStyle == "hexagon") {              
              hexHorizontalCells == HorizontalCells?startX = startX + (j * (cellWidth)) + (cellWidth/2):startX = startX + (j * (cellWidth));
              startY = (startY - radius)- (i * (radius*1.5));              
              var hexagonCenter = new Point([startX,startY],new SpatialReference({ wkid:102100 }));  
            } else {
              polygon.addRing([
                [startX + (j * cellWidth) , startY - (i * cellHeight)],[startX + ((j+1) * cellWidth) , startY - (i * cellHeight)],[startX + ((j+1) * cellWidth) , startY - ((i+1) * cellHeight)],[startX + (j * cellWidth) , startY - ((i+1) * cellHeight)],[startX + (j * cellWidth) , startY - (i * cellHeight)]]);
            }
            break;
          case 'Upper-Right':
            startX = centerPoint.x + offsetX;
            startY = centerPoint.y + offsetY;
            if(gridStyle == "hexagon") {              
              hexHorizontalCells == HorizontalCells?startX = startX - (j * (cellWidth)) - (cellWidth/2):startX = startX - (j * (cellWidth));
              startY = (startY - radius)- (i * (radius*1.5));              
              var hexagonCenter = new Point([startX,startY],new SpatialReference({ wkid:102100 }));  
            } else {
              polygon.addRing([
                [startX - (j * cellWidth) , startY - (i * cellHeight)],[startX - (j * cellWidth) , startY - ((i+1) * cellHeight)],[startX - ((j+1) * cellWidth) , startY - ((i+1) * cellHeight)],[startX - ((j+1) * cellWidth) , startY - (i * cellHeight)],[startX - (j * cellWidth) , startY - (i * cellHeight)]]);
            }
            break;
          case 'Lower-Right':
            startX = centerPoint.x + offsetX;
            startY = centerPoint.y - offsetY;
            if(gridStyle == "hexagon") {              
              hexHorizontalCells == HorizontalCells?startX = startX - (j * (cellWidth)) - (cellWidth/2):startX = startX - (j * (cellWidth));
              startY = (startY + radius) + (i * (radius*1.5));              
              var hexagonCenter = new Point([startX,startY],new SpatialReference({ wkid:102100 }));  
            } else {
              polygon.addRing([
                [startX - (j * cellWidth) , startY + (i * cellHeight)],[startX - ((j+1) * cellWidth) , startY + (i * cellHeight)],[startX - ((j+1) * cellWidth) , startY + ((i+1) * cellHeight)],[startX - (j * cellWidth) , startY + ((i+1) * cellHeight)],[startX - (j * cellWidth) , startY + (i * cellHeight)]]);
            }
            break;
          case 'Lower-Left':
            startX = centerPoint.x - offsetX;
            startY = centerPoint.y - offsetY;
            if(gridStyle == "hexagon") {              
              hexHorizontalCells == HorizontalCells?startX = startX + (j * (cellWidth)) + (cellWidth/2):startX = startX + (j * (cellWidth));
              startY = (startY + radius) + (i * (radius*1.5));              
              var hexagonCenter = new Point([startX,startY],new SpatialReference({ wkid:102100 }));  
            } else {
              polygon.addRing([
                [startX + (j * cellWidth) , startY + (i * cellHeight)],[startX + (j * cellWidth) , startY + ((i+1) * cellHeight)],[startX + ((j+1) * cellWidth) , startY + ((i+1) * cellHeight)],[startX + ((j+1) * cellWidth) , startY + (i * cellHeight)],[startX + (j * cellWidth) , startY + (i * cellHeight)]]);
            }
            break;              
        }
        
        if(gridStyle == "hexagon"){
          var hexagon = new EsriCircle(hexagonCenter, {radius: radius,numberOfPoints: 6});
          var hexagonRotated =  geometryEngine.rotate(hexagon,90,hexagonCenter);
          polygon.addRing(hexagonRotated.rings[0]);
        }
        
        
        //rotate the graphics as required
        var polygonRotated =  geometryEngine.rotate(polygon, (angle * -1),  centerPoint);
        
        var graphic = new Graphic(polygonRotated);
                          
        var attr = {};
            
        switch (labelStyle) {
          case 'Alpha-Numeric':
            attr["grid"] = letter.toString() + number.toString();
            break;
          case 'Alpha-Alpha':
            attr["grid"] = letter.toString() + secondLetter.toString();
            break;
           case 'Numeric':
            attr["grid"] = number.toString();
            break
        }
            
        number += 1;
        secondLetterIndex += 1;
        secondLetter = grg.convertNumberToLetters(secondLetterIndex);
        
        graphic.setAttributes(attr);
        features.push(graphic);
      }
      
      if(gridStyle == "hexagon"){hexHorizontalCells == HorizontalCells?HorizontalCells++:HorizontalCells--;}
      
      letterIndex += 1;
      letter = grg.convertNumberToLetters(letterIndex);
      if (labelStyle != 'Numeric')
      {
        number = 1;
      }
      secondLetter = 'A';
      secondLetterIndex = 0;                
    }
    return features    
  },
  
  
  
  grg.convertNumberToLetters = function (n) {          
    var ordA = 'A'.charCodeAt(0);
    var ordZ = 'Z'.charCodeAt(0);
    var len = ordZ - ordA + 1;          
    var s = "";
    while(n >= 0) {
        s = String.fromCharCode(n % len + ordA) + s;
        n = Math.floor(n / len) - 1;
    }
    return s;
  },
  
  grg.checkGridSize = function (numCellsHorizontal,numCellsVertical) {          
    var totalNumber = numCellsHorizontal*numCellsVertical;
    if(totalNumber > 2000) {
      // Invalid entry
      var alertMessage = new Message({
        message: 'You are attempting to create a grid comprising of ' + totalNumber + ' cells. It is advisable to reduce the number of cells being created by changing the grid size or grid area.'
      });
      return false;
    } else {
      return true;
    }
  },
  
  grg.getFeatureServiceParams = function (featureServiceName, map) {
    return {
     "name" : featureServiceName,
     "serviceDescription" : "",
     "hasStaticData" : false,
     "maxRecordCount" : 1000,
     "supportedQueryFormats" : "JSON",
     "capabilities" : "Create,Delete,Query,Update,Editing",
     "tags" : "GRG",
     "description" : "",
     "copyrightText" : "",
     "spatialReference" : {
        "wkid" : 102100
        },
     "initialExtent" : {
        "xmin": map.extent.xmin,
        "ymin": map.extent.ymin,
        "xmax": map.extent.xmax,
        "ymax": map.extent.ymax,
        "spatialReference":{
          "wkid":102100
        }
      },
     "allowGeometryUpdates" : true,
     "units" : "esriMeters",
     "xssPreventionInfo" : {
        "xssPreventionEnabled" : true,
        "xssPreventionRule" : "InputOnly",
        "xssInputRule" : "rejectInvalid"
      }
    }
  },

  grg.getLayerParams = function (layerName, map, textSymbol, gridSymbol) {          
    return {
      "layers": [
        {
          "adminLayerInfo": {
            "geometryField": {
              "name": "Shape"
            },
            "xssTrustedFields": ""
          },
          "id": 0,
          "name": layerName,
          "type": "Feature Layer",
          "displayField": "",
          "description": "A GRG (Gridded Reference Graphic) is a grid overlay used for a common reference point in many situations - from cordon and search operations to security for presidential inaugurations.",
          "tags" : "GRG",
          "copyrightText": "",
          "defaultVisibility": true,
          "ownershipBasedAccessControlForFeatures" : {
            "allowOthersToQuery" : false, 
            "allowOthersToDelete" : false, 
            "allowOthersToUpdate" : false
          },              
          "relationships": [],
          "isDataVersioned" : false, 
          "supportsCalculate" : true, 
          "supportsAttachmentsByUploadId" : true, 
          "supportsRollbackOnFailureParameter" : true, 
          "supportsStatistics" : true, 
          "supportsAdvancedQueries" : true, 
          "supportsValidateSql" : true, 
          "supportsCoordinatesQuantization" : true, 
          "supportsApplyEditsWithGlobalIds" : true,
          "advancedQueryCapabilities" : {
            "supportsPagination" : true, 
            "supportsQueryWithDistance" : true, 
            "supportsReturningQueryExtent" : true, 
            "supportsStatistics" : true, 
            "supportsOrderBy" : true, 
            "supportsDistinct" : true, 
            "supportsQueryWithResultType" : true, 
            "supportsSqlExpression" : true, 
            "supportsReturningGeometryCentroid" : true
          },          
          "useStandardizedQueries" : false,      
          "geometryType": "esriGeometryPolygon",
          "minScale" : 0, 
          "maxScale" : 0,
          "extent": {
            "xmin": map.extent.xmin,
            "ymin": map.extent.ymin,
            "xmax": map.extent.xmax,
            "ymax": map.extent.ymax,
            "spatialReference":{
              "wkid":102100
            }
          },
          "drawingInfo": {
            "renderer": {
             "type": "simple",
             "symbol": gridSymbol
            },
            "transparency": 0,
            "labelingInfo": [
               {
                "labelExpression": "[grid]",
                "labelExpressionInfo": {"value": "{grid}"},
                "format": null,
                "fieldInfos": null,
                "useCodedValues": false,
                "maxScale": 0,
                "minScale": 0,
                "where": null,
                "sizeInfo": null,
                "labelPlacement": "esriServerPolygonPlacementAlwaysHorizontal",
                "symbol": textSymbol
              }
            ]
          },
          "allowGeometryUpdates": true,
          "hasAttachments": false,
          "htmlPopupType": "esriServerHTMLPopupTypeNone",
          "hasM": false,
          "hasZ": false,
          "objectIdField": "OBJECTID",
          "globalIdField": "",
          "typeIdField": "",
          "fields": [
            {
              "name": "OBJECTID",
              "type": "esriFieldTypeOID",
              "actualType": "int",
              "alias": "OBJECTID",
              "sqlType": "sqlTypeOther",
              "nullable": false,
              "editable": false,
              "domain": null,
              "defaultValue": null
            },
            {
              "name": "grid",
              "type": "esriFieldTypeString",
              "alias": "grid",
              "actualType": "nvarchar",
              "nullable": true,
              "editable": true,
              "domain": null,
              "defaultValue": null,
              "sqlType": "sqlTypeNVarchar",
              "length": 256
            }
          ],
          "indexes": [],
          "types": [],
          "templates": [
            {
              "name": "New Feature",
              "description": "",
              "drawingTool": "esriFeatureEditToolPolygon",
              "prototype": {
                "attributes": {
                  "grid": ""
                }
              }
            }
          ],
          "supportedQueryFormats": "JSON",
          "hasStaticData": false,
          "maxRecordCount": 10000,
          "standardMaxRecordCount" : 4000,               
          "tileMaxRecordCount" : 4000, 
          "maxRecordCountFactor" : 1,   
          "exceedsLimitFactor" : 1,           
          "capabilities": "Query,Editing,Create,Update,Delete"
        }
      ]
    }        
  },
  
  grg.isNameAvailable = function (serviceName, token, featureServiceName) {
    //Check for the layer name
    var def = esriRequest({
      url: serviceName,
      content: {
        name: featureServiceName,
        type: "Feature Service",
        token: token,
        f: "json"
      },
      handleAs: "json",
      callbackParamName: "callback"
    },{usePost: true});
    return def;
  },

  grg.createFeatureService = function (serviceUrl, token, createParams) {
    //create the service
    var def = esriRequest({
      url: serviceUrl,
      content: {
        f: "json",
        token: token,
        typeKeywords: "ArcGIS Server,Data,Feature Access,Feature Service,Service,Hosted Service",
        createParameters: JSON.stringify(createParams),
        outputType: "featureService"
      },
      handleAs: "json",
      callbackParamName: "callback"
    },{usePost: true});
    return def;
  },

  grg.addDefinitionToService = function (serviceUrl, token, defParams) {
    var def = esriRequest({
      url: serviceUrl,
      content: {
        token: token,
        addToDefinition: JSON.stringify(defParams),
        f: "json"                            
      },
      handleAs: "json",
      callbackParamName: "callback"                          
    },{usePost: true});
    return def;
  }
  
  return grg;
});

