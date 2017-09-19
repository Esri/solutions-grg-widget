define([
  'dojo',
  'dojo/_base/declare',
  'jimu/BaseWidget',
  'dojo/_base/array',
  'dojo/_base/lang',
  'dojo/dom-class',
  'dojo/dom-attr',
  'dojo/dom-construct',
  'dojo/dom-style',
  'dojo/on',
  'dojo/keys',
  'dojo/query',  
  'dojo/string',
  'dojo/topic',
  'dojo/_base/html',
  
  'dijit/_WidgetBase',
  'dijit/_WidgetsInTemplateMixin',
  'dijit/registry',
  'dijit/TooltipDialog',
  'dijit/popup',
  'dijit/Menu',
  'dijit/MenuItem',
  'dijit/MenuSeparator',
  
  'jimu/dijit/Message',
  'jimu/dijit/LoadingIndicator',
  'jimu/LayerInfos/LayerInfos',
  'jimu/utils',
  
  'esri/IdentityManager',
  'esri/arcgis/OAuthInfo',
  'esri/arcgis/Portal',
  'esri/config',
  'esri/Color',
  'esri/dijit/util/busyIndicator',
  'esri/graphic',
  'esri/geometry/geometryEngine',
  'esri/geometry/Extent',
  'esri/geometry/Point',  
  'esri/geometry/Polyline',
  'esri/geometry/webMercatorUtils',
  'esri/layers/FeatureLayer',
  'esri/layers/GraphicsLayer',
  'esri/layers/LabelClass',
  'esri/SpatialReference',
  'esri/symbols/Font',
  'esri/symbols/SimpleMarkerSymbol',
  'esri/symbols/SimpleFillSymbol',
  'esri/symbols/TextSymbol',
  'esri/toolbars/draw',
  'esri/toolbars/edit',
  'esri/renderers/SimpleRenderer',
  'esri/tasks/query',
  'esri/request',
  
  './js/GridSettings',
  './js/CoordinateInput',
  './js/drawGRG',
  './js/DrawFeedBack',
  './js/EditOutputCoordinate',
  './js/geometry-utils',
  './js/geometryUtils',
  './js/mgrs-utils',
  './js/mgrs',
  'dijit/form/NumberTextBox',
  'dijit/form/RadioButton',
  'dijit/form/NumberSpinner',
],
  function (
    dojo,
    declare,
    BaseWidget,
    array,
    lang,
    domClass,
    domAttr,
    domConstruct,
    domStyle,
    on,
    keys,
    query,
    dojoString,
    topic,
    html,
    dijitWidgetBase,    
    dijitWidgetsInTemplate,
    dijitRegistry,
    dijitTooltipDialog,
    dijitPopup,
    Menu, 
    MenuItem, 
    MenuSeparator,      
    Message,
    LoadingIndicator,
    jimuLayerInfos,
    utils,
    esriId,
    esriOAuthInfo,
    esriPortal,
    esriConfig,
    Color,
    busyIndicator,
    Graphic,
    GeometryEngine,
    Extent,
    Point,
    Polyline,
    WebMercatorUtils,
    FeatureLayer,
    GraphicsLayer,
    LabelClass,
    SpatialReference,
    Font,
    SimpleMarkerSymbol,
    SimpleFillSymbol,
    TextSymbol,
    Draw,
    Edit,
    SimpleRenderer,
    Query,
    esriRequest,
    GridSettings,
    coordInput,
    drawGRG,
    drawFeedBackPoint,
    editOutputCoordinate,
    gridGeomUtils,
    geometryUtils,
    mgrsUtils,
    mgrs
  ) {
    return declare([BaseWidget, dijitWidgetBase, dijitWidgetsInTemplate], {
      baseClass: 'jimu-widget-GRGDrafter',
      _lastOpenPanel: "mainPage", //Flag to hold last open panel, default will be main page
      _currentOpenPanel: "mainPage", //Flag to hold last open panel, default will be main page
      _gridSettingsInstance: null, //Object to hold Plan Settings instance
      _cellShape: "default",
      _labelStartPosition: "lowerLeft",
      _cellUnits: "meters",
      _labelType: "alphaNumeric",
      _labelDirection: "horizontal",
      _gridOrigin: "center",
      _referenceSystem: 'MGRS',
      _showLabels: {'value': true},
      _GRGAreaFillSymbol: null,
      _cellTextSymbol: null,
      angle: 0,
      GRG: null,
      featureLayerInfo: null,
      centerPoint: [],
      geodesicGrid: true,
      
      postMixInProperties: function () {
        //mixin default nls with widget nls
        this.nls.common = {};
        lang.mixin(this.nls.common, window.jimuNls.common);
      },
      
      constructor: function (args) {
          declare.safeMixin(this, args);
        },

      postCreate: function () {
        //modify String's prototype so we can format a string
        if (!String.prototype.format) {
          String.prototype.format = function() {
            var args = arguments;
            return this.replace(/{(\d+)}/g, function(match, number) { 
              return typeof args[number] != 'undefined'
                ? args[number]
                : match
              ;
            });
          };
        }
        
        this.inherited(arguments);
        
        this.extentAreaFillSymbol = {
          type: 'esriSFS',
          style: 'esriSFSSolid',
          color: [155,155,155,0],
          outline: {
            color: [0, 0, 255, 255],
            width: 1.25,
            type: 'esriSLS',
            style: 'esriSLSSolid'
          }};
          
        this.pointSymbol = {
            'color': [255, 0, 0, 255],
            'size': 8,
            'type': 'esriSMS',
            'style': 'esriSMSCircle',
            'outline': {
                'color': [255, 0, 0, 255],
                'width': 1,
                'type': 'esriSLS',
                'style': 'esriSLSSolid'
            }};        
        
        // create graphics layer for grid extent and add to map
        this._graphicsLayerGRGExtent = new GraphicsLayer({id: "graphicsLayerGRGExtent"});
        this._extentSym = new SimpleFillSymbol(this.extentAreaFillSymbol);        
        
        //set up symbology for point input
        this._ptSym = new SimpleMarkerSymbol(this.pointSymbol);
        
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
            "drawingInfo": {
              "renderer": {
               "type": "simple",
               "symbol": this.gridSymbol
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
                  "symbol": this._cellTextSymbol
                }
              ]
            },
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
        
        this.GRGArea = new FeatureLayer(featureCollection,{
          id: "Gridded-Reference-Graphic",
          outFields: ["*"],
          showLabels: true
        });   
        
        this.map.addLayers([this.GRGArea,this._graphicsLayerGRGExtent]);
        
        //set up coordinate input dijit for GRG Point by Size
        this.grgPointBySizeCoordTool = new coordInput({nls: this.nls, appConfig: this.appConfig}, this.newGRGPointBySizeOriginCoords);      
        this.grgPointBySizeCoordTool.inputCoordinate.formatType = 'DD';
        this.grgPointBySizeCoordinateFormat = new dijitTooltipDialog({
          content: new editOutputCoordinate({nls: this.nls}),
          style: 'width: 400px'
        });

        if(this.appConfig.theme.name === 'DartTheme')
        {
          domClass.add(this.grgPointBySizeCoordinateFormat.domNode, 'dartThemeClaroDijitTooltipContainerOverride');
        }
        
        //set up coordinate input dijit for GRG Point by Ref System
        this.grgPointByRefSystemCoordTool = new coordInput({nls: this.nls, appConfig: this.appConfig}, this.newGRGPointByRefSystemOriginCoords);      
        this.grgPointByRefSystemCoordTool.inputCoordinate.formatType = 'DD';
        this.grgPointByRefSystemCoordinateFormat = new dijitTooltipDialog({
          content: new editOutputCoordinate({nls: this.nls}),
          style: 'width: 400px'
        });

        if(this.appConfig.theme.name === 'DartTheme')
        {
          domClass.add(this.grgPointByRefSystemCoordinateFormat.domNode, 'dartThemeClaroDijitTooltipContainerOverride');
        }
        
        // add toolbar for drawing GRG Area by Extent
        this.dt_AreaBySize  = new Draw(this.map);
        
        // add extended toolbar for drawing GRG Point by Size
        this.dt_PointBySize = new drawFeedBackPoint(this.map,this.grgPointBySizeCoordTool.inputCoordinate.util);
        
        // add extended toolbar for drawing GRG Point by Reference System
        this.dt_PointByRefSystem = new drawFeedBackPoint(this.map,this.grgPointByRefSystemCoordTool.inputCoordinate.util);
        
        // add toolbar for drawing GRG MGRS
        this.dt_AreaByRefSystem = new Draw(this.map);
        
        // add edit toolbar that will be used for rotating grid 
        this.editToolbar = new Edit(this.map,{uniformScaling:true,allowAddVertices:true,allowDeleteVertices:true});
                              
        this._initLoading();
        
        this._handleClickEvents();
        
        this._createGridSettings();
      },

      startup: function () {
        this.inherited(arguments);
        this.busyIndicator = busyIndicator.create({target: this.domNode.parentNode.parentNode.parentNode, backgroundOpacity: 0});
        this._setTheme();        
      },

      /**
      * Performs activities like resizing widget components, connect map click etc on widget open
      * @memberOf widgets/GRG/Widget
      */
      onOpen: function () {
        console.log('widget opened');
      },

      /**
      * Performs activities like disconnect map handlers, close popup etc on widget close
      * @memberOf widgets/GRG/Widget
      */
      onClose: function () {
        console.log('widget closed');
      },        

      /**
      * This function used for loading indicator
      * @memberOf widgets/GRG/Widget
      */
      _initLoading: function () {
        this.loading = new LoadingIndicator({
          hidden: true
        });
        this.loading.placeAt(this.domNode);
        this.loading.startup();
      },

      /**
      * Handle click events for different controls
      * @memberOf widgets/GRG/Widget
      **/
      _handleClickEvents: function () {        
        /**
        * Main menu panel buttons
        **/
            //handle new GRG Area button click
            this.own(on(this.newGRGAreaButton, "click", lang.hitch(this, function () {
              var node = dijitRegistry.byId(this.newGRGAreaButton);
              if(dojo.hasClass(node,'GRGDrafterLabelSettingsDownButton')) {
                //in closed state - so open and change arrow to up
                html.removeClass(this.fromAreaContainer, 'controlGroupHidden');
                html.removeClass(this.newGRGAreaButton, 'GRGDrafterLabelSettingsDownButton');
                html.addClass(this.newGRGAreaButton, 'GRGDrafterLabelSettingsUpButton');
                //close label settings if open
                html.addClass(this.fromPointContainer, 'controlGroupHidden');
                html.removeClass(this.newGRGPointButton, 'GRGDrafterLabelSettingsUpButton');
                html.addClass(this.newGRGPointButton, 'GRGDrafterLabelSettingsDownButton');
              } else {
                //in open state - so close and change arrow to down
                html.addClass(this.fromAreaContainer, 'controlGroupHidden');
                html.addClass(this.newGRGAreaButton, 'GRGDrafterLabelSettingsDownButton');
                html.removeClass(this.newGRGAreaButton, 'GRGDrafterLabelSettingsUpButton');
              }
            })));
            
            //handle new GRG Point button click
            this.own(on(this.newGRGPointButton, "click", lang.hitch(this, function () {
              var node = dijitRegistry.byId(this.newGRGPointButton);
              if(dojo.hasClass(node,'GRGDrafterLabelSettingsDownButton')) {
                //in closed state - so open and change arrow to up
                html.removeClass(this.fromPointContainer, 'controlGroupHidden');
                html.removeClass(this.newGRGPointButton, 'GRGDrafterLabelSettingsDownButton');
                html.addClass(this.newGRGPointButton, 'GRGDrafterLabelSettingsUpButton');
                //close label settings if open
                html.addClass(this.fromAreaContainer, 'controlGroupHidden');
                html.removeClass(this.newGRGAreaButton, 'GRGDrafterLabelSettingsUpButton');
                html.addClass(this.newGRGAreaButton, 'GRGDrafterLabelSettingsDownButton');
              } else {
                //in open state - so close and change arrow to down
                html.addClass(this.fromPointContainer, 'controlGroupHidden');
                html.addClass(this.newGRGPointButton, 'GRGDrafterLabelSettingsDownButton');
                html.removeClass(this.newGRGPointButton, 'GRGDrafterLabelSettingsUpButton');
              }
            })));
        
            //Handle click event new GRG by size button
            this.own(on(this.newAreaGRGBySizeButton, 'click', lang.hitch(this, function () {
              this._showPanel("grgAreaBySize");
            })));
            
            //Handle click event new GRG by reference system button
            this.own(on(this.newAreaGRGFromRefSystemButton, 'click', lang.hitch(this, function () {
              this._showPanel("grgAreaByRefSystem");
            })));
            
            //Handle click event new GRG from non standard grid button
            // not implemented yet
            //this.own(on(this.newAreaGRGFromNonStandardButton, 'click', lang.hitch(this, function () {
              //this._showPanel("grgAreaFromNonStandard");
            //})));
            
            //Handle click event new GRG by size button
            this.own(on(this.newPointGRGBySizeButton, 'click', lang.hitch(this, function () {
              this._showPanel("grgPointBySize");
            })));
            
            //Handle click event new GRG by reference system button
            this.own(on(this.newPointGRGFromRefSystemButton, 'click', lang.hitch(this, function () {
              this._showPanel("grgPointByRefSystem");
            })));
        
        /**
        * GRG from Area by Size panel
        **/
        
            //Handle click event of back button
            this.own(on(this.grgAreaBySizePanelBackButton, 'click', lang.hitch(this, function () {
              this._resetOnBackToMainPage();
            })));
            
            //handle Grid Settings button
            if(!this.config.grg.lockSettings) {              
              this.own(on(this.grgAreaBySizeSettingsButton, "click", lang.hitch(this, function () {
                this._updateSettingsPage(this._currentOpenPanel);
                this._showPanel("settingsPage");
              })));
            } else {
              this.grgAreaBySizeSettingsButton.title = this.nls.lockSettings;
            }
            //Handle click event of Add GRG Area by Polygon button
            this.own(on(this.grgAreaBySizeDrawPolygonIcon, 'click', lang.hitch(this, 
              this._grgAreaBySizeDrawPolygonIconClicked)));
              
            //Handle click event of Add GRG Area by Extent button
            this.own(on(this.grgAreaBySizeDrawExtentIcon, 'click', lang.hitch(this, 
              this._grgAreaBySizeDrawExtentIconClicked)));
              
            //Handle completion of GRG area drawing        
            this.own(on(this.dt_AreaBySize, 'draw-complete', lang.hitch(this, 
              this._dt_AreaBySizeComplete)));              
              
            //Handle click event of create GRG Area button        
            this.own(on(this.grgAreaBySizeCreateGRGButton, 'click', lang.hitch(this, 
              this._grgAreaBySizeCreateGRGButtonClicked)));
            
            //Handle click event of clear GRG Area button        
            this.own(on(this.grgAreaBySizeClearGRGButton, 'click', lang.hitch(this, function () {
              this._clearLayers(true);
            }))); 
            
            //Handle click event of number of row / columns checkbox        
            this.own(on(this.setNumberRowsColumns, 'click', lang.hitch(this, 
            this._setNumberRowsColumnsCheckBoxChanged)));
            
            //Handle number of horizontal cells change
            this.own(on(this.cellHorizontal, 'blur', lang.hitch(this, function () {
              if(this.cellHorizontal.isValid()) {
                if(this._graphicsLayerGRGExtent.graphics[0]) {                  
                  if(this.angle == 0) {
                    this._calculateCellWidthAndHeight(gridGeomUtils.extentToPolygon(this._graphicsLayerGRGExtent.graphics[0].geometry.getExtent()));
                  } else {   
                    this._calculateCellWidthAndHeight(this._graphicsLayerGRGExtent.graphics[0].geometry);                  
                  }
                }
              }
            })));
            
            //Handle number of vertical cells change
            this.own(on(this.cellVertical, 'blur', lang.hitch(this, function () {
              if(this.cellVertical.isValid()) {
                if(this._graphicsLayerGRGExtent.graphics[0]) {                  
                  if(this.angle == 0) {
                    this._calculateCellWidthAndHeight(gridGeomUtils.extentToPolygon(this._graphicsLayerGRGExtent.graphics[0].geometry.getExtent()));
                  } else {   
                    this._calculateCellWidthAndHeight(this._graphicsLayerGRGExtent.graphics[0].geometry);                  
                  }
                }
              }
            })));
            
            //Handle rotation number change
            this.own(on(this.grgAreaBySizeRotation, 'keyup', lang.hitch(this, function () {
              setTimeout(lang.hitch(this, function(){ 
                this.grgAreaBySizeRotation.setValue(parseFloat(this.grgAreaBySizeRotation.displayedValue)); 
                if (this.grgAreaBySizeRotation.isValid() && !isNaN(this.grgAreaBySizeRotation.value) && this._graphicsLayerGRGExtent.graphics[0]){                        
                  var rotateBy = this.grgAreaBySizeRotation.getValue() - this.angle;            
                  var geom = GeometryEngine.rotate(this._graphicsLayerGRGExtent.graphics[0].geometry, rotateBy*-1);
                  this._graphicsLayerGRGExtent.clear();
                  var graphic = new Graphic(geom, this._extentSym);
                  this._graphicsLayerGRGExtent.add(graphic);            
                  this.angle = this.grgAreaBySizeRotation.getValue();
                  this.editToolbar.deactivate();
                }}), 1000);              
            })));
        
        /**
        * GRG from Area by Reference System panel
        **/
        
          //Handle click event of back button
          this.own(on(this.grgAreaByRefSystemPanelBackButton, 'click', lang.hitch(this, function () {
            this._resetOnBackToMainPage();
          })));
          
          //handle Grid Settings button
          if(!this.config.grg.lockSettings) {
            this.own(on(this.grgAreaByRefSystemSettingsButton, "click", lang.hitch(this, function () {
              this._updateSettingsPage(this._currentOpenPanel);
              this._showPanel("settingsPage");
            })));
          } else {
            this.grgAreaByRefSystemSettingsButton.title = this.nls.lockSettings;
          }          
          
          //Handle click event of draw extent icon
          this.own(on(this.grgAreaByRefSystemDrawIcon, 'click', lang.hitch(this, 
            this._grgAreaByRefSystemDrawIconClicked)));
          
          //Handle click event of create GRG button        
          this.own(on(this.grgAreaByRefSystemCreateGRGButton, 'click', lang.hitch(this, 
            this._grgAreaByRefSystemCreateGRGButtonClicked)));

          //Handle click event of clear GRG button        
            this.own(on(this.grgAreaByRefSystemClearGRGButton, 'click', lang.hitch(this, function () {
              this._clearLayers(true);
            })));            
          
          //Handle completion of extent drawing
          this.own(on(this.dt_AreaByRefSystem, 'draw-complete', lang.hitch(this,
            this._dt_AreaByRefSystemComplete)));
            
          //Handle grid size dropdown change
          this.own(on(this.grgAreaByRefSystemGridSize, 'change', lang.hitch(this, function () {
              switch(this.grgAreaByRefSystemGridSize.getValue()){
                case 'UTM':              
                  this.grgAreaByRefLabelFormat.value = 'Z';        
                  break;
                case '100000':              
                  this.grgAreaByRefLabelFormat.value = 'ZS';         
                  break;
                default:
                  this.grgAreaByRefLabelFormat.value = 'ZSXY'; 
                  break;
              }
            })));
        
        /**
        * GRG from Area by Non Standard Grid panel
          NOT IMPLEMENTED YET
          
            //Handle click event of back button
            this.own(on(this.grgAreaByNonStandardPanelBackButton, 'click', lang.hitch(this, function () {
              this._resetOnBackToMainPage();
            })));

            //handle Grid Settings button
            if(!this.config.grg.lockSettings) {
              //handle Grid Settings button
              this.own(on(this.grgAreaByNonStandardSettingsButton, "click", lang.hitch(this, function () {
                this._updateSettingsPage(this._currentOpenPanel);
                this._showPanel("settingsPage");
              })));
            } else {
              this.grgAreaByNonStandardSettingsButton.title = this.nls.lockSettings;
            }
            
            
        **/
        
        /**
        * GRG from Point by Size panel
        **/
        
            //Handle click event of back button
            this.own(on(this.grgPointBySizePanelBackButton, 'click', lang.hitch(this, function () {
              this._resetOnBackToMainPage();
            })));

            //handle Grid Settings button
            if(!this.config.grg.lockSettings) {
              //handle Grid Settings button
              this.own(on(this.grgPointBySizeSettingsButton, "click", lang.hitch(this, function () {
                this._updateSettingsPage(this._currentOpenPanel);
                this._showPanel("settingsPage");
              })));
            } else {
              this.grgPointBySizeSettingsButton.title = this.nls.lockSettings;
            }
                        
            //Handle click event of create GRG point button        
            this.own(on(this.grgPointBySizeCreateGRGButton, 'click', lang.hitch(this, 
              this._grgPointBySizeCreateGRGButtonClicked)));
              
            //Handle click event of clear GRG Point button        
            this.own(on(this.grgPointBySizeClearGRGButton, 'click', lang.hitch(this, function () {
              this._clearLayers(true);
            })));
            
            //Handle click event of Add GRG Point draw button
            this.own(on(this.grgPointBySizeAddPointBtn, 'click', lang.hitch(this, 
              this._grgPointBySizeDrawButtonClicked)));
            
              
            //Handle completion of GRG point drawing
            this.own(on(this.dt_PointBySize, 'draw-complete', lang.hitch(this,
              this._dt_PointBySizeComplete)));
              
            //Handle change in coord input      
            this.own(this.grgPointBySizeCoordTool.inputCoordinate.watch('outputString', lang.hitch(this,
              function (r, ov, nv) {
                if(!this.grgPointBySizeCoordTool.manualInput){
                  this.grgPointBySizeCoordTool.set('value', nv);
                }
              }
            )));

            //Handle change in start point and update coord input
            this.own(this.dt_PointBySize.watch('startPoint', lang.hitch(this, 
              function (r, ov, nv) {
                this.grgPointBySizeCoordTool.inputCoordinate.set('coordinateEsriGeometry', nv);
                this.dt_PointBySize.addStartGraphic(nv, this._ptSym, this._graphicsLayerGRGExtent);
              }
            )));
            
            //Handle key up events in coord input
            this.own(on(this.grgPointBySizeCoordTool, 'keyup', lang.hitch(this, 
              this._grgPointBySizeCoordToolKeyWasPressed)));
            
            //Handle click event on coord format button
            this.own(on(this.grgPointBySizeCoordFormatButton, 'click', lang.hitch(this, 
              this._grgPointBySizeCoordFormatButtonClicked)));
            
            //Handle click event on apply button of the coord format popup        
            this.own(on(this.grgPointBySizeCoordinateFormat.content.applyButton, 'click', lang.hitch(this,
              this._grgPointBySizeCoordFormatPopupApplyButtonClicked)));
            
            //Handle click event on cancel button of the coord format popup         
            this.own(on(this.grgPointBySizeCoordinateFormat.content.cancelButton, 'click', lang.hitch(this, 
              function () {
                dijitPopup.close(this.grgPointBySizeCoordinateFormat);
              }
            )));
        
        /**
        * GRG from Point by Reference System panel
        **/
        
            //Handle click event of back button
            this.own(on(this.grgPointByRefSystemPanelBackButton, 'click', lang.hitch(this, function () {
              this._resetOnBackToMainPage();
            })));

            //handle Grid Settings button
            if(!this.config.grg.lockSettings) {
              //handle Grid Settings button
              this.own(on(this.grgPointByRefSystemSettingsButton, "click", lang.hitch(this, function () {
                this._updateSettingsPage(this._currentOpenPanel);
                this._showPanel("settingsPage");
              })));
            } else {
              this.grgPointByRefSystemSettingsButton.title = this.nls.lockSettings;
            }          
            
            //Handle click event of create GRG point button        
            this.own(on(this.grgPointByRefSystemCreateGRGButton, 'click', lang.hitch(this, 
              this._grgPointByRefSystemCreateGRGButtonClicked)));
              
            //Handle click event of clear GRG Point button        
            this.own(on(this.grgPointByRefSystemClearGRGButton, 'click', lang.hitch(this, function () {
              this._clearLayers(true);
            })));

            //Handle click event of Add GRG Point draw button
            this.own(on(this.grgPointByRefSystemAddPointBtn, 'click', lang.hitch(this, 
              this._grgPointByRefSystemDrawButtonClicked)));
              
            //Handle completion of GRG point drawing
            this.own(on(this.dt_PointByRefSystem, 'draw-complete', lang.hitch(this,
              this._dt_PointByRefSystemComplete)));
            
            //Handle change in coord input      
            this.own(this.grgPointByRefSystemCoordTool.inputCoordinate.watch('outputString', lang.hitch(this,
              function (r, ov, nv) {
                if(!this.grgPointByRefSystemCoordTool.manualInput){
                  this.grgPointByRefSystemCoordTool.set('value', nv);
                }
              }
            )));
            
            //Handle change in start point and update coord input
            this.own(this.dt_PointByRefSystem.watch('startPoint', lang.hitch(this, 
              function (r, ov, nv) {
                this.grgPointByRefSystemCoordTool.inputCoordinate.set('coordinateEsriGeometry', nv);
                this.dt_PointByRefSystem.addStartGraphic(nv, this._ptSym, this._graphicsLayerGRGExtent);
              }
            )));
            
            //Handle key up events in coord input
            this.own(on(this.grgPointByRefSystemCoordTool, 'keyup', lang.hitch(this, 
              this._grgPointByRefSystemCoordToolKeyWasPressed)));
            
            //Handle click event on coord format button
            this.own(on(this.grgPointByRefSystemCoordFormatButton, 'click', lang.hitch(this, 
              this._grgPointByRefSystemCoordFormatButtonClicked)));
            
            //Handle click event on apply button of the coord format popup        
            this.own(on(this.grgPointByRefSystemCoordinateFormat.content.applyButton, 'click', lang.hitch(this,
              this._grgPointByRefSystemCoordFormatPopupApplyButtonClicked)));
            
            //Handle click event on cancel button of the coord format popup         
            this.own(on(this.grgPointByRefSystemCoordinateFormat.content.cancelButton, 'click', lang.hitch(this, 
              function () {
                dijitPopup.close(this.grgPointByRefSystemCoordinateFormat);
              }
            )));
            
            //Handle grid size dropdown change
            this.own(on(this.grgPointByRefSystemGridSize, 'change', lang.hitch(this, function () {
              switch(this.grgPointByRefSystemGridSize.getValue()){
                case 'UTM':              
                  this.grgPointByRefLabelFormat.value = 'Z';        
                  break;
                case '100000':              
                  this.grgPointByRefLabelFormat.value = 'ZS';         
                  break;
                default:
                  this.grgPointByRefLabelFormat.value = 'ZSXY'; 
                  break;
              }
            })));
        
        /**
        * Settings panel
        **/
        
            //Handle click event of Grid settings back button
            this.own(on(this.gridSettingsPanelBackButton, "click", lang.hitch(this, function () {
              this._gridSettingsInstance.onClose();          
              this._showPanel(this._lastOpenPanel);
            })));
        
        
        /**
        * Publish panel
        **/
            //Handle click event of Grid settings back button
            this.own(on(this.publishPanelBackButton, "click", lang.hitch(this, function () {
              //remove any messages
              this.publishMessage.innerHTML = '';
              //clear layer name
              this.addGRGNameArea.setValue('');
              this._gridSettingsInstance.onClose();
              this._graphicsLayerGRGExtent.show();
              this._showPanel(this._lastOpenPanel);              
            })));
            
            //Handle click event of publish GRG to portal button
            this.own(on(this.grgAreaBySizePublishGRGButton, 'click', lang.hitch(this, function () {
              if(this.addGRGNameArea.isValid()) {
                this.publishMessage.innerHTML = '';
                this._initSaveToPortal(this.addGRGNameArea.value)
              } else {
                // Invalid entry
                this.publishMessage.innerHTML = this.nls.missingLayerNameMessage;
              }
            })));
            
            //Handle click event of show labels toggle button
            this.own(on(this.settingsShowLabelsToggle, 'click', lang.hitch(this, function () {
              var featureLayerInfo = jimuLayerInfos.getInstanceSync().getLayerInfoById("Gridded-Reference-Graphic");
              this._showLabels = this.settingsShowLabelsToggle.checked;
              if(this.settingsShowLabelsToggle.checked) {                
                featureLayerInfo.showLabels();
              } else {
                featureLayerInfo.hideLabels();
              }
            })));
        
        
        /**
        * Toolbar events
        **/
            //Handle graphic moved
            this.own(on(this.editToolbar, "graphic-move-stop", lang.hitch(this,function(evt){
                this.centerPoint = evt.graphic.geometry.getCentroid();
            })));
             
            //Handle graphic rotated  
            this.own(on(this.editToolbar, "rotate-stop", lang.hitch(this,function(evt){
                this.angle = this.angle + parseFloat(evt.info.angle.toFixed(1));
                this.grgAreaBySizeRotation.setValue(this.angle);
            })));
            
                      
            //Handle graphic vertices changed 
            this.own(on(this.editToolbar, "vertex-move-stop", lang.hitch(this,function(evt){
                this.centerPoint = evt.graphic.geometry.getCentroid();
                this._calculateCellWidthAndHeight(gridGeomUtils.extentToPolygon(this._graphicsLayerGRGExtent.graphics[0].geometry.getExtent()));
            })));

            //Handle graphic scaled 
            this.own(on(this.editToolbar, "scale-stop", lang.hitch(this,function(evt){
                this.centerPoint = evt.graphic.geometry.getCentroid();
                this._calculateCellWidthAndHeight(evt.graphic.geometry);
            })));
      },
      
      /**
      * Get panel node from panel name
      * @param {string} panel name
      * @memberOf widgets/GRG/Widget
      **/
      _updateSettingsPage: function (panelName) {
        //reset the grid settings to show all
        html.removeClass(this._gridSettingsInstance.gridShapeContainer, 'controlGroupHidden');
        html.removeClass(this._gridSettingsInstance.gridUnitsContainer, 'controlGroupHidden');
        html.removeClass(this._gridSettingsInstance.labelStyleContainer, 'controlGroupHidden');
        html.removeClass(this._gridSettingsInstance.labelStartPositionContainer, 'controlGroupHidden');
        html.removeClass(this._gridSettingsInstance.labelDirectionContainer, 'controlGroupHidden');
        
        html.addClass(this._gridSettingsInstance.gridOriginContainer, 'controlGroupHidden');
        html.addClass(this._gridSettingsInstance.gridRefSystemContainer, 'controlGroupHidden');
        
        switch (panelName) {         
          case "grgAreaBySize":
            break;          
          case "grgAreaFromNonStandard":
            break;
          case "grgPointBySize":
            html.removeClass(this._gridSettingsInstance.gridOriginContainer, 'controlGroupHidden');
            break;
          case "grgAreaByRefSystem":
          case "grgPointByRefSystem":
            html.addClass(this._gridSettingsInstance.gridShapeContainer, 'controlGroupHidden');
            html.addClass(this._gridSettingsInstance.gridUnitsContainer, 'controlGroupHidden');
            html.addClass(this._gridSettingsInstance.labelStyleContainer, 'controlGroupHidden');
            html.addClass(this._gridSettingsInstance.labelStartPositionContainer, 'controlGroupHidden');
            html.addClass(this._gridSettingsInstance.labelDirectionContainer, 'controlGroupHidden');
            html.addClass(this._gridSettingsInstance.labelDirectionContainer, 'controlGroupHidden');
            html.removeClass(this._gridSettingsInstance.gridRefSystemContainer, 'controlGroupHidden');            
            break;
        }
      },
      
      /**
      * Get panel node from panel name
      * @param {string} panel name
      * @memberOf widgets/GRG/Widget
      **/
      _getNodeByName: function (panelName) {
        var node;
        switch (panelName) {
          case "mainPage":
            node = this.mainPageNode;
            break;          
          case "grgAreaBySize":
            node = this.grgAreaBySizePageNode;
            break;
          case "grgAreaByRefSystem":
            node = this.grgAreaByRefSystemPageNode;
            break;
          case "grgAreaFromNonStandard":
            node = this.grgAreaFromNonStandardPageNode;
            break;
          case "grgPointBySize":
            node = this.grgPointBySizePageNode;
            break;
          case "grgPointByRefSystem":
            node = this.grgPointByRefSystemPageNode;
            break;
          case "settingsPage":
            node = this.settingsPageNode;
            break;
          case "publishPage":
            node = this.publishPageNode;
            break;
        }
        return node;
      },

      /**
      * This function resets everything on navigating back to main page
      * @memberOf widgets/GRG/Widget
      */
      _resetOnBackToMainPage: function () {
        //reset the tools
        this._showPanel("mainPage");
        this._reset();
      },

      _reset: function () {
          this._clearLayers(true);
          //ensure all toolbars are deactivated
          this.dt_AreaBySize.deactivate();
          this.dt_PointBySize.deactivate();
          this.dt_PointByRefSystem.deactivate();
          this.dt_AreaByRefSystem.deactivate();
          
          this.map.enableMapNavigation();
                    
          dojo.removeClass(this.grgAreaBySizeDrawPolygonIcon, 'jimu-polygon-active');
          dojo.removeClass(this.grgAreaBySizeDrawExtentIcon, 'jimu-extent-active');
          dojo.removeClass(this.grgPointBySizeAddPointBtn, 'jimu-edit-active');
          dojo.removeClass(this.grgPointByRefSystemAddPointBtn, 'jimu-edit-active');
          
          html.addClass(this.fromAreaContainer, 'controlGroupHidden');
          html.addClass(this.newGRGAreaButton, 'GRGDrafterLabelSettingsDownButton');
          html.removeClass(this.newGRGAreaButton, 'GRGDrafterLabelSettingsUpButton');
          html.addClass(this.fromPointContainer, 'controlGroupHidden');
          html.addClass(this.newGRGPointButton, 'GRGDrafterLabelSettingsDownButton');
          html.removeClass(this.newGRGPointButton, 'GRGDrafterLabelSettingsUpButton');
        },

      _clearLayers: function (includeExtentLayer) {
          this.GRGArea.clear();
          //refresh GRG layer to make sure any labels are removed
          this.GRGArea.refresh();          
          //ensure the edit toolbar is deactived
          this.editToolbar.deactivate();
          
          if(includeExtentLayer) {
            this._graphicsLayerGRGExtent.clear();
            this.dt_PointBySize.removeStartGraphic(this._graphicsLayerGRGExtent);
            this.dt_PointByRefSystem.removeStartGraphic(this._graphicsLayerGRGExtent);
            //reset the angle
            this.angle = 0;
            this.grgAreaBySizeRotation.setValue(this.angle);
            this.grgAreaBySizeRotation.set('disabled', true);            
          }
      },

      /**
      * Creates grid settings
      * @memberOf widgets/GRG/Widget
      **/
      _createGridSettings: function () {
        //Create GridSettings Instance
        this._gridSettingsInstance = new GridSettings({
          nls: this.nls,
          config: this.config,
          appConfig: this.appConfig
        }, domConstruct.create("div", {}, this.gridSettingsNode));        
        //add a listener for change in settings
        this.own(this._gridSettingsInstance.on("gridSettingsChanged",
          lang.hitch(this, function (updatedSettings) {
            this._cellShape = updatedSettings.cellShape;
            this._labelStartPosition = updatedSettings.labelStartPosition;
            this._cellUnits = updatedSettings.cellUnits;
            this._labelType = updatedSettings.labelType;
            this._labelDirection = updatedSettings.labelDirection;
            this._gridOrigin = updatedSettings.gridOrigin;
            this._referenceSystem = updatedSettings.referenceSystem;
            
            // show or hide labels
            featureLayerInfo = jimuLayerInfos.getInstanceSync().getLayerInfoById("Gridded-Reference-Graphic");
            featureLayerInfo.enablePopup();
            if(this._showLabels) {
              featureLayerInfo.showLabels();
            } else {
              featureLayerInfo.hideLabels();
            }
            
            if(this._cellShape == "default") {
              this.grgAreaBySizeCellHeight.set('disabled', false);
              this.grgAreaBySizeCellHeight.setValue(this.grgAreaBySizeCellWidth.value);
              this.pointCellHeight.set('disabled', false);
              this.pointCellHeight.setValue(this.pointCellWidth.value);
            } else {
              this.grgAreaBySizeCellHeight.set('disabled', true);
              this.grgAreaBySizeCellHeight.setValue(0);
              this.pointCellHeight.set('disabled', true);
              this.pointCellHeight.setValue(0);
            }

            //set grid colours
            var fillColor = new Color(updatedSettings.gridFillColor);
            fillColor.a = 1 - updatedSettings.gridFillTransparency;
            
            var outlineColor = new Color(updatedSettings.gridOutlineColor);
            outlineColor.a = 1 - updatedSettings.gridOutlineTransparency;
                        
            this._GRGAreaFillSymbol = {
              type: 'esriSFS',
              style: 'esriSFSSolid',
              color: fillColor,
              outline: {
                color: outlineColor,
                width: 2,
                type: 'esriSLS',
                style: 'esriSLSSolid'
            }};
            
            // create a renderer for the grg layer to override default symbology
            var gridSymbol = new SimpleFillSymbol(this._GRGAreaFillSymbol); 
            var gridRenderer = new SimpleRenderer(gridSymbol);
            this.GRGArea.setRenderer(gridRenderer);
            
            var textColor = new Color(updatedSettings.fontSettings.textColor);
            
            var labelTrans = (1 - updatedSettings.fontSettings.labelTransparency) * 255;
            
            if(updatedSettings.fontSettings.haloOn){
              var haloSize = parseInt(updatedSettings.fontSettings.haloSize);
            } else {
              var haloSize = 0;
            }
            
            var haloColor = new Color(updatedSettings.fontSettings.haloColor);
            
            this._cellTextSymbol = {
              "type": "esriTS",
              "color": [
                textColor.r,
                textColor.g,
                textColor.b,
                labelTrans
              ],
              "haloSize": haloSize,
              "haloColor": [
                haloColor.r,
                haloColor.g,
                haloColor.b,
                255
              ],              
              "horizontalAlignment": "center",
              "font": {
                "size": parseInt(updatedSettings.fontSettings.fontSize),
                "style": updatedSettings.fontSettings.font.italic?"italic":"normal",
                "weight": updatedSettings.fontSettings.font.bold?"bold":"normal",
                "family": updatedSettings.fontSettings.font.fontFamily,
                "decoration" : updatedSettings.fontSettings.font.underline?"underline":"none"
              }              
            };
                        
            // create a text symbol to define the style of labels
            var json = {"labelExpressionInfo": {"value" : "{grid}"}};
            var labelClass = new LabelClass(json);
            labelClass.symbol = new TextSymbol(this._cellTextSymbol);
            this.GRGArea.setLabelingInfo([labelClass]);
            
            this.GRGArea.refresh();
              
          })));
        this._gridSettingsInstance.startup();
      },

      /**
      * Displays selected panel
      * @param {string} panel name
      * @memberOf widgets/GRG/Widget
      **/
      _showPanel: function (currentPanel) {
        var prevNode, currentNode;
        //check if previous panel exist and hide it
        if (this._currentOpenPanel) {
          prevNode = this._getNodeByName(this._currentOpenPanel);
          domClass.add(prevNode, "GRGDrafterHidden");
        }
        //get current panel to be displayed and show it
        currentNode = this._getNodeByName(currentPanel);
        domClass.remove(currentNode, "GRGDrafterHidden");
        //set the current panel and previous panel
        this._lastOpenPanel = this._currentOpenPanel;
        this._currentOpenPanel = currentPanel;
      },
      
      _grgAreaBySizeDrawPolygonIconClicked: function () {
        this._clearLayers(true); 
        // deactive the other tool if active
        var node = dijitRegistry.byId(this.grgAreaBySizeDrawExtentIcon);
        if(dojo.hasClass(node,'jimu-extent-active')) {
          //this tool is already selected so deactivate
          this.dt_AreaBySize.deactivate();
          domClass.toggle(this.grgAreaBySizeDrawExtentIcon, 'jimu-extent-active');
        }        
        var node = dijitRegistry.byId(this.grgAreaBySizeDrawPolygonIcon);
        if(dojo.hasClass(node,'jimu-polygon-active')) {
          //already selected so deactivate draw tool
          this.dt_AreaBySize.deactivate();
          this.map.enableMapNavigation();
        } else {
          this.map.disableMapNavigation();          
          this.dt_AreaBySize.activate('polygon');
          //depending on what draw option is used we want different edit functionality
          this.own(on(this._graphicsLayerGRGExtent, "click", lang.hitch(this, function(evt) {
            this.editToolbar.activate(Edit.MOVE|Edit.EDIT_VERTICES, evt.graphic); 
          })));          
        }
        domClass.toggle(this.grgAreaBySizeDrawPolygonIcon, 'jimu-polygon-active');
      },
      
      _grgAreaBySizeDrawExtentIconClicked: function () {
        this._clearLayers(true); 
        // deactive the other tool if active
        var node = dijitRegistry.byId(this.grgAreaBySizeDrawPolygonIcon);
        if(dojo.hasClass(node,'jimu-polygon-active')) {
          //this tool is already selected so deactivate
          this.dt_AreaBySize.deactivate();
          domClass.toggle(this.grgAreaBySizeDrawPolygonIcon, 'jimu-polygon-active');
        }        
        var node = dijitRegistry.byId(this.grgAreaBySizeDrawExtentIcon);
        if(dojo.hasClass(node,'jimu-extent-active')) {
          //already selected so deactivate draw tool
          this.dt_AreaBySize.deactivate();
          this.map.enableMapNavigation();
        } else {
          this.map.disableMapNavigation();          
          this.dt_AreaBySize.activate('extent');
          //depending on what draw option is used we want different edit functionality
          this.own(on(this._graphicsLayerGRGExtent, "click", lang.hitch(this, function(evt) {
            this.editToolbar.activate(Edit.MOVE|Edit.ROTATE|Edit.SCALE, evt.graphic); 
          })));
        }
        domClass.toggle(this.grgAreaBySizeDrawExtentIcon, 'jimu-extent-active');
      },
      
      _grgPointBySizeDrawButtonClicked: function () {
        var node = dijitRegistry.byId(this.grgPointBySizeAddPointBtn);
        if(dojo.hasClass(node,'jimu-edit-active')) {
          //already selected so deactivate draw tool
          this.dt_PointBySize.deactivate();
          this.map.enableMapNavigation();
        } else {
          this.dt_PointBySize.removeStartGraphic(this._graphicsLayerGRGExtent);
          this._clearLayers(true); 
          this.grgPointBySizeCoordTool.manualInput = false;        
          this.dt_PointBySize._setTooltipMessage(0);        
          this.map.disableMapNavigation();          
          this.dt_PointBySize.activate('point');
          var tooltip = this.dt_PointBySize._tooltip;
          if (tooltip) {
            tooltip.innerHTML = this.nls.drawPointToolTip;
          }          
        }
        domClass.toggle(this.grgPointBySizeAddPointBtn, 'jimu-edit-active');
      },
      
      _grgPointByRefSystemDrawButtonClicked: function () {
        var node = dijitRegistry.byId(this.grgPointByRefSystemAddPointBtn);
        if(dojo.hasClass(node,'jimu-edit-active')) {
          //already selected so deactivate draw tool
          this.dt_PointByRefSystem.deactivate();
          this.map.enableMapNavigation();
        } else {
          this.dt_PointByRefSystem.removeStartGraphic(this._graphicsLayerGRGExtent);
          this._clearLayers(true); 
          this.grgPointByRefSystemCoordTool.manualInput = false;        
          this.dt_PointByRefSystem._setTooltipMessage(0);        
          this.map.disableMapNavigation();          
          this.dt_PointByRefSystem.activate('point');
          var tooltip = this.dt_PointByRefSystem._tooltip;
          if (tooltip) {
            tooltip.innerHTML = this.nls.drawPointToolTip;
          }          
        }
        domClass.toggle(this.grgPointByRefSystemAddPointBtn, 'jimu-edit-active');
      },
      
      _grgAreaByRefSystemDrawIconClicked: function () {
        var node = dijitRegistry.byId(this.grgAreaByRefSystemDrawIcon);
        if(dojo.hasClass(node,'jimu-extent-active')) {
          //already selected so deactivate draw tool
          this.dt_AreaByRefSystem.deactivate();
          this.map.enableMapNavigation();
        } else {
          this._graphicsLayerGRGExtent.clear();          
          this.grgPointBySizeCoordTool.manualInput = false;        
          this.map.disableMapNavigation();          
          this.dt_AreaByRefSystem.activate('extent');
          this.editToolbar.deactivate();
          //depending on what draw option is used we want different edit functionality
          this.own(on(this._graphicsLayerGRGExtent, "click", lang.hitch(this, function(evt) {
            this.editToolbar.activate(Edit.MOVE|Edit.SCALE, evt.graphic); 
          })));          
        }
        domClass.toggle(this.grgAreaByRefSystemDrawIcon, 'jimu-extent-active');
        
      },
      
      _dt_AreaBySizeComplete: function (evt) {
        this.map.enableMapNavigation();
        this.dt_AreaBySize.deactivate();        
        if(evt.geometry.type == 'extent'){
          evt.geometry = gridGeomUtils.extentToPolygon(evt.geometry);
          var graphic = new Graphic(evt.geometry, this._extentSym);
          this.grgAreaBySizeRotation.set('disabled', false);
          domClass.toggle(this.grgAreaBySizeDrawExtentIcon, 'jimu-extent-active');
        } else {
          var graphic = new Graphic(evt.geometry, this._extentSym);
          evt.geometry = gridGeomUtils.extentToPolygon(evt.geometry.getExtent());
          domClass.toggle(this.grgAreaBySizeDrawPolygonIcon, 'jimu-polygon-active');
        }        
        this._graphicsLayerGRGExtent.add(graphic);
        this.centerPoint = evt.geometry.getCentroid();
        this._calculateCellWidthAndHeight(evt.geometry);        
      },
      
      _calculateCellWidthAndHeight: function (geometry) {
        //if the input id geographics project the geometry to WMAS
        if (geometry.spatialReference.wkid == 4326) {
          // if the geographic point can be projected the map spatial reference do so
          geometry = WebMercatorUtils.geographicToWebMercator(geometry);
        }
       
        //calculate the geodesic width and height of the required grid cells
        var calculatedCellWidth = ((GeometryEngine.geodesicLength(new Polyline({
            paths: [[[geometry.getPoint(0,0).x, geometry.getPoint(0,0).y], [geometry.getPoint(0,1).x, geometry.getPoint(0,1).y]]],
            spatialReference: geometry.spatialReference
          }), this._cellUnits))/this.cellHorizontal.value);
          
        var calculatedCellHeight = ((GeometryEngine.geodesicLength(new Polyline({
            paths: [[[geometry.getPoint(0,0).x, geometry.getPoint(0,0).y], [geometry.getPoint(0,3).x, geometry.getPoint(0,3).y]]],
            spatialReference: geometry.spatialReference
          }), this._cellUnits))/this.cellVertical.value);
          
        //convert the width and height into meters
        var cellWidthMeters = this.grgPointBySizeCoordTool.inputCoordinate.util.convertToMeters(calculatedCellWidth, this._cellUnits);
        var cellHeightMeters = this.grgPointBySizeCoordTool.inputCoordinate.util.convertToMeters(calculatedCellHeight, this._cellUnits);

        /**
        * if the width or height of a grid cell is over 20000m we need to use a planar grid
        * so recalculate the width and height using a planar measurement
        **/
        if((cellWidthMeters < 20000) && ((cellHeightMeters < 20000 && this._cellShape != "hexagon") || this._cellShape == "hexagon")) {
          this.geodesicGrid = true;
          this.grgAreaBySizeCellWidth.setValue(calculatedCellWidth);
          this._cellShape == "default"?this.grgAreaBySizeCellHeight.setValue(calculatedCellHeight):this.grgAreaBySizeCellHeight.setValue(0);
        } else {
          this.geodesicGrid = false;
          this.grgAreaBySizeCellWidth.setValue(((GeometryEngine.distance(geometry.getPoint(0,0), geometry.getPoint(0,1), this._cellUnits))/this.cellHorizontal.value)); 
          this._cellShape == "default"?this.grgAreaBySizeCellHeight.setValue(((GeometryEngine.distance(geometry.getPoint(0,0), geometry.getPoint(0,3), this._cellUnits))/this.cellVertical.value)):this.grgAreaBySizeCellHeight.setValue(0);
        }        
      },
      
      _dt_PointBySizeComplete: function () {          
        domClass.remove(this.grgPointBySizeAddPointBtn, 'jimu-edit-active');
        this.dt_PointBySize.deactivate();
        this.map.enableMapNavigation();
      },
      
      _dt_PointByRefSystemComplete: function () {          
        domClass.remove(this.grgPointByRefSystemAddPointBtn, 'jimu-edit-active');
        this.dt_PointByRefSystem.deactivate();
        this.map.enableMapNavigation();
      },
      
      _dt_AreaByRefSystemComplete: function (evt) {
        domClass.remove(this.grgAreaByRefSystemDrawIcon, 'jimu-extent-active');
        var graphic = new Graphic(gridGeomUtils.extentToPolygon(evt.geometry), this._extentSym);
        this._graphicsLayerGRGExtent.add(graphic);
        this.dt_AreaByRefSystem.deactivate();
        this.map.enableMapNavigation();
      },
      
      /*
       * catch key press in start point for GRG Point by Size
       */
      _grgPointBySizeCoordToolKeyWasPressed: function (evt) {
        this.grgPointBySizeCoordTool.manualInput = true;
        if (evt.keyCode === keys.ENTER) {
          this.grgPointBySizeCoordTool.inputCoordinate.getInputType().then(lang.hitch(this, 
            function (r) {
              if(r.inputType == "UNKNOWN"){
                var alertMessage = new Message({
                  message: this.nls.parseCoordinatesError
                });
              } else {
                this._reset();
                topic.publish(
                  'grg-center-point-input',
                  this.grgPointBySizeCoordTool.inputCoordinate.coordinateEsriGeometry
                );
                this._grgPointBySizeSetCoordLabel(r.inputType);
                var fs = this.grgPointBySizeCoordinateFormat.content.formats[r.inputType];
                this.grgPointBySizeCoordTool.inputCoordinate.set('formatString', fs.defaultFormat);
                this.grgPointBySizeCoordTool.inputCoordinate.set('formatType', r.inputType);
                this.dt_PointBySize.addStartGraphic(r.coordinateEsriGeometry, this._ptSym, this._graphicsLayerGRGExtent);
              }
            }
          ));
        }
      },
            
      /*
       * catch key press in start point for GRG Point by Size
       */
      _grgPointByRefSystemCoordToolKeyWasPressed: function (evt) {
        this.grgPointByRefSystemCoordTool.manualInput = true;
        if (evt.keyCode === keys.ENTER) {
          this.grgPointByRefSystemCoordTool.inputCoordinate.getInputType().then(lang.hitch(this, 
            function (r) {
              if(r.inputType == "UNKNOWN"){
                var alertMessage = new Message({
                  message: this.nls.parseCoordinatesError
                });
              } else {
                this._reset();
                topic.publish(
                  'grg-center-point-input',
                  this.grgPointByRefSystemCoordTool.inputCoordinate.coordinateEsriGeometry
                );
                this._grgPointByRefSystemSetCoordLabel(r.inputType);
                var fs = this.grgPointBySizeCoordinateFormat.content.formats[r.inputType];
                this.grgPointByRefSystemCoordTool.inputCoordinate.set('formatString', fs.defaultFormat);
                this.grgPointByRefSystemCoordTool.inputCoordinate.set('formatType', r.inputType);
                this.dt_PointByRefSystem.addStartGraphic(r.coordinateEsriGeometry, this._ptSym, this._graphicsLayerGRGExtent);
              }
            }
          ));
        }
      },
      
      /*
       *
       */
      _grgPointBySizeSetCoordLabel: function (toType) {
        this.grgPointBySizeCoordInputLabel.innerHTML = dojoString.substitute(
          'GRG Origin (${crdType})', {
              crdType: toType
          });
      },
      
      /*
       *
       */
      _grgPointByRefSystemSetCoordLabel: function (toType) {
        this.grgPointByRefSystemCoordInputLabel.innerHTML = dojoString.substitute(
          'GRG Origin (${crdType})', {
              crdType: toType
          });
      },
      
      /*
       *
       */
      _grgPointBySizeCoordFormatButtonClicked: function () {
        this.grgPointBySizeCoordinateFormat.content.set('ct', this.grgPointBySizeCoordTool.inputCoordinate.formatType);
        dijitPopup.open({
            popup: this.grgPointBySizeCoordinateFormat,
            around: this.grgPointBySizeCoordFormatButton
        });
      },
      
      /*
       *
       */
      _grgPointByRefSystemCoordFormatButtonClicked: function () {
        this.grgPointByRefSystemCoordinateFormat.content.set('ct', this.grgPointByRefSystemCoordTool.inputCoordinate.formatType);
        dijitPopup.open({
            popup: this.grgPointByRefSystemCoordinateFormat,
            around: this.grgPointByRefSystemCoordFormatButton
        });
      },
      
      /*
       *
       */
      _grgPointBySizeCoordFormatPopupApplyButtonClicked: function () {
        var fs = this.grgPointBySizeCoordinateFormat.content.formats[this.grgPointBySizeCoordinateFormat.content.ct];
        var cfs = fs.defaultFormat;
        var fv = this.grgPointBySizeCoordinateFormat.content.frmtSelect.get('value');
        if (fs.useCustom) {
            cfs = fs.customFormat;
        }
        this.grgPointBySizeCoordTool.inputCoordinate.set(
          'formatPrefix',
          this.grgPointBySizeCoordinateFormat.content.addSignChkBox.checked
        );
        this.grgPointBySizeCoordTool.inputCoordinate.set('formatString', cfs);
        this.grgPointBySizeCoordTool.inputCoordinate.set('formatType', fv);
        this._grgPointBySizeSetCoordLabel(fv);
        dijitPopup.close(this.grgPointBySizeCoordinateFormat);        
      },
      
      /*
       *
       */
      _grgPointByRefSystemCoordFormatPopupApplyButtonClicked: function () {
        var fs = this.grgPointByRefSystemCoordinateFormat.content.formats[this.grgPointByRefSystemCoordinateFormat.content.ct];
        var cfs = fs.defaultFormat;
        var fv = this.grgPointByRefSystemCoordinateFormat.content.frmtSelect.get('value');
        if (fs.useCustom) {
            cfs = fs.customFormat;
        }
        this.grgPointByRefSystemCoordTool.inputCoordinate.set(
          'formatPrefix',
          this.grgPointByRefSystemCoordinateFormat.content.addSignChkBox.checked
        );
        this.grgPointByRefSystemCoordTool.inputCoordinate.set('formatString', cfs);
        this.grgPointByRefSystemCoordTool.inputCoordinate.set('formatType', fv);
        this._grgPointByRefSystemSetCoordLabel(fv);
        dijitPopup.close(this.grgPointByRefSystemCoordinateFormat);        
      },
      
      _setNumberRowsColumnsCheckBoxChanged: function () {
        if(this.setNumberRowsColumns.checked) {
          this.grgAreaBySizeCellWidth.set('disabled', true);
          this.grgAreaBySizeCellHeight.set('disabled', true);
          this.cellHorizontal.set('disabled', false);
          this.cellVertical.set('disabled', false);
        } else {
          this.grgAreaBySizeCellWidth.set('disabled', false);
          this.grgAreaBySizeCellHeight.set('disabled', false);
          this.cellHorizontal.set('disabled', true);
          this.cellVertical.set('disabled', true);
          this.cellHorizontal.set('value', 10);
          this.cellVertical.set('value', 10);
        }
      },
      
      _grgAreaBySizeCreateGRGButtonClicked: function () {                 
        //check form inputs for validity
        if (this._graphicsLayerGRGExtent.graphics[0] && this.grgAreaBySizeCellWidth.isValid() && this.grgAreaBySizeCellHeight.isValid() && this.grgAreaBySizeRotation.isValid()) {
          this._clearLayers(false);
          
          if(this.angle == 0) {
            var geom = gridGeomUtils.extentToPolygon(this._graphicsLayerGRGExtent.graphics[0].geometry.getExtent());
          } else {          
            var geom = this._graphicsLayerGRGExtent.graphics[0].geometry;
          }
          
          //if the input is geographics project the geometry to WMAS
          if (geom.spatialReference.wkid == 4326) {
            // if the geographic point can be projected the map spatial reference do so
            geom = WebMercatorUtils.geographicToWebMercator(geom);
          }
          
          var GRGAreaWidth, GRGAreaHeight;
          //work out width and height of AOI, method depends on if the grid is to be geodesic
          if(this.geodesicGrid) {
            GRGAreaWidth = GeometryEngine.geodesicLength(new Polyline({
              paths: [[[geom.getPoint(0,0).x, geom.getPoint(0,0).y], [geom.getPoint(0,1).x, geom.getPoint(0,1).y]]],
              spatialReference: geom.spatialReference
            }), 'meters');          
            GRGAreaHeight = GeometryEngine.geodesicLength(new Polyline({
              paths: [[[geom.getPoint(0,0).x, geom.getPoint(0,0).y], [geom.getPoint(0,3).x, geom.getPoint(0,3).y]]],
              spatialReference: geom.spatialReference
            }), 'meters');            
          } else {
            GRGAreaWidth = GeometryEngine.distance(geom.getPoint(0,0), geom.getPoint(0,1), 'meters'); 
            GRGAreaHeight = GeometryEngine.distance(geom.getPoint(0,0), geom.getPoint(0,3), 'meters');
          }
          
          var cellWidth = this.grgPointBySizeCoordTool.inputCoordinate.util.convertToMeters(this.grgAreaBySizeCellWidth.value, this._cellUnits);
          var cellHeight = this.grgPointBySizeCoordTool.inputCoordinate.util.convertToMeters(this.grgAreaBySizeCellHeight.value,this._cellUnits);
          
          //work out how many cells are needed horizontally & Vertically to cover the whole canvas area
          var numCellsHorizontal = Math.round(GRGAreaWidth/cellWidth);
          
          var numCellsVertical;
          this._cellShape == "default"?numCellsVertical = Math.round(GRGAreaHeight/cellHeight):numCellsVertical = Math.round(GRGAreaHeight/(cellWidth)/Math.cos(30* Math.PI/180)) + 1;
          
          if(drawGRG.checkGridSize(numCellsHorizontal,numCellsVertical))
          {
            var features = drawGRG.createGRG(
              numCellsHorizontal,
              numCellsVertical,
              this.centerPoint,
              cellWidth,
              cellHeight,
              this.angle,
              this._labelStartPosition,
              this._labelType,
              this._labelDirection,
              this._cellShape,
              'center',
              this.geodesicGrid,
              this.map,              
              esriConfig.defaults.geometryService); 
            //apply the edits to the feature layer
            this.GRGArea.applyEdits(features, null, null);
            this.map.setExtent(this._graphicsLayerGRGExtent.graphics[0].geometry.getExtent().expand(2),false);
            this._graphicsLayerGRGExtent.clear(); 
            this._showPanel("publishPage");
          }
        }
      },
      
      /*
       *
       */
      _grgPointBySizeCreateGRGButtonClicked: function () {
        //check form inputs for validity
        if (this.dt_PointBySize.startGraphic && this.pointCellWidth.isValid() && this.pointCellHeight.isValid() && this.gridAnglePoint.isValid()) {
          
          //get center point of AOI
          var centerPoint = WebMercatorUtils.geographicToWebMercator(this.grgPointBySizeCoordTool.inputCoordinate.coordinateEsriGeometry);
          
          var cellWidth = this.grgPointBySizeCoordTool.inputCoordinate.util.convertToMeters(this.pointCellWidth.value,this._cellUnits);
          var cellHeight = this.grgPointBySizeCoordTool.inputCoordinate.util.convertToMeters(this.pointCellHeight.value,this._cellUnits);          

          // if the width or height of a grid cell is over 20000m we need to use a planar grid
          if((cellWidth < 20000) && ((cellHeight < 20000 && this._cellShape != "hexagon") || this._cellShape == "hexagon")) {
            this.geodesicGrid = true;
          } else {
            this.geodesicGrid = false;
          }
          
          if(drawGRG.checkGridSize(this.grgPointBySizeCellHorizontal.value,this.grgPointBySizeCellVertical.value))
          {
            var features = drawGRG.createGRG(
              this.grgPointBySizeCellHorizontal.value,
              this.grgPointBySizeCellVertical.value,
              centerPoint,
              cellWidth,
              cellHeight,
              this.gridAnglePoint.value,
              this._labelStartPosition,
              this._labelType,
              this._labelDirection,
              this._cellShape,
              this._gridOrigin,
              this.geodesicGrid,
              this.map,
              esriConfig.defaults.geometryService); 
            //apply the edits to the feature layer
            this.GRGArea.applyEdits(features, null, null);
            this.dt_PointBySize.removeStartGraphic(this._graphicsLayerGRGExtent);
            var geomArray = [];
            for(var i = 0;i < features.length;i++){
              geomArray.push(features[i].geometry);
            }
            var union = GeometryEngine.union(geomArray)
            this.map.setExtent(union.getExtent().expand(2),false);
            this._showPanel("publishPage");
          }          
        } else {
          // Invalid entry
          var alertMessage = new Message({
            message: this.nls.missingParametersMessage
          });          
        }
      },
      
      _grgPointByRefSystemCreateGRGButtonClicked: function () {
        var width, height, cellBLPoint, extent, MGRS, offsets;
        var geomArray = [];
        this._clearLayers(false);
        if(drawGRG.checkGridSize(this.grgPointByRefCellHorizontal.getValue(),this.grgPointByRefCellVertical.getValue())){        
          if (this.dt_PointByRefSystem.startGraphic && this.grgPointByRefCellHorizontal.isValid() && this.grgPointByRefCellVertical.isValid()) {
            var gridOrigin = this.grgPointByRefSystemCoordTool.inputCoordinate.coordinateEsriGeometry;
            switch(this.grgPointByRefSystemGridSize.getValue()){
              case 'UTM':
                  if(gridOrigin.x < 0){
                    var tempLon = (gridOrigin.x - (gridOrigin.x % 6)) - 6;
                  } else {
                    var tempLon = gridOrigin.x - (gridOrigin.x % 6);
                  }
                  if(gridOrigin.y < 0){
                    var tempLat = (gridOrigin.y - (gridOrigin.y % 8)) - 8;
                  } else {
                    var tempLat = gridOrigin.y - (gridOrigin.y % 8);
                  }                    
                break;              
              case '100000':
                MGRS = mgrs.LLtoMGRS(gridOrigin.y,gridOrigin.x,5);
                MGRS = MGRS.substring(0, MGRS.length - 10);
                MGRS = MGRS + '0000000000';
                break;
              case '10000':
                MGRS = mgrs.LLtoMGRS(gridOrigin.y,gridOrigin.x,1);
                break;
              case '1000':
                MGRS = mgrs.LLtoMGRS(gridOrigin.y,gridOrigin.x,2);
                break;
              case '100':
                MGRS = mgrs.LLtoMGRS(gridOrigin.y,gridOrigin.x,3);
                break;
              case '10':
                MGRS = mgrs.LLtoMGRS(gridOrigin.y,gridOrigin.x,4);
                break;
            }
            if(this.grgPointByRefSystemGridSize.getValue() == 'UTM') {
              cellBLPoint = new Point(tempLon,tempLat);
              width =  this.grgPointByRefCellHorizontal.getValue() * 6;          
              height = this.grgPointByRefCellVertical.getValue() * 8;
              extent = new Extent({
                "xmin":cellBLPoint.x,"ymin":cellBLPoint.y,"xmax":cellBLPoint.x + width,"ymax":cellBLPoint.y + height,
                "spatialReference":{"wkid":4326}
              });
              extent = WebMercatorUtils.geographicToWebMercator(extent);              
            } else {
              cellBLPoint = mgrs.USNGtoPoint(MGRS);
              
              width =  this.grgPointBySizeCoordTool.inputCoordinate.util.convertToMeters(this.grgPointByRefSystemGridSize.getValue(),this._cellUnits) * (this.grgPointByRefCellHorizontal.getValue());          
              height = this.grgPointBySizeCoordTool.inputCoordinate.util.convertToMeters(this.grgPointByRefSystemGridSize.getValue(),this._cellUnits) * (this.grgPointByRefCellVertical.getValue());
              
              var cellTLPoint = geometryUtils.getDestinationPoint(cellBLPoint, 90, width);
              cellTLPoint = geometryUtils.getDestinationPoint(cellTLPoint, 0, height);
              
              offset = this.grgPointBySizeCoordTool.inputCoordinate.util.convertToMeters(this.grgPointByRefSystemGridSize.getValue(),this._cellUnits) / 5;
              
              //shrink the extent slightly so that we dont pick up extra cells around the edge
              var cellBLPoint = geometryUtils.getDestinationPoint(cellBLPoint, 45, offset);
              var cellTLPoint = geometryUtils.getDestinationPoint(cellTLPoint, 225, offset);
              
              extent = new Extent({
                "xmin":cellBLPoint.x,"ymin":cellBLPoint.y,"xmax":cellTLPoint.x,"ymax":cellTLPoint.y,
                "spatialReference":{"wkid":4326}
              });
              
              extent = WebMercatorUtils.geographicToWebMercator(extent);
            }
            
            var zones = mgrsUtils.zonesFromExtent(extent,this.map); 
            
            var features = [];
            
            switch(this.grgPointByRefSystemGridSize.getValue()){
              case 'UTM':              
                for (i = 0; i < zones.length; i++) {                  
                  var graphic = new Graphic(WebMercatorUtils.geographicToWebMercator(zones[i].gridPolygon.unclippedPolygon));                  
                  var label = this.grgPointByRefLabelFormat.value
                  label = label.replace(/Z/, zones[i].gridPolygon.text);
                  graphic.setAttributes({'grid': label});
                  features.push(graphic);
                  geomArray.push(graphic.geometry);
                }           
                break;
              default:
                  var polysToLoop = mgrsUtils.processZonePolygons(zones, this.map, 100000, extent);
                  var currentValue = 10000;              
                  while (currentValue >= this.grgPointByRefSystemGridSize.getValue()) {
                    var polys = [];
                    for (i = 0; i < polysToLoop.length; i++) {
                      polys = polys.concat(mgrsUtils.handleGridSquares(polysToLoop[i],this.map, currentValue, extent));
                    }
                    polysToLoop = [];
                    polysToLoop = polys;
                    currentValue = currentValue / 10;                
                  }
                  var count = 1;
                  for (i = 0; i < polysToLoop.length; i++) {
                    var graphic = new Graphic(polysToLoop[i].clippedPolyToUTMZone);                 
                    var label = this.grgPointByRefLabelFormat.value
                    label = label.replace(/Y/, polysToLoop[i].y);
                    label = label.replace(/X/, polysToLoop[i].x); 
                    label = label.replace(/S/, polysToLoop[i].GZD); 
                    label = label.replace(/Z/, polysToLoop[i].utmZone + polysToLoop[i].latitudeZone);                   
                    graphic.setAttributes({'grid': label});                  
                    features.push(graphic);
                    geomArray.push(graphic.geometry);
                    count++;
                  }
                break;          
            }
            //apply the edits to the feature layer
            this.GRGArea.applyEdits(features, null, null);
            var union = GeometryEngine.union(geomArray)
            this.map.setExtent(union.getExtent().expand(2),false);
            this.createGraphicDeleteMenu();
            //we want to keep the point but not show it on the publish page, so just hide the layer
            this._graphicsLayerGRGExtent.hide();
            this._showPanel("publishPage");
          }
        }
      },
      
      _grgAreaByRefSystemCreateGRGButtonClicked: function () {                 
        //check form inputs for validity
        if (this._graphicsLayerGRGExtent.graphics[0]) {
          var numCellsHorizontal = parseInt(this._graphicsLayerGRGExtent.graphics[0].geometry.getExtent().getWidth()) / this.grgAreaByRefSystemGridSize.getValue();
          var numCellsVertical = parseInt(this._graphicsLayerGRGExtent.graphics[0].geometry.getExtent().getHeight()) / this.grgAreaByRefSystemGridSize.getValue();
          if(drawGRG.checkGridSize(numCellsHorizontal,numCellsVertical)){
            var TRString, BRString;
            var geomArray = [];
            this._clearLayers(false);           
            // determine which UTM grid zones and bands fall within the extent
            var zones = mgrsUtils.zonesFromExtent(this._graphicsLayerGRGExtent.graphics[0].geometry.getExtent(),this.map);
            var features = [];
            
            switch(this.grgAreaByRefSystemGridSize.getValue()){
              case 'UTM':              
                for (i = 0; i < zones.length; i++) {
                  if(this.grgAreaByRefSystemClipToggle.checked) {
                    var graphic = new Graphic(zones[i].gridPolygon.clippedPolygon);
                    geomArray.push(graphic.geometry);
                  } else {
                    var graphic = new Graphic(WebMercatorUtils.geographicToWebMercator(zones[i].gridPolygon.unclippedPolygon));
                    geomArray.push(graphic.geometry);
                  }
                  var label = this.grgAreaByRefLabelFormat.value
                  label = label.replace(/Z/, zones[i].gridPolygon.text);
                  graphic.setAttributes({'grid': label});
                  features.push(graphic);
                }            
                break;
              default:                  
                var polysToLoop = mgrsUtils.processZonePolygons(zones, this.map, 100000,this._graphicsLayerGRGExtent.graphics[0].geometry.getExtent());
                var currentValue = 10000;              
                while (currentValue >= this.grgAreaByRefSystemGridSize.getValue()) {
                  var polys = [];
                  for (i = 0; i < polysToLoop.length; i++) {
                    polys = polys.concat(mgrsUtils.handleGridSquares(polysToLoop[i],this.map, currentValue, this._graphicsLayerGRGExtent.graphics[0].geometry.getExtent()));
                  }
                  polysToLoop = [];
                  polysToLoop = polys;
                  currentValue = currentValue / 10;                
                }                
                
                var count = 1;
                for (i = 0; i < polysToLoop.length; i++) {
                  if(this.grgAreaByRefSystemClipToggle.checked) {
                    var graphic = new Graphic(polysToLoop[i].clippedPolygon);
                    geomArray.push(graphic.geometry);                    
                  } else {
                    var graphic = new Graphic(polysToLoop[i].clippedPolyToUTMZone);
                    geomArray.push(graphic.geometry);
                  }
                  var label = this.grgAreaByRefLabelFormat.value
                  label = label.replace(/Y/, polysToLoop[i].y);
                  label = label.replace(/X/, polysToLoop[i].x); 
                  label = label.replace(/S/, polysToLoop[i].GZD); 
                  label = label.replace(/Z/, polysToLoop[i].utmZone + polysToLoop[i].latitudeZone);                   
                  graphic.setAttributes({'grid': label});                  
                  features.push(graphic);
                  count++;
                }                  
                break;            
            }              
            //apply the edits to the feature layer
            this.GRGArea.applyEdits(features, null, null);
            var union = GeometryEngine.union(geomArray)
            this.map.setExtent(union.getExtent().expand(2),false);
            this.createGraphicDeleteMenu();
            //we want to keep the extent but not show it on the publish page, so just hide the layer
            this._graphicsLayerGRGExtent.hide();
            this._showPanel("publishPage");
          }
        }
      },
      
      createGraphicDeleteMenu: function () {
          // Creates right-click context menu for GRAPHICS
          ctxMenuForGraphics = new Menu({}); 
                  
          ctxMenuForGraphics.addChild(new MenuItem({ 
            label: "Delete",
            onClick: lang.hitch(this, function() {
              this.GRGArea.remove(selected);
              //refresh each of the feature/graphic layers to enusre labels are removed
              this.GRGArea.refresh();             
            })
          }));

          ctxMenuForGraphics.startup();

          this.GRGArea.on("mouse-over", function(evt) {
            selected = evt.graphic;           
            ctxMenuForGraphics.bindDomNode(evt.graphic.getDojoShape().getNode());
          });

          this.GRGArea.on("mouse-out", function(evt) {
            ctxMenuForGraphics.unBindDomNode(evt.graphic.getDojoShape().getNode());
          });
        },
      
      //source:
      //https://stackoverflow.com/questions/9979415/dynamically-load-and-unload-stylesheets
      _removeStyleFile: function (filename, filetype) {
        //determine element type to create nodelist from
        var targetelement = null;
        if (filetype === "js") {
          targetelement = "script";
        } else if (filetype === "css") {
          targetelement = "link";
        } else {
          targetelement = "none";
        }
        //determine corresponding attribute to test for
        var targetattr = null;
        if (filetype === "js") {
          targetattr = "src";
        } else if (filetype === "css") {
          targetattr = "href";
        } else {
          targetattr = "none";
        }
        var allsuspects = document.getElementsByTagName(targetelement);
        //search backwards within nodelist for matching elements to remove
        for (var i = allsuspects.length; i >= 0; i--) {
          if (allsuspects[i] &&
            allsuspects[i].getAttribute(targetattr) !== null &&
            allsuspects[i].getAttribute(targetattr).indexOf(filename) !== -1) {
            //remove element by calling parentNode.removeChild()
            allsuspects[i].parentNode.removeChild(allsuspects[i]);
          }
        }
      },

      _setTheme: function () {
        //Check if DartTheme
        if (this.appConfig.theme.name === "DartTheme") {
          //Load appropriate CSS for dart theme
          utils.loadStyleLink('darkOverrideCSS', this.folderUrl + "css/dartTheme.css", null);
        } else {
          this._removeStyleFile('dartTheme.css', 'css');
        }
        //Check if DashBoardTheme
        if (this.appConfig.theme.name === "DashboardTheme" && this.appConfig.theme.styles[0] === "default"){
          //Load appropriate CSS for dashboard theme
          utils.loadStyleLink('darkDashboardOverrideCSS', this.folderUrl + "css/dashboardTheme.css", null);
        } else {
          this._removeStyleFile('dashboardTheme.css', 'css');
        }
      },
      
      destroy: function() {        
        this.inherited(arguments);        
        this.map.removeLayer(this._graphicsLayerGRGExtent);
        this.map.removeLayer(this.GRGArea);
        console.log('grg widget distroyed')
      },
      
      _initSaveToPortal: function(layerName) {        
        esriId.registerOAuthInfos();        
        var featureServiceName = layerName;
        esriId.getCredential(this.appConfig.portalUrl + "/sharing", { oAuthPopupConfirmation: false }).then(lang.hitch(this, function() {
          //sign in
          new esriPortal.Portal(this.appConfig.portalUrl).signIn().then(lang.hitch(this, function(portalUser) {
           //Get the token
            var token = portalUser.credential.token;
            var orgId = portalUser.orgId;
            var userName = portalUser.username;
            
            var checkServiceNameUrl = this.appConfig.portalUrl + "sharing/rest/portals/" + orgId + "/isServiceNameAvailable";
            var createServiceUrl = this.appConfig.portalUrl + "sharing/content/users/" + userName + "/createService"; 

            drawGRG.isNameAvailable(checkServiceNameUrl, token, featureServiceName).then(lang.hitch(this, function(response0) {
              if (response0.available) {
                //set the widget to busy
                this.busyIndicator.show();
                //create the service
                drawGRG.createFeatureService(createServiceUrl, token, drawGRG.getFeatureServiceParams(featureServiceName, this.map)).then(lang.hitch(this, function(response1) {
                  if (response1.success) {
                    var addToDefinitionUrl = response1.serviceurl.replace(new RegExp('rest', 'g'), "rest/admin") + "/addToDefinition";
                    drawGRG.addDefinitionToService(addToDefinitionUrl, token, drawGRG.getLayerParams(featureServiceName, this.map, this._cellTextSymbol, this._GRGAreaFillSymbol)).then(lang.hitch(this, function(response2) {
                      if (response2.success) {
                        //Push features to new layer
                        var newFeatureLayer = new FeatureLayer(response1.serviceurl + "/0?token=" + token, {
                          id: featureServiceName,
                          outFields: ["*"],
                              
                         });                        
                        this.map.addLayers([newFeatureLayer]);                        
                        
                        //must ensure the layer is loaded before we can access it to turn on the labels if required
                        if(newFeatureLayer.loaded){
                          // show or hide labels
                          featureLayerInfo = jimuLayerInfos.getInstanceSync().getLayerInfoById(featureServiceName);
                          featureLayerInfo.enablePopup();
                          if(this._showLabels) {
                            featureLayerInfo.showLabels();
                          }
                        } else {
                          newFeatureLayer.on("load", lang.hitch(this, function () {
                            // show or hide labels
                            featureLayerInfo = jimuLayerInfos.getInstanceSync().getLayerInfoById(featureServiceName);
                            featureLayerInfo.enablePopup();
                            if(this._showLabels) {
                              featureLayerInfo.showLabels();
                            }
                          }));
                        }
                        
                        var newGraphics = [];
                        array.forEach(this.GRGArea.graphics, function (g) {
                          newGraphics.push(new Graphic(g.geometry, null, {grid: g.attributes["grid"]}));
                        }, this);
                        newFeatureLayer.applyEdits(newGraphics, null, null).then(lang.hitch(this, function(){
                          this._reset();                                
                        })).otherwise(lang.hitch(this,function(){
                          this._reset();
                        })); 
                        this.busyIndicator.hide();
                        var newURL = '<br /><a href="' +this.appConfig.portalUrl + "home/item.html?id=" + response1.itemId + '" target="_blank">';
                        this.publishMessage.innerHTML = this.nls.successfullyPublished.format(newURL) + '</a>';
                        
                      }                      
                    }), function(err2) {
                      this.busyIndicator.hide();
                      this.publishMessage.innerHTML = this.nls.addToDefinition.format(err2.message);                                                    
                    });                    
                  } else {
                    this.busyIndicator.hide();
                    this.publishMessage.innerHTML = this.nls.unableToCreate.format(featureServiceName);                    
                  }
                }), function(err1) {
                  this.busyIndicator.hide();
                  this.publishMessage.innerHTML = this.nls.createService.format(err1.message);                  
                });
              } else {
                  this.busyIndicator.hide();
                  this.publishMessage.innerHTML = this.nls.publishingFailedLayerExists.format(featureServiceName); 
                  
              }
            }), function(err0) {
              this.busyIndicator.hide();
              this.publishMessage.innerHTML = this.nls.checkService.format(err0.message);
            });
          }))
        }));        
      }     
    });
  });