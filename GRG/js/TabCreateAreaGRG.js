///////////////////////////////////////////////////////////////////////////
// Copyright (c) 2016 Esri. All Rights Reserved.
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

/*global define*/
define([
    'dojo',
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/dom-class',
    'dojo/on',
    'dojo/topic',
    'dojo/_base/html',
    'dojo/text!../templates/TabCreateAreaGRG.html',
    
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',    
    
    'jimu/dijit/Message',
    
    'esri/IdentityManager',
    'esri/arcgis/OAuthInfo',
    'esri/arcgis/Portal',
    'esri/geometry/geometryEngine',
    'esri/layers/GraphicsLayer',
    'esri/layers/FeatureLayer',
    'esri/layers/LabelClass',
    'esri/symbols/SimpleFillSymbol',
    'esri/symbols/SimpleLineSymbol',
    'esri/renderers/SimpleRenderer',
    'esri/geometry/Polygon',
    'esri/symbols/Font',
    'esri/Color',
    'esri/graphic',
    'esri/toolbars/draw',
    'esri/symbols/TextSymbol',
    './drawGRG',
    './PolygonFeedback',
    './util',
    'dijit/form/NumberSpinner'
], function (
    dojo,
    dojoDeclare,
    dojoLang,
    dojoArray,
    dojoClass,
    dojoOn,
    dojoTopic,
    dojoHTML,
    areaGRGtemplate,
    dijitWidgetBase,    
    dijitTemplatedMixin,
    dijitWidgetsInTemplate,
    dijitMessage,
    esriId,
    esriOAuthInfo,
    esriPortal,
    esriGeometryEngine,
    esriGraphicsLayer,
    esriFeatureLayer,
    esriLabelClass,
    esriSimpleFillSymbol,
    esriSimpleMarkerSymbol,
    esriSimpleRenderer,
    esriPolygon,
    esriFont,
    esriColor,
    esriGraphic,
    esriDraw,
    esriTextSymbol,
    drawGRG,
    drawFeedBack ,
    CoordinateUtils    
) {
    'use strict';
    return dojoDeclare([dijitWidgetBase, dijitTemplatedMixin, dijitWidgetsInTemplate], {
        templateString: areaGRGtemplate,
        baseClass: 'jimu-widget-TabLine',
        GRG: null,
        centerPoint: [],

        constructor: function (args) {
          dojoDeclare.safeMixin(this, args);
        },

        postCreate: function () {       
          this.angle = 0;
          this.currentUnit = 'meters';
          this.coordTool = new CoordinateUtils(); 
          
          // create graphics layer for grid extent and add to map
          this._graphicsLayerGRGExtent = new esriGraphicsLayer();
          this._extentSym = new esriSimpleFillSymbol(this.extentAreaFillSymbol);
          
          // create a renderer for the grg layer to override default symbology
          var gridSymbol = new esriSimpleFillSymbol(this.GRGAreaFillSymbol); 
          var gridRenderer = new esriSimpleRenderer(gridSymbol);
                  
          var featureCollection = {
            "layerDefinition": {
              "geometryType": "esriGeometryPolygon",
              "objectIdField": "ObjectID",
              "fields": [{
                "name": "ObjectID",
                "alias": "ObjectID",
                "type": "esriFieldTypeOID"
                }, {
                "name": "grid",
                "alias": "grid",
                "type": "esriFieldTypeString"
              }],
              "extent": {
            "xmin":-18746028.312877923,
            "ymin":-6027547.894280539,
            "xmax":18824299.82984192,
            "ymax":12561937.384669386,
            "spatialReference":{
              "wkid":102100
            }
          },
            }
          };

          this.GRGArea = new esriFeatureLayer(featureCollection,{
            id: "Area GRG",
            outFields: ["*"]
          });
          this.GRGArea.setRenderer(gridRenderer);
                    
          var json = {
            "labelExpressionInfo": {"value" : "{grid}"}
          };

          // create a text symbol to define the style of labels
          var labelClass = new esriLabelClass(json);
          var textSymParams = this.cellTextSymbol || {
            font: new esriFont("11", Font.STYLE_NORMAL, Font.VARIANT_NORMAL, Font.WEIGHT_BOLD, "Helvetica"),
            color: new esriColor("#666633")
          }
          labelClass.symbol = new esriTextSymbol(textSymParams);
          this.GRGArea.setLabelingInfo([labelClass]);
          
          this.map.addLayers([this.GRGArea,this._graphicsLayerGRGExtent]);          
          
          // add extended toolbar
          this.dt = new drawFeedBack(this.map,{nls: this.nls});
                              
          this.syncEvents();
          dojoLang.hitch(this,this.initSaveToPortal());
        },
        
        syncEvents: function () {
          
          dojoTopic.subscribe('DD_WIDGET_OPEN', dojoLang.hitch(this, this.setGraphicsShown));
          dojoTopic.subscribe('DD_WIDGET_CLOSE', dojoLang.hitch(this, this.setGraphicsHidden));
          dojoTopic.subscribe('TAB_SWITCHED', dojoLang.hitch(this, this.tabSwitched));
          dojoTopic.subscribe(drawFeedBack.drawnLineAngleDidChange,dojoLang.hitch(this, this.lineAngleDidChange));
          dojoTopic.subscribe(drawFeedBack.midPointDidChange,dojoLang.hitch(this, this.midPointDidChange));          
          
          this.own(dojoOn(
            this.createGRGButton,
            'click',
            dojoLang.hitch(this, this.createGRG)
          ));
          
          this.own(dojoOn(
            this.addGRGAreaBtn,
            'click',
            dojoLang.hitch(this, this.addGRGAreaButtonClicked)
          ));      
                    
          this.own(dojoOn(
            this.deleteGRGAreaBtn,
            'click',
            dojoLang.hitch(this, this.deleteGRGAreaButtonClicked)
          ));
          
          this.own(dojoOn(
            this.cellUnits, 
            'change',
            dojoLang.hitch(this, this.cellUnitsChange)
          ));
          
          this.own(dojoOn(
            this.cellShape, 
            'change',
            dojoLang.hitch(this, this.cellShapeChange)
          ));
          
          this.own(
            this.dt.on(
              'draw-complete',
              dojoLang.hitch(this, this.drawGRGAreaComplete)
          ))         
        },
              
        /*
         * angle value change
         */
        lineAngleDidChange: function (r) {
          this.angle = r;
        },
        
        midPointDidChange: function (r) {
          this.centerPoint = r;
        },
        
        cellUnitsChange: function () {
          var tempWidthInMeters = this.coordTool.convertToMeters(this.cellWidth.value,this.currentUnit);
          var tempHeightInMeters = this.coordTool.convertToMeters(this.cellHeight.value,this.currentUnit);
          
          this.cellWidth.setValue(this.coordTool.convertMetersToUnits(tempWidthInMeters,this.cellUnits.value));
          this.cellShape.value == "default"?this.cellHeight.setValue(this.coordTool.convertMetersToUnits(tempHeightInMeters,this.cellUnits.value)):this.cellHeight.setValue(0);
          
          this.currentUnit = this.cellUnits.value;
        },
        
        cellShapeChange: function () {
          this.cellShape.value == "default"?this.cellHeight.set('disabled', false):this.cellHeight.set('disabled', true);
          this.cellShape.value == "default"?this.cellHeight.setValue(this.cellWidth.value):this.cellHeight.setValue(0);
        },
        
        deleteGRGAreaButtonClicked: function () {
          this._graphicsLayerGRGExtent.clear();
          
          //reset the angle
          this.angle = 0;
          
          dojoHTML.removeClass(this.addGRGAreaBtn, 'jimu-state-active');          
          dojoHTML.removeClass(this.addGRGArea, 'controlGroupHidden');
          dojoHTML.addClass(this.addGRGArea, 'controlGroup');
          dojoHTML.removeClass(this.deleteGRGArea, 'controlGroup');
          dojoHTML.addClass(this.deleteGRGArea, 'controlGroupHidden');          
        },        
        
        addGRGAreaButtonClicked: function () {
          this.GRGArea.clear();
          
          //refresh each of the feature/graphic layers to enusre labels are removed
          for(var j = 0; j < this.map.graphicsLayerIds.length; j++) {
            this.map.getLayer(this.map.graphicsLayerIds[j]).refresh();
          }
          
          this.map.disableMapNavigation();
          this.dt.activate('polyline');
          dojoClass.toggle(this.addGRGAreaBtn, 'jimu-state-active');
          dojoHTML.addClass(this.saveGRGButton, 'controlGroupHidden');
        },

        drawGRGAreaComplete: function (evt) {          
          var graphic = new esriGraphic(evt.geometry, this._extentSym);          
          this._graphicsLayerGRGExtent.add(graphic);
          this.map.enableMapNavigation();
          this.dt.deactivate();
          
          this.cellWidth.setValue(Math.ceil((esriGeometryEngine.distance(evt.geometry.getPoint(0,0), evt.geometry.getPoint(0,1), this.cellUnits.value))/10));
          this.cellShape.value == "default"?this.cellHeight.setValue(Math.ceil((esriGeometryEngine.distance(evt.geometry.getPoint(0,0), evt.geometry.getPoint(0,3), this.cellUnits.value))/10)):this.cellHeight.setValue(0);
          
                    
          dojoClass.toggle(this.addGRGArea, "controlGroupHidden");
          dojoClass.toggle(this.deleteGRGArea, "controlGroupHidden");
        },
        
        createGRG: function () {                 
          //check form inputs for validity
          if (this._graphicsLayerGRGExtent.graphics[0] && this.addGRGName.isValid() && this.cellWidth.isValid() && this.cellHeight.isValid()) {
            
            var geom = this._graphicsLayerGRGExtent.graphics[0].geometry;

            //work out width and height of AOI
            var GRGAreaWidth = esriGeometryEngine.distance(geom.getPoint(0,0), geom.getPoint(0,1), 'meters');
            var GRGAreaHeight = esriGeometryEngine.distance(geom.getPoint(0,0), geom.getPoint(0,3), 'meters');
            
            
            var cellWidth = this.coordTool.convertToMeters(this.cellWidth.value,this.currentUnit);
            var cellHeight = this.coordTool.convertToMeters(this.cellHeight.value,this.currentUnit);
            
            
            //work out how many cells are needed horizontally & Vertically to cover the whole canvas area
            var numCellsHorizontal = Math.ceil(GRGAreaWidth/cellWidth);
            
            var numCellsVertical;
            this.cellShape.value == "default"?numCellsVertical = Math.ceil(GRGAreaHeight/cellHeight):numCellsVertical = Math.ceil(GRGAreaHeight/(cellWidth)/Math.cos(30* Math.PI/180)) + 1;
            
            if(drawGRG.checkGridSize(numCellsHorizontal,numCellsVertical))
            {
              var features = drawGRG.createGRG(numCellsHorizontal,numCellsVertical,this.centerPoint,cellWidth,cellHeight,this.angle,this.labelStartPosition.value,this.labelStyle.value,this.cellShape.value); 
              //apply the edits to the feature layer
              this.GRGArea.applyEdits(features, null, null);
              this.deleteGRGAreaButtonClicked();              
              dojoHTML.removeClass(this.saveGRGButton, 'controlGroupHidden');
            }
          }
          else {
            // Invalid entry
            var alertMessage = new dijitMessage({
              message: this.nls.missingParametersMessage
            });          
          }
        },
        
        setGraphicsHidden: function () {
          if (this._graphicsLayerGRGExtent) {
            this._graphicsLayerGRGExtent.hide();
          }
        },
        
        setGraphicsShown: function () {
          if (this._graphicsLayerGRGExtent) {
            this._graphicsLayerGRGExtent.show();
          }
        },
        
        tabSwitched: function () {
          this.GRGArea.clear();
          //refresh each of the feature/graphic layers to enusre labels are removed
          for(var j = 0; j < this.map.graphicsLayerIds.length; j++) {
            this.map.getLayer(this.map.graphicsLayerIds[j]).refresh();
          }
          this.dt.deactivate();
          this.deleteGRGAreaButtonClicked();
          dojoHTML.addClass(this.saveGRGButton, 'controlGroupHidden');
        },

        initSaveToPortal: function() {          
          
          esriId.registerOAuthInfos();
          
          this.own(dojoOn(this.saveGRGButton, "click", dojoLang.hitch(this, function(evt) {
          
          var featureServiceName = this.addGRGName.value;
          
          esriId.getCredential(this.appConfig.portalUrl + "/sharing", { oAuthPopupConfirmation: false }).then(dojoLang.hitch(this, function() {
            //sign in
            new esriPortal.Portal(this.appConfig.portalUrl).signIn().then(dojoLang.hitch(this, function(portalUser) {
             //Get the token
              var token = portalUser.credential.token;
              var orgId = portalUser.orgId;
              var userName = portalUser.username;
              
              var checkServiceNameUrl = this.appConfig.portalUrl + "sharing/rest/portals/" + orgId + "/isServiceNameAvailable";
              var createServiceUrl = this.appConfig.portalUrl + "sharing/content/users/" + userName + "/createService"; 

              drawGRG.isNameAvailable(checkServiceNameUrl, token, featureServiceName).then(dojoLang.hitch(this, function(response0) {
                if (response0.available) {
                  //set the map to busy
                  dojoTopic.publish('SHOW_BUSY');
                  //create the service
                  drawGRG.createFeatureService(createServiceUrl, token, drawGRG.getFeatureServiceParams(featureServiceName, this.map)).then(dojoLang.hitch(this, function(response1) {
                    if (response1.success) {
                      var addToDefinitionUrl = response1.serviceurl.replace(new RegExp('rest', 'g'), "rest/admin") + "/addToDefinition";
                      drawGRG.addDefinitionToService(addToDefinitionUrl, token, drawGRG.getLayerParams(featureServiceName, this.map, this.cellTextSymbol, this.GRGAreaFillSymbol)).then(dojoLang.hitch(this, function(response2) {
                        if (response2.success) {
                          //Push features to new layer
                          var newFeatureLayer = new esriFeatureLayer(response1.serviceurl + "/0?token=" + token, {
                            mode: esriFeatureLayer.MODE_SNAPSHOT,
                            outFields: ["*"]                                  
                           });
                          this.map.addLayer(newFeatureLayer);

                          var newGraphics = [];
                          dojoArray.forEach(this.GRGArea.graphics, function (g) {
                            newGraphics.push(new esriGraphic(g.geometry, null, {grid: g.attributes["grid"]}));
                          }, this);

                          newFeatureLayer.applyEdits(newGraphics, null, null).then(dojoLang.hitch(this, function(){
                            this.tabSwitched();                                
                          })).otherwise(dojoLang.hitch(this,function(){
                            this.tabSwitched();
                          })); 
                          dojoTopic.publish('HIDE_BUSY');
                        }
                      }), function(err2) {
                        dojoTopic.publish('HIDE_BUSY');
                        new dijitMessage({
                          message: "Add to definition: " + err2.message
                        });                              
                      });
                    } else {
                      dojoTopic.publish('HIDE_BUSY');
                      new dijitMessage({
                        message: "Unable to create " + featureServiceName
                      });
                    }
                  }), function(err1) {
                    dojoTopic.publish('HIDE_BUSY');
                    new dijitMessage({
                      message: "Create Service: " + err1.message
                    });
                  });
                } else {
                    dojoTopic.publish('HIDE_BUSY');
                    new dijitMessage({                 
                      message: "You already have a feature service named " + featureServiceName + ". Please choose another name."
                  });                    
                }
              }), function(err0) {
                dojoTopic.publish('HIDE_BUSY');
                new dijitMessage({
                  message: "Check Service: " + err0.message
                });
              });
            }))
          }));
        })));
      }             
  });
});
