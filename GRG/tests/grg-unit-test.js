define([
    'intern!object',
    'intern/chai!assert',
    'dojo/dom-construct',
    'dojo/_base/window',
    'esri/map',
    'GRG/js/TabCreateAreaGRG',
    'GRG/js/TabCreatePointGRG',
    'GRG/js/TabDeleteGRG',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/on',
    'dojo/topic',
    'dojo/dom-attr',
    'dojo/dom-class',
    'dojo/dom-style',
    'dojo/string',
    'dojo/number',
    'dijit/form/Select'    
], function(registerSuite, assert, domConstruct, win, Map, TabCreateAreaGRG, TabCreatePointGRG, TabDeleteGRG) {
    // local vars scoped to this module
    var map, createAreaGRGTab, createPointGRGTab, deleteGRGTab;

    registerSuite({
        name: 'GRG-Test-Widget',
        // before the suite starts
        setup: function() {
            // load claro and esri css, create a map div in the body, and create the map object and print widget for our tests
            domConstruct.place('<link rel="stylesheet" type="text/css" href="//js.arcgis.com/3.16/esri/css/esri.css">', win.doc.getElementsByTagName("head")[0], 'last');
            domConstruct.place('<link rel="stylesheet" type="text/css" href="//js.arcgis.com/3.16/dijit/themes/claro/claro.css">', win.doc.getElementsByTagName("head")[0], 'last');
            domConstruct.place('<script src="http://js.arcgis.com/3.16/"></script>', win.doc.getElementsByTagName("head")[0], 'last');
            domConstruct.place('<div id="map" style="width:800px;height:600px;" class="claro"></div>', win.body(), 'only');
            domConstruct.place('<div id="createAreaGRGTab" style="width:300px;" class="claro"></div>', win.body(), 'last');
            domConstruct.place('<div id="createPointGRGTab" style="width:300px;" class="claro"></div>', win.body(), 'last');
            domConstruct.place('<div id="deleteGRGTab" style="width:300px;" class="claro"></div>', win.body(), 'last');

            map = new Map("map", {
                basemap: "topo",
                center: [-122.45, 37.75],
                zoom: 13,
                sliderStyle: "small"
            });
        },

        // before each test executes
        beforeEach: function() {
            // do nothing
        },

        // after the suite is done (all tests)
        teardown: function() {
            if (map.loaded) {
                map.destroy();                    
            }            
            if (createPointGRGTab) {
                createPointGRGTab.destroy();
            }
            if (createAreaGRGTab) {
                createAreaGRGTab.destroy();
            }
            if (deleteGRGTab) {
                deleteGRGTab.destroy();
            }
        },

        'Test TabCreateAreaGRG CTOR': function() {
            console.log('Start TabCreateAreaGRG CTOR');

            createAreaGRGTab = new TabCreateAreaGRG({
                map: map,
                canavasAreaFillSymbol: {
                    type: 'esriSFS',
                    style: 'esriSFSNull',
                    color: [0,0,255,0],
                    outline: {
                        color: [0, 0, 255, 255],
                        width: 1.25,
                        type: 'esriSLS',
                        style: 'esriSLSSolid'
                    }
                },
                cellAreaFillSymbol: {
                    type: 'esriSFS',
                    style: 'esriSFSNull',
                    color: [0,255,0,0],
                    outline: {
                        color: [0, 255, 0, 255],
                        width: 1.25,
                        type: 'esriSLS',
                        style: 'esriSLSSolid'
                    }
                }
            }, domConstruct.create("div")).placeAt("createAreaGRGTab"); 
            createAreaGRGTab.startup();

            assert.ok(createAreaGRGTab);
            assert.instanceOf(createAreaGRGTab, TabCreateAreaGRG, 'createAreaGRGTab should be an instance of TabCreateAreaGRG');

            console.log('End TabCreateAreaGRG CTOR');
        },

        'Test TabCreatePointGRG CTOR': function() {
            console.log('Start TabCreateAreaGRG CTOR');

            createPointGRGTab = new TabCreatePointGRG({
                map: map,
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
                cellAreaFillSymbol: {
                    type: 'esriSFS',
                    style: 'esriSFSNull',
                    color: [0,255,0,0],
                    outline: {
                        color: [0, 255, 0, 255],
                        width: 1.25,
                        type: 'esriSLS',
                        style: 'esriSLSSolid'
                    }
                }
            }, domConstruct.create("div")).placeAt("createPointGRGTab"); 
            createPointGRGTab.startup();

            assert.ok(createPointGRGTab);
            assert.instanceOf(createPointGRGTab, TabCreatePointGRG, 'createAreaGRGTab should be an instance of TabCreatePointGRG');

            console.log('End TabCreatePointGRG CTOR');            
        },

        'Test TabDeleteGRG CTOR': function() {
            console.log('Start TabDeleteGRG CTOR');

            deleteGRGTab = new TabDeleteGRG({
                map: map,
            }, domConstruct.create("div")).placeAt("deleteGRGTab"); 
            deleteGRGTab.startup();

            assert.ok(deleteGRGTab);
            assert.instanceOf(deleteGRGTab, TabDeleteGRG, 'deleteGRGTab should be an instance of TabDeleteGRG');

            console.log('End TabDeleteGRG CTOR');            
        }        
    });
});