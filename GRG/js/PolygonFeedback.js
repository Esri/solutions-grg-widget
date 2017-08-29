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
//
///////////////////////////////////////////////////////////////////////////

define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/_base/connect',
  'dojo/has',
  'dojo/topic',
  'esri/toolbars/draw',
  'esri/graphic',
  'esri/geometry/Polyline',
  'esri/geometry/Polygon',
  'esri/geometry/Point',
  'esri/geometry/Circle',
  'esri/symbols/SimpleMarkerSymbol',
  'esri/geometry/geometryEngine',
  './Feedback'
], function (
  dojoDeclare,
  dojoLang,
  dojoConnect,
  dojoHas,
  dojoTopic,
  esriDraw,
  esriGraphic,
  esriPolyLine,
  esriPolygon,
  esriPoint,
  esriCircle,
  SimpleMarkerSymbol,
  esriGeometryEngine,
  drawFeedback
) {
    var pf = dojoDeclare([drawFeedback], {
        R: [], //4 corners of the polygon
        S: [],
        T: [],
        U: [],
        M: [], //mid point of the polygon     
        angle: 0, //angle of the base line
        angle2: 0, //angle GRG needs to be rotated by
        
        /**
         *
         **/
        constructor: function (map, args) {
          dojoDeclare.safeMixin(this, args);
          this.inherited(arguments);
          this.clearPoints();        
        },            
          
        /*
        Handler for clearing out points
        */
        clearPoints: function (centerPoint) {
            this._points = [];
            this.map.graphics.clear();
        },

        /**
         *
         **/
        getAngle: function (stPoint, endPoint) {
          var angle = null;
          var delx = endPoint.y - stPoint.y;
          var dely = endPoint.x - stPoint.x;
          var azi = Math.atan2(dely, delx) * 180 / Math.PI;
          angle = ((azi + 360) % 360);
          return parseInt(angle);
        },

        /**
         *
         **/
        _onClickHandler: function (evt) {        
            this._points.push(evt.mapPoint.offset(0, 0));        
            switch (this._points.length) {            
                case 1:
                    //first point is point R of the rectangle
                    this.R = this._points[0];
                    
                    //Temp line shown on map whilst drawing                
                    this._tempLine = this.map.graphics.add(new esriGraphic(new esriPolyLine({
                        paths: [[[this.R.x, this.R.y], [this.R.x, this.R.y]]],
                        spatialReference: this.map.spatialReference
                    }), this.lineSymbol), true);
                    
                    //connect up the mouse move handler
                    this._onMouseMoveHandler_connect = dojoConnect.connect(this.map, 'onMouseMove', this._onMouseMoveHandler);
                    
                    //Change Tool Tip
                    var tooltip = this._tooltip;
                    if (tooltip) {
                      tooltip.innerHTML = this.nls.drawToolTip1;
                    }                  
                    break;                  
                case 2:
                    //second point is point S of the rectangle
                    this.S = this._points[1];
                    
                    //Temp polygon shown on map whilst drawing
                    this._tempPoly = this.map.graphics.add(new esriGraphic(new esriPolygon({
                        rings: [[[this.R.x, this.R.y], [this.R.x, this.R.y], [this.R.x, this.R.y], [this.R.x, this.R.y]]],
                        spatialReference: this.map.spatialReference
                    }), this.fillSymbol), true);
                    
                    //Change Tool Tip
                    var tooltip = this._tooltip;
                      if (tooltip) {
                          tooltip.innerHTML = this.nls.drawToolTip2;
                      }
                    break;                  
                case 3:
                    this._onDblClickHandler();
                    break;
            }
        },

        /**
         *
         **/
        _onDblClickHandler: function (evt) {
            if(this._points.length === 3) {
                dojoConnect.disconnect(this._onMouseMoveHandler_connect);
                this.map.graphics.clear();
                var geometry = new esriPolygon(this.map.spatialReference);          
                if(this.angle > 0 && this.angle <= 180) {
                    if(this.getAngle(this.R,this.T) > this.getAngle(this.R,this.S)){              
                        geometry.addRing([this.R,this.S,this.T,this.U]);
                        this.angle <= 90?this.angle2 = this.getAngle(this.U,this.R) - 360:this.angle2 = this.getAngle(this.U,this.R);              
                    } else {              
                        geometry.addRing([this.U,this.T,this.S,this.R]);
                        this.angle <= 90?this.angle2 = this.getAngle(this.R,this.U) - 360:this.angle2 = this.getAngle(this.R,this.U);
                    }             
                } else {
                    if(this.getAngle(this.R,this.T) > this.getAngle(this.R,this.S)){              
                        geometry.addRing([this.T,this.U,this.R,this.S]);
                        this.angle <= 270?this.angle2 = this.getAngle(this.S,this.T) - 360:this.angle2 = this.getAngle(this.S,this.T);              
                    } else {              
                        geometry.addRing([this.S,this.R,this.U,this.T]);
                        this.angle <= 270?this.angle2 = this.getAngle(this.U,this.R) - 360:this.angle2 = this.getAngle(this.U,this.R);
                    }            
                }          
                dojoTopic.publish('DD_LINE_ANGLE_DID_CHANGE', this.angle2);          
                this._drawEnd(geometry);          
            }
        },

        /**
         *
         **/
        _onMouseMoveHandler: function (evt) {
            if (this._points.length === 1) {       
                this.S = evt.mapPoint;
                var tempLine = new esriPolyLine({
                    paths: [[[this.R.x, this.R.y], [this.S.x, this.S.y]]],
                    spatialReference: this.map.spatialReference
                });
                this._tempLine.setGeometry(tempLine);            
                this.angle = this.getAngle(this.R, this.S);
            } else {
                this.T = evt.mapPoint;
                this.tempLine2 = new esriPolyLine({
                    paths: [[[this.S.x, this.S.y], [this.T.x, this.T.y]]],
                    spatialReference: this.map.spatialReference
                });            
                            
                var x = this.angle;
                switch (true) {
                    case (x >= 0 && x < 90):
                        this.S.y > this.T.y?x = x + 90:x = x - 90;                    
                        break;
                    case (x >= 90 && x < 180):
                        this.S.y < this.T.y?x = x - 90:x = x + 90;
                        break;
                    case (x >= 180 && x < 270):
                        this.S.y > this.T.y?x = x - 90:x = x + 90;
                        break;
                    default:
                        this.S.x < this.T.x?x = x + 90:x = x - 90;
                        break;
                }

                var circleGeometry = esriGeometryEngine.rotate(new esriCircle(this.tempLine2.getPoint(0,0), {
                  radius: esriGeometryEngine.geodesicLength(this.tempLine2, 9001),
                  geodesic: false,
                  numberOfPoints: 4
                }) ,90 - x);
                
                //calculate the two remaining points of the polygon (T & U) and the mid point
                this.T = circleGeometry.getPoint(0,0);
                this.M = new esriPoint([(this.R.x + this.T.x)/2,(this.R.y + this.T.y)/2],this.map.spatialReference);            
                this.U = new esriPoint([this.M.x - (this.S.x - this.M.x),this.M.y + (this.M.y - this.S.y)],this.map.spatialReference);
                
                //publish the mid point as this will be used to rotate the grid
                dojoTopic.publish('DD_MID_POINT_DID_CHANGE', this.M);
                
                var tempPoly = new esriPolygon({
                    rings: [[[this.R.x,this.R.y],[this.S.x,this.S.y],[this.T.x,this.T.y],[this.U.x,this.U.y]]],
                    spatialReference: this.map.spatialReference
                });            

                this._tempPoly.setGeometry(tempPoly);
            }
        }
    });
    pf.drawnLineAngleDidChange = 'DD_LINE_ANGLE_DID_CHANGE';
    pf.midPointDidChange = 'DD_MID_POINT_DID_CHANGE';
    return pf;
});
