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
    'dojo/keys',
    'dojo/string',
    'dojo/topic',
    'dojo/_base/html',
    'dojo/dom-class',
    'dojo/text!../templates/TabCreatePointGRG.html',
    
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'dijit/TooltipDialog',
    'dijit/popup',
    
    'jimu/dijit/Message',
    
    'esri/IdentityManager',
    'esri/arcgis/OAuthInfo',
    'esri/arcgis/Portal',
    'esri/layers/GraphicsLayer',
    'esri/layers/FeatureLayer',
    'esri/layers/LabelClass',
    'esri/symbols/SimpleFillSymbol',
    'esri/symbols/SimpleMarkerSymbol',
    'esri/renderers/SimpleRenderer',
    'esri/symbols/Font',
    'esri/Color',
    'esri/graphic',
    'esri/geometry/webMercatorUtils',
    'esri/symbols/TextSymbol',
    
    './CoordinateInput',
    './drawGRG',
    './DrawFeedBack', 
    './EditOutputCoordinate'
], function (
    dojo,
    dojoDeclare,
    dojoLang,
    dojoArray,
    dojoClass,
    dojoOn,
    dojoKeys,
    dojoString,
    dojoTopic,
    dojoHTML,
    dojoDomClass,
    pointGRGtemplate,
    dijitWidgetBase,    
    dijitTemplatedMixin,
    dijitWidgetsInTemplate,
    dijitTooltipDialog,
    dijitPopup,    
    dijitMessage,
    esriId,
    esriOAuthInfo,
    esriPortal,
    esriGraphicsLayer,
    esriFeatureLayer,
    esriLabelClass,
    esriSimpleFillSymbol,
    esriSimpleMarkerSymbol,
    esriSimpleRenderer,
    esriFont,
    esriColor,
    esriGraphic,
    esriWebMercatorUtils,
    esriTextSymbol,
    coordInput,
    drawGRG,    
    drawFeedBack,
    editOutputCoordinate    
) {
    'use strict';
    return dojoDeclare([dijitWidgetBase, dijitTemplatedMixin, dijitWidgetsInTemplate], {
        templateString: pointGRGtemplate,
        baseClass: 'jimu-widget-TabLine',
        currentPointUnit: 'meters',

        constructor: function (args) {
          dojoDeclare.safeMixin(this, args);
        },

        postCreate: function () {
          //set up symbology for point input
          this._ptSym = new esriSimpleMarkerSymbol(this.pointSymbol);
          
          //set up coordinate input dijit
          this.coordTool = new coordInput({nls: this.nls, appConfig: this.appConfig}, this.observerCoords);      
          this.coordTool.inputCoordinate.formatType = 'DD';
          this.coordinateFormat = new dijitTooltipDialog({
            content: new editOutputCoordinate({nls: this.nls}),
            style: 'width: 400px'
          });
          
          if(this.appConfig.theme.name === 'DartTheme')
          {
            dojoDomClass.add(this.coordinateFormat.domNode, 'dartThemeClaroDijitTooltipContainerOverride');
          }
          
          // add extended toolbar
          this.dt = new drawFeedBack(this.map,this.coordTool.inputCoordinate.util);
                               
          // create a renderer for the grg layer to override default symbology
          var gridSymbol = new esriSimpleFillSymbol(this.cellAreaFillSymbol);
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
              }]
            }
          };

          this.GRGPoint = new esriFeatureLayer(featureCollection,{
            id: "Point GRG",
            outFields: ["*"]
          });
          this.GRGPoint.setRenderer(gridRenderer);
         
          var json = {
            "labelExpressionInfo": {"value": "{grid}"}
          };
          
          // create a text symbol to define the style of labels
          var labelClass = new esriLabelClass(json);
          labelClass.symbol = new esriTextSymbol(this.cellTextSymbol || {
            font: new esriFont("11", Font.STYLE_NORMAL, Font.VARIANT_NORMAL, Font.WEIGHT_BOLD, "Helvetica"),
            color: new esriColor("#666633")
          });
          this.GRGPoint.setLabelingInfo([labelClass]);          
          this.map.addLayer(this.GRGPoint);
          
          //initiate synchronisation events
          this.syncEvents();
          dojoLang.hitch(this,this.initSaveToPortal());
        },
        
        syncEvents: function () {
          dojoTopic.subscribe('TAB_SWITCHED', dojoLang.hitch(this, this.tabSwitched));

          this.own(
              this.coordTool.inputCoordinate.watch('outputString', dojoLang.hitch(this, function (r, ov, nv) {
                if(!this.coordTool.manualInput){this.coordTool.set('value', nv);}
              })),
            
              this.dt.watch('startPoint' , dojoLang.hitch(this, function (r, ov, nv) {
                this.coordTool.inputCoordinate.set('coordinateEsriGeometry', nv);
                this.dt.addStartGraphic(nv, this._ptSym);
              })),            
            
              dojoOn(this.coordTool, 'keyup',dojoLang.hitch(this, this.coordToolKeyWasPressed)),
              
              this.dt.on('draw-complete',dojoLang.hitch(this, this.feedbackDidComplete)),
              
              dojoOn(this.coordinateFormatButton, 'click',dojoLang.hitch(this, this.coordinateFormatButtonWasClicked)),
              
              dojoOn(this.addPointBtn, 'click',dojoLang.hitch(this, this.pointButtonWasClicked)),
              
              dojoOn(this.coordinateFormat.content.applyButton, 'click', dojoLang.hitch(this, function () {
                var fs = this.coordinateFormat.content.formats[this.coordinateFormat.content.ct];
                var cfs = fs.defaultFormat;
                var fv = this.coordinateFormat.content.frmtSelect.get('value');
                if (fs.useCustom) {
                    cfs = fs.customFormat;
                }
                this.coordTool.inputCoordinate.set(
                  'formatPrefix',
                  this.coordinateFormat.content.addSignChkBox.checked
                );
                this.coordTool.inputCoordinate.set('formatString', cfs);
                this.coordTool.inputCoordinate.set('formatType', fv);
                this.setCoordLabel(fv);
                dijitPopup.close(this.coordinateFormat);                
              })),
              
              dojoOn(this.coordinateFormat.content.cancelButton, 'click', dojoLang.hitch(this, function () {
                dijitPopup.close(this.coordinateFormat);
              })),
              
              this.own(dojoOn(
                this.createPointGRGButton, 
                'click', dojoLang.hitch(this, this.createPointGRG)
              )),
          
              this.own(dojoOn(
                this.pointCellShape, 
                'change',
                dojoLang.hitch(this, this.cellPointShapeChange)
              )),

              this.own(dojoOn(
                this.pointCellUnits, 
                'change',
                dojoLang.hitch(this, this.cellPointUnitsChange)
              ))
            );
        },
        
        /*
         * catch key press in start point
         */
        coordToolKeyWasPressed: function (evt) {
          this.coordTool.manualInput = true;
          if (evt.keyCode === dojoKeys.ENTER) {
            this.coordTool.inputCoordinate.getInputType().then(dojoLang.hitch(this, function (r) {
              if(r.inputType == "UNKNOWN"){
                var alertMessage = new dijitMessage({
                  message: this.nls.coordInputError
                });
              } else {
                dojoTopic.publish(
                  'grg-center-point-input',
                  this.coordTool.inputCoordinate.coordinateEsriGeometry
                );
                this.setCoordLabel(r.inputType);
                var fs = this.coordinateFormat.content.formats[r.inputType];
                this.coordTool.inputCoordinate.set('formatString', fs.defaultFormat);
                this.coordTool.inputCoordinate.set('formatType', r.inputType);
                this.dt.addStartGraphic(r.coordinateEsriGeometry, this._ptSym);
              }
            }));
          }
        },
        
        /*
         *
         */
        setCoordLabel: function (toType) {
          this.coordInputLabel.innerHTML = dojoString.substitute(
            'GRG Center Point (${crdType})', {
                crdType: toType
            });
        },
        
        /*
         *
         */
        coordinateFormatButtonWasClicked: function () {
          this.coordinateFormat.content.set('ct', this.coordTool.inputCoordinate.formatType);
          dijitPopup.open({
              popup: this.coordinateFormat,
              around: this.coordinateFormatButton
          });
        },
        
        /*
         * Button click event, activate feedback tool
         */
        pointButtonWasClicked: function () {
          dojoHTML.addClass(this.saveGRGPointButton, 'controlGroupHidden');
          this.dt.removeStartGraphic();
          this.GRGPoint.clear();
          //refresh each of the feature/graphic layers to enusre labels are removed
          for(var j = 0; j < this.map.graphicsLayerIds.length; j++) {
            this.map.getLayer(this.map.graphicsLayerIds[j]).refresh();
          }
          this.coordTool.manualInput = false;
          
          this.dt._setTooltipMessage(0);
          
          this.map.disableMapNavigation();          
          this.dt.activate('point');
          var tooltip = this.dt._tooltip;
          if (tooltip) {
            tooltip.innerHTML = 'Click to add GRG center point';
          }
          dojoDomClass.toggle(this.addPointBtn, 'jimu-state-active');
        },
        
        /*
         *
         */
        cellPointShapeChange: function () {
          this.pointCellShape.value == "default"?this.pointCellHeight.set('disabled', false):this.pointCellHeight.set('disabled', true);
          this.pointCellShape.value == "default"?this.pointCellHeight.setValue(this.pointCellWidth.value):this.pointCellHeight.setValue(0);
        },
        
        /*
         *
         */
        cellPointUnitsChange: function () {
          var tempWidthInMeters = this.coordTool.inputCoordinate.util.convertToMeters(this.pointCellWidth.value,this.currentPointUnit);
          var tempHeightInMeters = this.coordTool.inputCoordinate.util.convertToMeters(this.pointCellHeight.value,this.currentPointUnit);
          
          
          this.pointCellWidth.setValue(this.coordTool.inputCoordinate.util.convertMetersToUnits(tempWidthInMeters,this.pointCellUnits.value));
          this.pointCellShape.value == "default"?this.pointCellHeight.setValue(this.coordTool.inputCoordinate.util.convertMetersToUnits(tempHeightInMeters,this.pointCellUnits.value)):this.pointCellHeight.setValue(0);
          
          this.currentPointUnit = this.pointCellUnits.value;
        },

        /*
         *
         */
        feedbackDidComplete: function (results) {          
          dojoDomClass.remove(this.addPointBtn, 'jimu-state-active');
          this.dt.deactivate();
          this.map.enableMapNavigation();
        },
        
        /*
         *
         */
        createPointGRG: function () {
          //check form inouts for validity
          if (this.dt.startGraphic && this.addGRGPointName.isValid() && this.pointCellWidth.isValid() && this.pointCellHeight.isValid() && this.gridAnglePoint.isValid()) {
            
            //get center point of AOI
            var centerPoint = esriWebMercatorUtils.geographicToWebMercator(this.coordTool.inputCoordinate.coordinateEsriGeometry);
            
            var cellWidth = this.coordTool.inputCoordinate.util.convertToMeters(this.pointCellWidth.value,this.currentPointUnit);
            var cellHeight = this.coordTool.inputCoordinate.util.convertToMeters(this.pointCellHeight.value,this.currentPointUnit);
            
            if(drawGRG.checkGridSize(this.pointCellHorizontal.value,this.pointCellVertical.value))
            {
              var features = drawGRG.createGRG(this.pointCellHorizontal.value,this.pointCellVertical.value,centerPoint,cellWidth,cellHeight,this.gridAnglePoint.value,this.pointLabelStartPosition.value,this.pointLabelStyle.value,this.pointCellShape.value); 
              //apply the edits to the feature layer
              this.GRGPoint.applyEdits(features, null, null);
              dojoHTML.removeClass(this.saveGRGPointButton, 'controlGroupHidden');
              this.dt.removeStartGraphic();              
            }
            
          } else {
            // Invalid entry
            var alertMessage = new dijitMessage({
              message: this.nls.missingParametersMessage
            });          
          }
        },
        
        
        /*
         *
         */
        tabSwitched: function () {
          this.GRGPoint.clear();
          this.dt.removeStartGraphic();
          this.dt.deactivate(); 
          dojoDomClass.remove(this.addPointBtn, 'jimu-state-active');          
          dojoHTML.addClass(this.saveGRGPointButton, 'controlGroupHidden');
        },
        
        
        /*
         *
         */
        initSaveToPortal: function() {          
          
          esriId.registerOAuthInfos();
          
          this.own(dojoOn(this.saveGRGPointButton, "click", dojoLang.hitch(this, function(evt) {
          
            var featureServiceName = this.addGRGPointName.value;
          
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
                    drawGRG.createFeatureService(createServiceUrl, token, 
                      drawGRG.getFeatureServiceParams(featureServiceName, this.map)).then(dojoLang.hitch(this, function(response1) {
                        if (response1.success) {
                          var addToDefinitionUrl = response1.serviceurl.replace(new RegExp('rest', 'g'), "rest/admin") + "/addToDefinition";
                          drawGRG.addDefinitionToService(addToDefinitionUrl, token, drawGRG.getLayerParams(featureServiceName, this.map, this.cellTextSymbol, this.cellAreaFillSymbol)).then(dojoLang.hitch(this, function(response2) {
                            if (response2.success) {
                              //Push features to new layer
                              var newFeatureLayer = new esriFeatureLayer(response1.serviceurl + "/0?token=" + token, {
                                mode: esriFeatureLayer.MODE_SNAPSHOT,
                                outFields: ["*"]                                  
                               });
                              this.map.addLayer(newFeatureLayer);

                              var newGraphics = [];
                              dojoArray.forEach(this.GRGPoint.graphics, function (g) {
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
