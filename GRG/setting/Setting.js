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
  'dojo/_base/declare',
  'jimu/BaseWidgetSetting',
  'dojo/_base/lang',
  'dojo/_base/array',
  'dijit/registry',
  'dijit/_WidgetsInTemplateMixin',  
  'dojo/_base/Color',
  'dojo/dom-geometry',
  'dojo/on',
  'esri/symbols/TextSymbol',
  'esri/symbols/SimpleFillSymbol',
  'esri/symbols/jsonUtils',
  'jimu/dijit/SymbolPicker',
  'jimu/dijit/Message',
  'dijit/form/HorizontalSlider',
  'dijit/ColorPalette',
  'dijit/form/NumberSpinner',
  'jimu/dijit/ColorPicker'  
],
  function(
    declare,
    BaseWidgetSetting,
    lang,
    array,
    registry,
    _WidgetsInTemplateMixin,
    Color,
    domGeometry,
    on,
    TextSymbol,
    SimpleFillSymbol,
    symbolJsonUtils,
    SymbolPicker,
    Message
    ) {

    return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {
      baseClass: 'grg-setting',      
      gridSym: null,
      textSym: null,
      selectedGridSymbol: null,
      selectedTextSymbol: null,

      postCreate: function(){
        this.inherited(arguments);                
        this.setConfig(this.config);
      },

      gridSymbolChanged: function(newFillSymbol) {
        this.selectedGridSymbol = newFillSymbol;
      },

      textSymbolChanged: function(newTextSymbol) {
        this.selectedTextSymbol = newTextSymbol;
      },

      setConfig: function(config){
        if (config.grg) {
          this.gridSymbol.showBySymbol(new SimpleFillSymbol(this.config.grg.gridSymbol)); 

          var txtSym = new TextSymbol(this.config.grg.textSymbol);
          this.textSymbol.inputText.value = txtSym.text;
          this.textSymbol.showBySymbol(txtSym);
          this.textSymbol.symbol = txtSym;
          this.textSymbol.textColor.setColor(txtSym.color);
          this.textSymbol.textFontSize.set('value', txtSym.font.size);
        }
      },

      getConfig: function(){
        var gridSymbolNode = registry.byId(this.gridSymbol.symbolChooser.fillOutlineWidth.id);
        var textSymbol = registry.byId(this.textSymbol.textFontSize.id);
        if(gridSymbolNode.isValid() && textSymbol.isValid()) {
          this.config.grg = {
            gridSymbol: this.gridSymbol.getSymbol().toJson(),
            textSymbol: this.textSymbol.getSymbol().toJson()
          };      
          return this.config;
        } else {
          var alertMessage = new Message({
            message: this.nls.errorMessage
          });
          return false;
        }        
      }

    });
  });