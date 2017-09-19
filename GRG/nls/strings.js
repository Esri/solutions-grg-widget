define({
  root: ({
    _widgetLabel: "Gridded Reference Graphic", // Label of widget
    
    //main page
    "newGRGFromAreaButtonLabel": 'Define a Grid from an Area', // Shown as label to start new GRG from Area button on main page
    "newGRGFromPointButtonLabel": 'Define a Grid from a Point', // Shown as label to new GRG from point button on main page
    
    //GRG from Area and Point Menus
    "newGRGFromAreaTitle": 'Define a Grid from an Area', // Shown as Title on Area Menu
    "newGRGFromPointTitle": 'Define a Grid from a Point', // Shown as Title on Area Menu
    "newGRGBySizeButtonLabel": 'By Dimension', // Shown as label to start new GRG by size button on Area Menu or Point Menu
    "newGRGFromRefSystemButtonLabel": 'By Reference System', // Shown as label to start new from reference system button on Area Menu or Point Menu
    "newGRGFromNonStandardButtonLabel": 'Define Non-Standard Grid', // Shown as label to start new GRG from non standard button on Area Menu or Point Menu
    
    //Area GRG By Size Panel    
    "newGRGAreaBySizeTitle": "GRG from an Area by Dimension", // Shown as title for new GRG from area panel
    "newGRGAreaBySizeDefineAreaLabel": 'GRG Area', // Shown as text for new GRG from area toolbar 
    "addGRGAreaPolygonToolTip": "Draw GRG Area using polygon", // Shown as tooltip on draw rectangle icon
    "addGRGAreaExtentToolTip": "Draw GRG Area using extent", // Shown as tooltip on draw extent icon
    "rotation": 'Grid Rotation', // Shown as label above rotation input box
    
    //Area GRG By Reference System Panel    
    "newGRGAreaByRefSystemTitle": 'GRG from an Area by Reference System', // Shown as title for new GRG from reference system panel
    "gridSize": 'Grid Size', // Shown as title for new GRG from reference system panel
    "UTMZoneandBand": 'Grid Zone', // Shown as label for UTM Zone and Band in gridSize dropdown
    "100000m": '100000 meter', // Shown as label for 100000 meter in gridSize dropdown
    "10000m": '10000 meter', // Shown as label for 10000 meter in gridSize dropdown
    "1000m": '1000 meter', // Shown as label for 10000 meter in gridSize dropdown
    "100m": '100 meter', // Shown as label for 100 meter in gridSize dropdown
    "10m": '10 meter', // Shown as label for 10 meter in gridSize dropdown    
    "clipGrid": 'Clip Grid to GRG Area', // Shown as label for clip grid toggle switch
    
    //Area GRG from non standard grid Panel    
    "newGRGAreaFromNonStandardTitle": "New NRG", // Shown as title for new GRG from non standard grid Panel

    //Point GRG By Size Panel    
    "newGRGPointBySizeTitle": "GRG from Point by Dimension", // Shown as title for new GRG from point panel
    
    //Point GRG By Reference System Panel    
    "newGRGPointByRefSystemTitle": "GRG from Point by Reference System", // Shown as title for new GRG from reference system panel

    //Settings Panel
    "settingsTitle": "Settings", // Shown as Title for Grid Settings page and label on settings buttons
    "labelSettingsLabel": 'Label Settings', // Shown as Title for Label Settings dropdown
    "labelSettingsButtonLabel": 'Configure Label Settings', // Shown as tooltip for Label Settings dropdown
    "gridSettingsLabel": 'Grid Settings', // Shown as Title for Label Settings dropdown
    "gridSettingsButtonLabel": 'Configure Grid Settings', // Shown as tooltip for Label Settings dropdown
    "transparency": 'Transparency', // Shown as label on transparency sliders
    "labelStyle": 'Label Style', // Shown as label on label settings
    "font": 'Font', // Shown as label for font type
    "textSize": 'Text Size', // Shown as label for font size
    "textColor": 'Text Color', // Shown as label for font colour
    "halo": 'Halo', // Shown as label for halo settings    
    "show": 'Show', // Shown as label for halo settings
    "lockSettings": 'Settings have been locked by the application owner', // Shown as tooltip on settings button if locked
    
    "gridSettings": {
      "cellShape": "Cell Shape", // Shown as label to set Cell Shape Type
      "cellUnits": "Cell Units", // Shown as label to set Cell Units      
      "cellOutline": 'Cell Outline Settings', // Shown as label to set cell Outline Settings
      "cellFill": 'Cell Fill Settings', // Shown as label to set cell fill Settings
      "gridReferenceSystem": 'Reference System', // Shown as label to set Reference System
      "gridDatum": 'Datum: WGS84', // Shown as label for datum
      "labelStartPosition": "Label Origin",  // Shown as label to set label start position      
      "labelType": "Label Type", // Shown as label to set label type
      "labelDirection": "Label Direction", // Shown as label to set label direction
      "gridOrigin": "Grid Origin", // Shown as label to set grid origin
      
      "default": "Rectangle", // Shown as label for default in cell shape dropdown
      "hexagon": "Hexagon", // Shown as label for hexagon in cell shape  dropdown      
      
      "miles": 'Miles', // Shown as label for miles in cell units dropdown
      "kilometers": 'Kilometers', // Shown as label for kilometers in cell units dropdown
      "feet": 'Feet', // Shown as label for feet in cell units dropdown
      "meters": 'Meters', // Shown as label for meters in cell units dropdown
      "yards": 'Yards', // Shown as label for yards in cell units dropdown
      "nautical-miles": 'Nautical Miles', // Shown as label for nauticalMiles in cell units dropdown
      
      "lowerLeft": 'Lower-Left', // Shown as label for lower left in label start position and grid origin dropdowns
      "lowerRight": 'Lower-Right', // Shown as label for lower right in label start position and grid origin dropdowns
      "upperLeft": 'Upper-Left', // Shown as label for upper left in label start position and grid origin dropdowns
      "upperRight": 'Upper-Right', // Shown as label for upper right in label start position and grid origin dropdowns
      "center": 'Center', // Shown as label for center in grid origin dropdown
      
      "alphaNumeric": 'Alpha-Numeric', // Shown as label for Alpha-Numeric in label type dropdown
      "alphaAlpha": 'Alpha-Alpha', // Shown as label for Alpha-Alpha in label type dropdown
      "numeric": 'Numeric', // Shown as label for Numeric in label type dropdown
      
      "horizontal": 'Horizontal', // Shown as label for Horizontal in label direction dropdown
      "vertical": 'Vertical', // Shown as label for Vertical in label direction dropdown
      
      "MGRS": 'MGRS', // Shown as label for MGRS in reference system dropdown
      "USNG": 'USNG', // Shown as label for USNG in reference system dropdown
      
      "showLabels": 'Show Labels', // Shown as label for show labels toggle switch    
    },
    
    //Publish Panel
    "publishTitle": "Publish GRG to Portal", // Shown as Title for Grid Settings page and label on settings buttons
    "publishGRGBtn": 'Publish',    
    "GRGLayerName": 'Published GRG Layer Name', // Shown as label for layer name box
    "invalidGRGLayerName": 'Layer name must only contain alpha-numeric characters and underscores',
    "missingGRGLayerName": 'You must enter a name for the GRG',
    
    //publishing error messages
    "publishingFailedLayerExists": 'Publishing Failed: You already have a feature service named {0}. Please choose another name.', //Shown as error for layer name already used when publishing {0} will be replaced with the layer name in the code so do not remove
    "checkService": 'Check Service: {0}', //{0} will be replaced in the code so do not remove
    "createService": 'Create Service: {0}', //{0} will be replaced in the code so do not remove
    "unableToCreate": 'Unable to create: {0}', //{0} will be replaced in the code so do not remove
    "addToDefinition": 'Add to definition: {0}', //{0} will be replaced in the code so do not remove
    "successfullyPublished": 'Successfully published web layer{0}Manage the web layer', //{0} will be replaced in the code so do not remove
    
    //common
    "createGRGBtn": 'Create GRG', // Shown as label on create button
    "clearGRGBtn": 'Clear', // Shown as label on clear button
    "labelFormat": 'Label Format', // Shown as label above label format input box
    "helpIconTooltip": 'Z: Grid Zone Designation (GZD)\nS: 100,000-meter grid square designator\nX: X Coordinate (Easting)\nY: Y Coordinate (Northing)\n\nExample:\n Z-S-X-Y 15S-WC-80817-51205', // Shown as label above label format input box
    "addPointToolTip": 'Add GRG Origin',
    "numberRowsColumnsLabel": 'Define number of rows and columns',
    "cellWidth": 'Cell Width (x)',
    "cellHeight": 'Cell Height (y)',
    "invalidNumberMessage": 'The value entered is not valid',
    "invalidRangeMessage": 'Value must be greater than 0',
    "gridAngleInvalidRangeMessage": 'Value must be between -89.9 and 89.9',     
    "formatIconTooltip": 'Format Input', // Shown as tooltip on the format input coordinate button
    "coordInputLabel": 'GRG Origin (DD)', // Shown as label for coordinate input box (DD) denotes that decimal degrees is set as the default
    "setCoordFormat": 'Set Coordinate Format String',
    "prefixNumbers": 'Add "+/-" prefix to positive and negative numbers',
    "cancelBtn": 'Cancel',
    "applyBtn": 'Apply',
    "notationsMatch": 'notations match your input please confirm which you would like to use:',
    "numberOfCellsHorizontal": '# Horizontal Cells', // Shown as label for number of Horizontal cells
    "numberOfCellsVertical": '# Vertical Cells', // Shown as label for number of Vertical cells
    "gridAngle": 'Grid Rotation', // Shown as label for grid angle
    "missingParametersMessage": '<p>The GRG creation form has missing or invalid parameters, Please ensure:</p><ul><li>A GRG area has been drawn.</li><li>The cell width and height contain valid values.</li></ul>',
    "drawPointToolTip": 'Click to add GRG origin point',
    "drawToolTip2": 'Click to finish GRG Area',
    "missingLayerNameMessage": 'You must enter a valid layer name before you can publish',
    "comfirmInputNotation": 'Confirm Input Notation',   
    "parseCoordinatesError": 'Unable to parse coordinates. Please check your input.' //Shown as error message for unknown coordinates
    
  })
});
