define({
  root: ({
    _widgetLabel: "GRG Creator", // Label of widget
    
    //main page
    "newGRGFromAreaButtonLabel": 'Create GRG From Area', // Shown as label to start new GRG from Area button on main page
    "newGRGFromPointButtonLabel": 'Create GRG From Point', // Shown as label to new GRG from point button on main page
    
    //GRG from Area and Point Menus
    "newGRGFromAreaTitle": 'GRG From Area', // Shown as Title on Area Menu
    "newGRGFromPointTitle": 'GRG From Point', // Shown as Title on Area Menu
    "newGRGBySizeButtonLabel": 'Define Grid by Size', // Shown as label to start new GRG by size button on Area Menu or Point Menu
    "newGRGFromRefSystemButtonLabel": 'Define Grid by Reference System', // Shown as label to start new from reference system button on Area Menu or Point Menu
    "newGRGFromNonStandardButtonLabel": 'Define Non-Standard Grid', // Shown as label to start new GRG from non standard button on Area Menu or Point Menu
    
    //Area GRG By Size Panel    
    "newGRGAreaBySizeTitle": "New GRG From Area", // Shown as title for new GRG from area panel
    "newGRGAreaBySizeDefineAreaLabel": 'Define GRG Area', // Shown as text for new GRG from area toolbar 
    "addGRGAreaPolygonToolTip": "Draw GRG Area using polygon", // Shown as tooltip on draw rectangle icon
    "addGRGAreaExtentToolTip": "Draw GRG Area using extent", // Shown as tooltip on draw extent icon
    
    //Area GRG By Reference System Panel    
    "newGRGAreaByRefSystemTitle": 'New GRG From Reference System', // Shown as title for new GRG from reference system panel
    "gridSize": 'Select Grid Size', // Shown as title for new GRG from reference system panel
    "UTMZoneandBand": 'UTM Zone and Band', // Shown as label for UTM Zone and Band in gridSize dropdown
    "100000m": '100000 meter', // Shown as label for 100000 meter in gridSize dropdown
    "10000m": '10000 meter', // Shown as label for 10000 meter in gridSize dropdown
    "1000m": '1000 meter', // Shown as label for 10000 meter in gridSize dropdown
    "100m": '100 meter', // Shown as label for 100 meter in gridSize dropdown
    "10m": '10 meter', // Shown as label for 10 meter in gridSize dropdown    
    "clipGrid": 'Clip Grid to GRG Area', // Shown as label for clip grid toggle switch
    
    //Area GRG from non standard grid Panel    
    "newGRGAreaFromNonStandardTitle": "New NRG", // Shown as title for new GRG from non standard grid Panel

    //Point GRG By Size Panel    
    "newGRGPointBySizeTitle": "New GRG From Point", // Shown as title for new GRG from area panel
    
    //Point GRG By Reference System Panel    
    "newGRGPointByRefSystemTitle": "New GRG From Reference System", // Shown as title for new GRG from reference system panel

    //Settings Panel
    "settingsTitle": "Settings", // Shown as Title for Grid Settings page and label on settings buttons
    "gridSettings": {
      "cellShape": "Cell Shape", // Shown as label to set Cell Shape Type
      "cellUnits": "Cell Units", // Shown as label to set Cell Units      
      "labelStartPosition": "Label Start Position",  // Shown as label to set label start position      
      "labelType": "Label Type", // Shown as label to set label type
      "gridOrigin": "Grid Origin", // Shown as label to set grid origin
      
      "default": "Default", // Shown as label for default in cell shape dropdown
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
      
      "showLabels": 'Show Labels', // Shown as label for show labels toggle switch    
    },
    

    
    "GRGLayerName": 'Published GRG Layer Name', // Shown as label for layer name box
    "invalidGRGLayerName": 'Layer name must only contain alpha-numeric characters and underscores',
    "missingGRGLayerName": 'You must enter a name for the GRG',
    
    "addPointToolTip": 'Add GRG Center Point',
    "numberRowsColumnsLabel": 'Use set number of rows and columns',
    "cellWidth": 'Cell Width',
    "cellHeight": 'Cell Height',
    "invalidNumberMessage": 'The value entered is not valid',
    "invalidRangeMessage": 'Value must be greater than 0',
    "gridAngleInvalidRangeMessage": 'Value must be between -89 and 89',
    "createGRGBtn": 'Create GRG',
    "publishGRGBtn": 'Publish GRG to Portal',
    "removeGRGLabel": 'Remove GRG Area',
    "formatIconTooltip": 'Format Input', // Shown as tooltip on the format input coordinate button
    "coordInputLabel": 'GRG Center Point', // Shown as label for coordinate input
    "setCoordFormat": 'Set Coordinate Format String',
    "prefixNumbers": 'Add "+/-" prefix to positive and negative numbers',
    "cancelBtn": 'Cancel',
    "applyBtn": 'Apply',
    "notationsMatch": 'notations match your input please confirm which you would like to use:',
    "numberOfCellsHorizontal": '# Horizontal Cells', // Shown as label for number of Horizontal cells
    "numberOfCellsVertical": '# Vertical Cells', // Shown as label for number of Vertical cells
    "gridAngle": 'Grid Angle', // Shown as label for grid angle
    "missingParametersMessage": '<p>The GRG creation form has missing or invalid parameters, Please ensure:</p><ul><li>A GRG area has been drawn.</li><li>The cell width and height contain valid values.</li></ul>',
    "drawToolTip1": 'Click to set GRG base angle',
    "drawToolTip2": 'Click to finish GRG Area',
    "missingLayerNameMessage": 'You must enter a GRG Layer Name before you can publish',
    "comfirmInputNotation": 'Confirm Input Notation',
    "parseCoordinatesError": 'Unable to parse coordinates. Please check your input.' //Shown as error message for unknown coordinates
    
  })
});
