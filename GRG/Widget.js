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
    mgrsUtils
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
      _gridOrigin: "center",
      _showLabels: {'value': true},
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
        this.inherited(arguments);
        
        this.extentAreaFillSymbol = {
          type: 'esriSFS',
          style: 'esriSFSSolid',
          color: [155,155,155,155],
          outline: {
            color: [0, 0, 255, 255],
            width: 1.25,
            type: 'esriSLS',
            style: 'esriSLSSolid'
          }};
        this.GRGAreaFillSymbol = this.config.grg.gridSymbol || {
            type: 'esriSFS',
            style: 'esriSFSNull',
            color: [0,0,255,0],
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
        this.cellTextSymbol = this.config.grg.textSymbol || {
            "color": {
              "r": 102,
              "g": 102,
              "b": 51,
              "a": 1
            },
            "type": "textsymbol",
            "horizontalAlignment": "center",
            "rotated": false,
            "kerning": true,
            "font": {
              "size": 11,
              "style": "normal",
              "variant": "normal",
              "weight": "normal",
              "family": "Helvetica"
            },
            "x": 0,
            "y": 0,
            "xoffset": 0,
            "yoffset": 0,
            "align": "middle"
          };
        
        // create graphics layer for grid extent and add to map
        this._graphicsLayerGRGExtent = new GraphicsLayer();
        this._extentSym = new SimpleFillSymbol(this.extentAreaFillSymbol);
        
        // create a renderer for the grg layer to override default symbology
        var gridSymbol = new SimpleFillSymbol(this.GRGAreaFillSymbol); 
        var gridRenderer = new SimpleRenderer(gridSymbol);
        
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
                    "symbol": this.cellTextSymbol
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
            id: "Area GRG",
            outFields: ["*"],
            showLabels: true
          });
          
        this.GRGArea.setRenderer(gridRenderer);
                  
        var json = {
          "labelExpressionInfo": {"value" : "{grid}"}
        };

        // create a text symbol to define the style of labels
        var labelClass = new LabelClass(json);
        this.textSymParams = this.cellTextSymbol || {
          font: new Font("11", Font.STYLE_NORMAL, Font.VARIANT_NORMAL, Font.WEIGHT_BOLD, "Helvetica"),
          color: new Color("#000")
        }
        labelClass.symbol = new TextSymbol(this.textSymParams);
        this.GRGArea.setLabelingInfo([labelClass]);
        
        this.map.addLayers([this.GRGArea,this._graphicsLayerGRGExtent]);
        
        featureLayerInfo = jimuLayerInfos.getInstanceSync().getLayerInfoById("Area GRG");

        // show labels
        if(this._showLabels.value) {
          featureLayerInfo.showLabels();
          featureLayerInfo.enablePopup();
        }
        
        //set up coordinate input dijit
        this.coordTool = new coordInput({nls: this.nls, appConfig: this.appConfig}, this.newGRGPointBySizeOriginCoords);      
        this.coordTool.inputCoordinate.formatType = 'DD';
        this.coordinateFormat = new dijitTooltipDialog({
          content: new editOutputCoordinate({nls: this.nls}),
          style: 'width: 400px'
        });

        if(this.appConfig.theme.name === 'DartTheme')
        {
          domClass.add(this.coordinateFormat.domNode, 'dartThemeClaroDijitTooltipContainerOverride');
        }        
        
        
        // add toolbar for drawing GRG Area by Extent
        this.dt_AreaBySize  = new Draw(this.map);
        
        // add extended toolbar for drawing GRG Point
        this.dtPoint = new drawFeedBackPoint(this.map,this.coordTool.inputCoordinate.util);
        
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
            this.own(on(this.grgAreaBySizeSettingsButton, "click", lang.hitch(this, function () {
              this._gridSettingsInstance.gridOrigin.disabled = true;
              this._gridSettingsInstance._loadOptionsForDropDown(this._gridSettingsInstance.gridOrigin, this._gridSettingsInstance.gridSettingsOptions.gridOrigin);
              this._showPanel("settingsPage");
            })));
            
            //Handle click event of Add GRG Area by Polygon button
            this.own(on(this.grgAreaBySizeDrawPolygonIcon, 'click', lang.hitch(this, 
              this._grgAreaBySizeDrawPolygonIconClicked)));
              
            //Handle click event of Add GRG Area by Extent button
            this.own(on(this.grgAreaBySizeDrawExtentIcon, 'click', lang.hitch(this, 
              this._grgAreaBySizeDrawExtentIconClicked)));
              
            //Handle completion of GRG rectangle area drawing        
            this.own(on(this.dt_AreaBySize, 'draw-complete', lang.hitch(this, 
              this._dt_AreaBySizeComplete)));
              
            //Handle click event of delete drawn extent icon        
            this.own(on(this.grgAreaBySizeDeleteIcon, 'click', lang.hitch(this, 
              this._grgAreaBySizeDeleteClicked)));
              
            //Handle click event of publish GRG to portal button
            this.own(on(this.grgAreaBySizePublishGRGButton, 'click', lang.hitch(this, function () {
              if(this.addGRGNameArea.isValid()) {
                this._initSaveToPortal(this.addGRGNameArea.value)
              } else {
                // Invalid entry
                var alertMessage = new Message({
                  message: this.nls.missingLayerNameMessage
                });
              }
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
          this.own(on(this.grgAreaByRefSystemSettingsButton, "click", lang.hitch(this, function () {
            this._showPanel("settingsPage");
          })));
          
          //Handle click event of draw extent icon
          this.own(on(this.grgAreaByRefSystemDrawIcon, 'click', lang.hitch(this, 
            this._grgAreaByRefSystemDrawIconClicked)));
            
          //Handle click event of delete drawn extent icon       
          this.own(on(this.grgAreaByRefSystemDeleteIcon, 'click', lang.hitch(this, 
            this._grgAreaByRefSystemDeleteIconClicked)));
          
          //Handle click event of create GRG button        
          this.own(on(this.grgAreaByRefSystemCreateGRGButton, 'click', lang.hitch(this, 
            this._grgAreaByRefSystemCreateGRGButtonClicked)));          
          
          //Handle completion of extent drawing
          this.own(on(this.dt_AreaByRefSystem, 'draw-complete', lang.hitch(this,
            this._dt_AreaByRefSystemComplete)));
        
        /**
        * GRG from Area by Non Standard Grid panel
          NOT IMPLEMENTED YET
          
            //Handle click event of back button
            this.own(on(this.grgAreaByNonStandardPanelBackButton, 'click', lang.hitch(this, function () {
              this._resetOnBackToMainPage();
            })));

            //handle Grid Settings button
            this.own(on(this.grgAreaByNonStandardSettingsButton, "click", lang.hitch(this, function () {
              this._showPanel("settingsPage");
            })));
        **/
        
        /**
        * GRG from Point by Size panel
        **/
        
            //Handle click event of back button
            this.own(on(this.grgPointBySizePanelBackButton, 'click', lang.hitch(this, function () {
              this._resetOnBackToMainPage();
            })));

            //handle Grid Settings button
            this.own(on(this.grgPointBySizeSettingsButton, "click", lang.hitch(this, function () {
              this._showPanel("settingsPage");
            })));
        
        /**
        * GRG from Point by Reference System panel
        **/
        
            //Handle click event of back button
            this.own(on(this.grgPointByRefSystemPanelBackButton, 'click', lang.hitch(this, function () {
              this._resetOnBackToMainPage();
            })));

            //handle Grid Settings button
            this.own(on(this.grgPointByRefSystemSettingsButton, "click", lang.hitch(this, function () {
              this._showPanel("settingsPage");
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
              this._gridSettingsInstance.onClose();          
              this._showPanel(this._lastOpenPanel);
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
        
        
        
        
        
        
        
        
        
        
        
        //Handle click event of Add GRG Point draw button
        this.own(on(this.addPointBtn, 'click', lang.hitch(this, 
          this._addGRGPointButtonClicked)));
        
          
        //Handle completion of GRG point drawing
        this.own(on(this.dtPoint, 'draw-complete', lang.hitch(this,
          this._drawGRGPointComplete)));

                  
        
        
          
        
          
        
        
        //Handle click event of create GRG Area button        
        this.own(on(this.createGRGButton, 'click', lang.hitch(this, 
          this._createAreaGRG)));
        
        //Handle click event of create GRG point button        
        this.own(on(this.createPointGRGButton, 'click', lang.hitch(this, 
          this._createPointGRG)));
        
          
        //Handle change in coord input      
        this.own(this.coordTool.inputCoordinate.watch('outputString', lang.hitch(this,
          function (r, ov, nv) {
            if(!this.coordTool.manualInput){
              this.coordTool.set('value', nv);
            }
          }
        )));

        //Handle change in start point and update coord input
        this.own(this.dtPoint.watch('startPoint', lang.hitch(this, 
          function (r, ov, nv) {
            this.coordTool.inputCoordinate.set('coordinateEsriGeometry', nv);
            this.dtPoint.addStartGraphic(nv, this._ptSym);
          }
        )));
        
        //Handle key up events in coord input
        this.own(on(this.coordTool, 'keyup', lang.hitch(this, 
          this._coordToolKeyWasPressed)));
        
        //Handle click event on coord format button
        this.own(on(this.coordinateFormatButton, 'click', lang.hitch(this, 
          this._coordinateFormatButtonClicked)));
        
        //Handle click event on apply button of the coord format popup        
        this.own(on(this.coordinateFormat.content.applyButton, 'click', lang.hitch(this,
          this._coordinateFormatPopupApplyButtonClicked)));
        
        //Handle click event on cacncel button of the coord format popup         
        this.own(on(this.coordinateFormat.content.cancelButton, 'click', lang.hitch(this, 
          function () {
            dijitPopup.close(this.coordinateFormat);
          }
        )));
        
        
        
        
        
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
          this._clearGRGLayer();          
          this.dt_AreaBySize.deactivate();
          this.dtPoint.deactivate();
          this.map.enableMapNavigation();
          this._grgAreaBySizeDeleteClicked();
          this._grgAreaByRefSystemDeleteIconClicked();
          dojo.removeClass(this.grgAreaBySizeDrawPolygonIcon, 'jimu-edit-active');
          dojo.removeClass(this.grgAreaBySizeDrawExtentIcon, 'jimu-extent-active');
          dojo.removeClass(this.addPointBtn, 'jimu-edit-active');
          html.addClass(this.fromAreaContainer, 'controlGroupHidden');
          html.addClass(this.newGRGAreaButton, 'GRGDrafterLabelSettingsDownButton');
          html.removeClass(this.newGRGAreaButton, 'GRGDrafterLabelSettingsUpButton');
          html.addClass(this.fromPointContainer, 'controlGroupHidden');
          html.addClass(this.newGRGPointButton, 'GRGDrafterLabelSettingsDownButton');
          html.removeClass(this.newGRGPointButton, 'GRGDrafterLabelSettingsUpButton');
        },

      _clearGRGLayer: function () {
          this.GRGArea.clear();
          this.GRGArea.refresh();          
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
            this._gridOrigin = updatedSettings.gridOrigin;
            this._showLabels.value = updatedSettings.showLabels;
            // show or hide labels
            if(this._showLabels.value) {
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
        this._clearGRGLayer(); 
        // deactive the other tool if active
        var node = dijitRegistry.byId(this.grgAreaBySizeDrawExtentIcon);
        if(dojo.hasClass(node,'jimu-extent-active')) {
          //this tool is already selected so deactivate
          this.dt_AreaBySize.deactivate();
          domClass.toggle(this.grgAreaBySizeDrawExtentIcon, 'jimu-extent-active');
          //clear any partial drawings
          this._graphicsLayerGRGExtent.clear();
        }        
        var node = dijitRegistry.byId(this.grgAreaBySizeDrawPolygonIcon);
        if(dojo.hasClass(node,'jimu-edit-active')) {
          //already selected so deactivate draw tool
          this.dt_AreaBySize.deactivate();
          this.map.enableMapNavigation();
        } else {
          this._graphicsLayerGRGExtent.clear();          
          this.map.disableMapNavigation();          
          this.dt_AreaBySize.activate('polygon');
          //depending on what draw option is used we want different edit functionality
          this.own(on(this._graphicsLayerGRGExtent, "click", lang.hitch(this, function(evt) {
            this.editToolbar.activate(Edit.MOVE|Edit.EDIT_VERTICES, evt.graphic); 
          })));          
        }
        domClass.toggle(this.grgAreaBySizeDrawPolygonIcon, 'jimu-edit-active');
      },
      
      _grgAreaBySizeDrawExtentIconClicked: function () {
        this._clearGRGLayer(); 
        // deactive the other tool if active
        var node = dijitRegistry.byId(this.grgAreaBySizeDrawPolygonIcon);
        if(dojo.hasClass(node,'jimu-edit-active')) {
          //this tool is already selected so deactivate
          this.dt_AreaBySize.deactivate();
          domClass.toggle(this.grgAreaBySizeDrawPolygonIcon, 'jimu-edit-active');
          //clear any partial drawings
          this._graphicsLayerGRGExtent.clear();
        }        
        var node = dijitRegistry.byId(this.grgAreaBySizeDrawExtentIcon);
        if(dojo.hasClass(node,'jimu-extent-active')) {
          //already selected so deactivate draw tool
          this.dt_AreaBySize.deactivate();
          this.map.enableMapNavigation();
        } else {
          this._graphicsLayerGRGExtent.clear();          
          this.map.disableMapNavigation();          
          this.dt_AreaBySize.activate('extent');
          //depending on what draw option is used we want different edit functionality
          this.own(on(this._graphicsLayerGRGExtent, "click", lang.hitch(this, function(evt) {
            this.editToolbar.activate(Edit.MOVE|Edit.ROTATE|Edit.SCALE, evt.graphic); 
          })));
        }
        domClass.toggle(this.grgAreaBySizeDrawExtentIcon, 'jimu-extent-active');
      },
      
      _addGRGPointButtonClicked: function () {
        this.dtPoint.removeStartGraphic();
        this._clearGRGLayer(); 
        this.coordTool.manualInput = false;
        
        this.dtPoint._setTooltipMessage(0);
        
        this.map.disableMapNavigation();          
        this.dtPoint.activate('point');
        var tooltip = this.dtPoint._tooltip;
        if (tooltip) {
          tooltip.innerHTML = 'Click to add GRG center point';
        }
        domClass.toggle(this.addPointBtn, 'jimu-edit-active');
      },
      
      _grgAreaByRefSystemDrawIconClicked: function () {
        var node = dijitRegistry.byId(this.grgAreaByRefSystemDrawIcon);
        if(dojo.hasClass(node,'jimu-edit-active')) {
          //already selected so deactivate draw tool
          this.dt_AreaByRefSystem.deactivate();
          this.map.enableMapNavigation();
        } else {
          html.addClass(this.grgAreaByRefSystemSaveGRGButton, 'controlGroupHidden');
          this._graphicsLayerGRGExtent.clear();          
          this.coordTool.manualInput = false;        
          this.map.disableMapNavigation();          
          this.dt_AreaByRefSystem.activate('extent');        
        }
        domClass.toggle(this.grgAreaByRefSystemDrawIcon, 'jimu-edit-active');
        
      },
      
      _dt_AreaBySizeComplete: function (evt) {          
        
        this.map.enableMapNavigation();
        this.dt_AreaBySize.deactivate();
        
        if(evt.geometry.type == 'extent'){
          evt.geometry = gridGeomUtils.extentToPolygon(evt.geometry);
          var graphic = new Graphic(evt.geometry, this._extentSym);
          this.grgAreaBySizeRotation.set('disabled', false);
        } else {
          var graphic = new Graphic(evt.geometry, this._extentSym);
          evt.geometry = gridGeomUtils.extentToPolygon(evt.geometry.getExtent());
        }
        
        this._graphicsLayerGRGExtent.add(graphic);
        this.centerPoint = evt.geometry.getCentroid();
        
        
        
        this._calculateCellWidthAndHeight(evt.geometry);
        
        domClass.toggle(this.addGRGArea, "controlGroupHidden");
        domClass.toggle(this.grgAreaBySizeDeleteContainer, "controlGroupHidden");
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
        var cellWidthMeters = this.coordTool.inputCoordinate.util.convertToMeters(calculatedCellWidth, this._cellUnits);
        var cellHeightMeters = this.coordTool.inputCoordinate.util.convertToMeters(calculatedCellHeight, this._cellUnits);

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
      
      _drawGRGPointComplete: function () {          
        domClass.remove(this.addPointBtn, 'jimu-edit-active');
        this.dtPoint.deactivate();
        this.map.enableMapNavigation();
      },
      
      _dt_AreaByRefSystemComplete: function (evt) {       
        domClass.remove(this.grgAreaByRefSystemDrawIcon, 'jimu-edit-active');
        var graphic = new Graphic(evt.geometry, this._extentSym);
        this._graphicsLayerGRGExtent.add(graphic);
        this.dt_AreaByRefSystem.deactivate();
        this.map.enableMapNavigation();
        domClass.toggle(this.grgAreaByRefSystemDrawContainer, "controlGroupHidden");
        domClass.toggle(this.grgAreaByRefSystemDeleteContainer, "controlGroupHidden");
      },
      
      /*
       * catch key press in start point
       */
      _coordToolKeyWasPressed: function (evt) {
        this.coordTool.manualInput = true;
        if (evt.keyCode === keys.ENTER) {
          this.coordTool.inputCoordinate.getInputType().then(lang.hitch(this, 
            function (r) {
              if(r.inputType == "UNKNOWN"){
                var alertMessage = new Message({
                  message: this.nls.parseCoordinatesError
                });
              } else {
                this._reset();
                topic.publish(
                  'grg-center-point-input',
                  this.coordTool.inputCoordinate.coordinateEsriGeometry
                );
                this._setCoordLabel(r.inputType);
                var fs = this.coordinateFormat.content.formats[r.inputType];
                this.coordTool.inputCoordinate.set('formatString', fs.defaultFormat);
                this.coordTool.inputCoordinate.set('formatType', r.inputType);
                this.dtPoint.addStartGraphic(r.coordinateEsriGeometry, this._ptSym);
              }
            }
          ));
        }
      },
      
      /*
       *
       */
      _setCoordLabel: function (toType) {
        this.coordInputLabel.innerHTML = dojoString.substitute(
          'GRG Center Point (${crdType})', {
              crdType: toType
          });
      },
      
      /*
       *
       */
      _coordinateFormatButtonClicked: function () {
        this.coordinateFormat.content.set('ct', this.coordTool.inputCoordinate.formatType);
        dijitPopup.open({
            popup: this.coordinateFormat,
            around: this.coordinateFormatButton
        });
      },
      
      /*
       *
       */
      _coordinateFormatPopupApplyButtonClicked: function () {
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
        this._setCoordLabel(fv);
        dijitPopup.close(this.coordinateFormat);        
      }, 
      
      
      _grgAreaBySizeDeleteClicked: function () {
        this._graphicsLayerGRGExtent.clear();
        
        //reset the angle
        this.angle = 0;
        this.grgAreaBySizeRotation.setValue(this.angle);
        this.grgAreaBySizeRotation.set('disabled', true);
        
        html.removeClass(this.grgAreaBySizeDrawPolygonIcon, 'jimu-edit-active');
        html.removeClass(this.grgAreaBySizeDrawExtentIcon, 'jimu-extent-active');   
        html.removeClass(this.addGRGArea, 'controlGroupHidden');
        html.addClass(this.addGRGArea, 'controlGroup');
        html.removeClass(this.grgAreaBySizeDeleteContainer, 'controlGroup');
        html.addClass(this.grgAreaBySizeDeleteContainer, 'controlGroupHidden');          
      },
      
      _grgAreaByRefSystemDeleteIconClicked: function () {
        this._graphicsLayerGRGExtent.clear();
        html.removeClass(this.grgAreaByRefSystemDrawIcon, 'jimu-edit-active');          
        html.removeClass(this.grgAreaByRefSystemDrawContainer, 'controlGroupHidden');
        html.addClass(this.grgAreaByRefSystemDrawContainer, 'controlGroup');
        html.removeClass(this.grgAreaByRefSystemDeleteContainer, 'controlGroup');
        html.addClass(this.grgAreaByRefSystemDeleteContainer, 'controlGroupHidden');          
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
      
      _createAreaGRG: function () {                 
        //check form inputs for validity
        if (this._graphicsLayerGRGExtent.graphics[0] && this.grgAreaBySizeCellWidth.isValid() && this.grgAreaBySizeCellHeight.isValid() && this.grgAreaBySizeRotation.isValid()) {
          
          this.editToolbar.deactivate();
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
          
          var cellWidth = this.coordTool.inputCoordinate.util.convertToMeters(this.grgAreaBySizeCellWidth.value, this._cellUnits);
          var cellHeight = this.coordTool.inputCoordinate.util.convertToMeters(this.grgAreaBySizeCellHeight.value,this._cellUnits);
          
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
              this._cellShape,
              'center',
              this.geodesicGrid,
              this.map,              
              esriConfig.defaults.geometryService); 
            //apply the edits to the feature layer
            this.GRGArea.applyEdits(features, null, null);
            this._grgAreaBySizeDeleteClicked();              
            this._showPanel("publishPage");
          }
        }
      },
      
      _grgAreaByRefSystemCreateGRGButtonClicked: function () {                 
        //check form inputs for validity
        if (this._graphicsLayerGRGExtent.graphics[0]) {
          var TRString, BRString;          
          this._clearGRGLayer();           
          // determine which UTM grid zones and bands fall within the extent
          zones = mgrsUtils.zonesFromExtent(this._graphicsLayerGRGExtent.graphics[0],this.map);
          var features = [];
          
          switch(this.grgAreaByRefSystemGridSize.getValue()){
            case 'UTM':              
              for (i = 0; i < zones.length; i++) {
                if(this.grgAreaByRefSystemClipToggle.checked) {
                  var graphic = new Graphic(zones[i].gridPolygon.clippedPolygon);
                } else {
                  var graphic = new Graphic(WebMercatorUtils.geographicToWebMercator(zones[i].gridPolygon.unclippedPolygon));
                }
                graphic.setAttributes({'grid': zones[i].gridPolygon.text});
                features.push(graphic);
              }            
              break;
            default:
              var numCellsHorizontal = parseInt(this._graphicsLayerGRGExtent.graphics[0].geometry.getWidth()) / this.grgAreaByRefSystemGridSize.getValue();
              var numCellsVertical = parseInt(this._graphicsLayerGRGExtent.graphics[0].geometry.getHeight()) / this.grgAreaByRefSystemGridSize.getValue();
              if(drawGRG.checkGridSize(numCellsHorizontal,numCellsVertical)){
                var polysToLoop = mgrsUtils.processZonePolygons(zones, this.map, 100000,this._graphicsLayerGRGExtent.graphics[0]);
                var currentValue = 10000;              
                while (currentValue >= this.grgAreaByRefSystemGridSize.getValue()) {
                  var polys = [];
                  for (i = 0; i < polysToLoop.length; i++) {
                    polys = polys.concat(mgrsUtils.handleGridSquares(polysToLoop[i],this.map, currentValue, this._graphicsLayerGRGExtent.graphics[0]));
                  }
                  polysToLoop = [];
                  polysToLoop = polys;
                  currentValue = currentValue / 10;                
                }
                
                
                
                /**
                var sortedArray = [];
                var compareFeature = polysToLoop[0];
                var nextCompareFeature = [];
                sortedArray.push(polysToLoop[0])
                polysToLoop.splice(0, 1);
                
                
                while (polysToLoop.length > 0){
                  var rowComplete = true;                  
                  for(i = 0; i < polysToLoop.length; i++) {                    
                    if (GeometryEngine.touches(compareFeature.clippedPolyToUTMZone, polysToLoop[i].clippedPolyToUTMZone)){
                        var angle = geometryUtils.getAngleBetweenPoints(WebMercatorUtils.webMercatorToGeographic(compareFeature.clippedPolyToUTMZone.getCentroid()), 
                          WebMercatorUtils.webMercatorToGeographic(polysToLoop[i].clippedPolyToUTMZone.getCentroid()));
                        if (angle > 75 && angle < 105) {
                          sortedArray.push(polysToLoop[i]);
                          polysToLoop.splice(i, 1);
                          rowComplete = false;
                        } else if ((angle >= 335 || angle <= 25) && nextCompareFeature.length < 1) {
                          nextCompareFeature.push(polysToLoop[i]);
                        }
                    }                    
                  }
                  if(rowComplete) {
                    compareFeature = nextCompareFeature[0];
                    nextCompareFeature = [];
                  } else {
                    compareFeature = sortedArray[sortedArray.length -1]; //grab the last feature
                  }
                }                
                **/
                
                var count = 1;
                for (i = 0; i < polysToLoop.length; i++) {
                  if(this.grgAreaByRefSystemClipToggle.checked) {
                    var graphic = new Graphic(polysToLoop[i].clippedPolygon);
                    /**var symbol = new SimpleMarkerSymbol({
                        "color": [255,255,255,64],
                        "size": 12,
                        "type": "esriSMS",
                        "style": "esriSMSCircle",
                        "outline": {
                          "color": [0,0,0,255],
                          "width": 1,
                          "type": "esriSLS",
                          "style": "esriSLSSolid"
                        }
                      });
                      var symbol2 = new SimpleMarkerSymbol({
                        "color": [255,0,0,64],
                        "size": 12,
                        "type": "esriSMS",
                        "style": "esriSMSCircle",
                        "outline": {
                          "color": [255,0,0,255],
                          "width": 1,
                          "type": "esriSLS",
                          "style": "esriSLSSolid"
                        }
                      });
                    var pointGraphic = new Graphic(polysToLoop[i].clippedPolygon.getPoint(0, 0),symbol);
                    var pointGraphic2 = new Graphic(polysToLoop[i].clippedPolygon.getPoint(0, polysToLoop[i].clippedPolygon.rings[0].length - 2),symbol2);
                    this.map.graphics.add(pointGraphic);
                    this.map.graphics.add(pointGraphic2);**/
                  } else {
                    var graphic = new Graphic(polysToLoop[i].clippedPolyToUTMZone);
                    /**var symbol = new SimpleMarkerSymbol({
                        "color": [255,255,255,64],
                        "size": 12,
                        "type": "esriSMS",
                        "style": "esriSMSCircle",
                        "outline": {
                          "color": [0,0,0,255],
                          "width": 1,
                          "type": "esriSLS",
                          "style": "esriSLSSolid"
                        }
                      });
                    var pointGraphic = new Graphic(polysToLoop[i].clippedPolyToUTMZone.getPoint(0, 0),symbol);
                    this.map.graphics.add(pointGraphic);**/
                  }                
                  //graphic.setAttributes({'grid': polysToLoop[i].text});
                  graphic.setAttributes({'grid': count});
                  features.push(graphic);
                  count++;
                }
                
                
              }
              break;            
          }
          
          //apply the edits to the feature layer
          this.GRGArea.applyEdits(features, null, null);
          this.createGraphicDeleteMenu();
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
            
      /*
       *
       */
      _createPointGRG: function () {
        //check form inouts for validity
        if (this.dtPoint.startGraphic && this.pointCellWidth.isValid() && this.pointCellHeight.isValid() && this.gridAnglePoint.isValid()) {
          
          //get center point of AOI
          var centerPoint = WebMercatorUtils.geographicToWebMercator(this.coordTool.inputCoordinate.coordinateEsriGeometry);
          
          var cellWidth = this.coordTool.inputCoordinate.util.convertToMeters(this.pointCellWidth.value,this._cellUnits);
          var cellHeight = this.coordTool.inputCoordinate.util.convertToMeters(this.pointCellHeight.value,this._cellUnits);          

          // if the width or height of a grid cell is over 20000m we need to use a planar grid
          if((cellWidth < 20000) && ((cellHeight < 20000 && this._cellShape != "hexagon") || this._cellShape == "hexagon")) {
            this.geodesicGrid = true;
          } else {
            this.geodesicGrid = false;
          }
          
          if(drawGRG.checkGridSize(this.pointCellHorizontal.value,this.pointCellVertical.value))
          {
            var features = drawGRG.createGRG(
              this.pointCellHorizontal.value,
              this.pointCellVertical.value,
              centerPoint,
              cellWidth,
              cellHeight,
              this.gridAnglePoint.value,
              this._labelStartPosition,
              this._labelType,
              this._cellShape,
              this._gridOrigin,
              this.geodesicGrid,
              this.map,
              esriConfig.defaults.geometryService); 
            //apply the edits to the feature layer
            this.GRGArea.applyEdits(features, null, null);
            this.dtPoint.removeStartGraphic();
            this._showPanel("publishPage");            
          }
          
        } else {
          // Invalid entry
          var alertMessage = new Message({
            message: this.nls.missingParametersMessage
          });          
        }
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
        if (this.appConfig.theme.name === "DashboardTheme"){
          //Load appropriate CSS for dashboard theme
          utils.loadStyleLink('darkOverrideCSS', this.folderUrl + "css/dashboardTheme.css", null);
        } else {
          this._removeStyleFile('darhboardTheme.css', 'css');
        }
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
                      drawGRG.addDefinitionToService(addToDefinitionUrl, token, drawGRG.getLayerParams(featureServiceName, this.map, this.cellTextSymbol, this.GRGAreaFillSymbol)).then(lang.hitch(this, function(response2) {
                        if (response2.success) {
                          //Push features to new layer
                          var newFeatureLayer = new FeatureLayer(response1.serviceurl + "/0?token=" + token, {
                            mode: FeatureLayer.MODE_SNAPSHOT,
                            outFields: ["*"]                                  
                           });
                          this.map.addLayer(newFeatureLayer);

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
                        }
                      }), function(err2) {
                        this.busyIndicator.hide();
                        new Message({
                          message: "Add to definition: " + err2.message
                        });                              
                      });
                    } else {
                      this.busyIndicator.hide();
                      new Message({
                        message: "Unable to create " + featureServiceName
                      });
                    }
                  }), function(err1) {
                    this.busyIndicator.hide();
                    new Message({
                      message: "Create Service: " + err1.message
                    });
                  });
                } else {
                    this.busyIndicator.hide();
                    new Message({                 
                      message: "You already have a feature service named " + featureServiceName + ". Please choose another name."
                  });                    
                }
              }), function(err0) {
                this.busyIndicator.hide();
                new Message({
                  message: "Check Service: " + err0.message
                });
              });
            }))
          }));          
      }     
    });
  });