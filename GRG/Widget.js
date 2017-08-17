///////////////////////////////////////////////////////////////////////////
// Copyright (c) 2015 Esri. All Rights Reserved.
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
  'dojo/_base/declare',
  'dojo/topic',
  'dojo/aspect',
  'dojo/_base/lang',
  'dijit/registry',
  'esri/IdentityManager',
  'esri/arcgis/OAuthInfo',
  'esri/config',
  'esri/dijit/util/busyIndicator',
  'esri/domUtils',  
  'dijit/_WidgetsInTemplateMixin',
  'jimu/BaseWidget',
  'jimu/dijit/TabContainer',
  './js/TabCreateAreaGRG',
  './js/TabCreatePointGRG'
], function (
  dojoDeclare,
  dojoTopic,
  aspect,
  dojoLang,
  registry,
  esriId,
  OAuthInfo,
  esriConfig,
  busyIndicator,
  domUtils,
  dijitWidgetsInTemplate,
  jimuBaseWidget,
  TabContainer,
  TabCreateAreaGRG,
  TabCreatePointGRG
) {
  'use strict';
  var clz = dojoDeclare([jimuBaseWidget, dijitWidgetsInTemplate], {
    baseClass: 'jimu-widget-GRG',
  /**
     *
     **/
    postCreate: function () {
      if(!this.config.grg) {
          this.config.grg = {};
      }
      
      this.createAreaGRGTab = new TabCreateAreaGRG({
        nls: this.nls,
        map: this.map,
        appConfig: this.appConfig,
        extentAreaFillSymbol: {
          type: 'esriSFS',
          style: 'esriSFSSolid',
          color: [155,155,155,155],
          outline: {
            color: [0, 0, 255, 255],
            width: 1.25,
            type: 'esriSLS',
            style: 'esriSLSSolid'
          }},
        GRGAreaFillSymbol: this.config.grg.gridSymbol || {
          type: 'esriSFS',
          style: 'esriSFSNull',
          color: [0,0,255,0],
          outline: {
            color: [0, 0, 255, 255],
            width: 1.25,
            type: 'esriSLS',
            style: 'esriSLSSolid'
          }},
        cellTextSymbol: this.config.grg.textSymbol || {
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
        }},
        this.createTabAreaNode
      );
      
      this.createPointGRGTab = new TabCreatePointGRG({
        nls: this.nls,
        map: this.map,
        appConfig: this.appConfig,
        pointSymbol: {
          'color': [255, 0, 0, 255],
          'size': 8,
          'type': 'esriSMS',
          'style': 'esriSMSCircle',
          'outline': {
              'color': [255, 0, 0, 255],
              'width': 1,
              'type': 'esriSLS',
              'style': 'esriSLSSolid'
          }
        },
        cellAreaFillSymbol: this.config.grg.gridSymbol || {
          type: 'esriSFS',
          style: 'esriSFSNull',
          color: [0,255,0,0],
          outline: {
            color: [0, 255, 0, 255],
            width: 1.25,
            type: 'esriSLS',
            style: 'esriSLSSolid'
          }},
        cellTextSymbol: this.config.grg.textSymbol || {
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
        }},
        this.createTabPointNode
      );

      this.tab = new TabContainer({
        tabs: [
          {
            title: this.nls.tabAreaTitle,
            content: this.createAreaGRGTab,
                   
          },
          {
            title: this.nls.tabPointTitle,
            content: this.createPointGRGTab
          }
        ]
      }, this.GRGTabContainer);
     
      this.tab.selectTab('Create GRG By Area');
      
      var tabContainer1 = registry.byId('GRGTabContainer');
    
      aspect.after(tabContainer1, "selectTab", function() {
          dojoTopic.publish('TAB_SWITCHED');        
      });
      
      this.busyIndicator  = busyIndicator.create(document.body);
      dojoTopic.subscribe("SHOW_BUSY", dojoLang.hitch(this, this.showBusy));
      dojoTopic.subscribe("HIDE_BUSY", dojoLang.hitch(this, this.hideBusy));
    },
    
    showBusy: function () {
      this.busyIndicator.show();      
    },
    
    hideBusy: function () {
      this.busyIndicator.hide();      
    },
    
    onClose: function () {
      dojoTopic.publish('DD_WIDGET_CLOSE');
    },

    onOpen: function () {
      dojoTopic.publish('DD_WIDGET_OPEN');
    }
  });
  return clz;
});
