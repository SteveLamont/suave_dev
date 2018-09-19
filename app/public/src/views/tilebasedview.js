//
//  HTML5 PivotViewer
//
//  Collection loader interface - used so that different types of data sources can be used
//
//  Original Code:
//    Copyright (C) 2011 LobsterPot Solutions - http://www.lobsterpot.com.au/
//    enquiries@lobsterpot.com.au
//
//  Enhancements:
//    Copyright (C) 2012-2014 OpenLink Software - http://www.openlinksw.com/
//
//  This software is licensed under the terms of the
//  GNU General Public License v2 (see COPYING)
//

PivotViewer.Views.TileBasedView = PivotViewer.Views.IPivotViewerView.subClass({
    init: function() {
        this._super();
        var that = this;
        $.subscribe("/PivotViewer/Views/Canvas/Drag", function (evt) {

            if (!that.isActive) return;

            var dragX = evt.x, dragY = evt.y;

            //LHS bounds check
            if (dragX > 0 && that.currentOffsetX > that.offsetX) dragX = 0;
                //RHS bounds check
                //if the current offset is smaller than the default offset and the zoom scale == 1 then stop drag
            else if (that.currentOffsetX < that.offsetX && that.currentWidth == that.width) dragX = 0;
            else if (dragX < 0 && that.currentOffsetX < (-that.currentWidth + that.width)) dragX = 0;
            else that.currentOffsetX += dragX;

            //Top bounds check
            if (dragY > 0 && (that.currentOffsetY + that.canvasHeightUIAdjusted) > that.currentHeight + that.offsetY) dragY = 0;
                //bottom bounds check
            else if (that.currentOffsetY < that.offsetY && that.currentHeight == that.height) dragY = 0;
            else if (dragY < 0 && (that.currentOffsetY - that.offsetY) < (-that.currentHeight + that.height)) dragY = 0;
            else that.currentOffsetY += dragY;

            if (dragX == 0 && dragY == 0) return;
            else that.offsetTiles(dragX, dragY);
        });
    },

    _findFilteredItem: function( evt ) {

	var iret = -1;
	if(evt.type == "init"){
            for (var i = 0; i < this.filterList.length; i++) {
		var loc = this.filterList[i].item.id;
		if (loc == evt.id) {
		    
		    iret = i;
		    break;
		    
		}
            }
        }else{
            for (var i = 0; i < this.filterList.length; i++) {
		var loc = this.filterList[i].contains(evt.x, evt.y);
		if (loc >= 0) {
		    
		    iret = i;
		    break;
		    
		}
            }
        }
	return iret;
    },
    super_handleClick: function (evt) {

	var i = this._findFilteredItem( evt );
	if ( i < 0 )
	    return null;
	else
	    return this.filterList[i];

    },
    handleClick: function (evt) { return this.super_handleClick(evt); },
    super_handleDoubleClick: function (evt) {

	var i = this._findFilteredItem( evt );
	if ( i < 0 )
	    return null;
	else
	    return this.filterList[i];

    },
    handleDoubleClick: function (evt) {
	return this.super_handleClick(evt);
    },
    super_handleHover: function (evt) {
        if (this.selected != null) return;
        for (var i = 0; i < this.filterList.length; i++) {
            var loc = this.filterList[i].contains(evt.x, evt.y);
            if (loc >= 0) this.filterList[i].setSelected(true);
            else this.filterList[i].setSelected(false);
        }
    },
    handleHover: function (evt) { this.super_handleHover(evt); },
    activate: function () {
        this._super();
        $('.pv-toolbarpanel-zoomslider').fadeIn();
        $('.pv-toolbarpanel-zoomcontrols').css('border-width', '1px');
        $('.pv-toolbarpanel-zoomcontrols').show();
        $('#MAIN_BODY').css('overflow', 'auto');
        $('.pv-toolbarpanel-sort').fadeIn();
        $('.pv-canvas').fadeIn();
    },
    deactivate: function () {
        this._super();
        $('.pv-toolbarpanel-zoomslider').fadeOut();
        $('.pv-toolbarpanel-sort').fadeOut();
        $('.pv-canvas').fadeOut();
    },
    offsetTiles: function (offsetX, offsetY) {

	for (var i = 0; i < this.filterList.length; i++) {
	    var flilocs = this.filterList[i]._locations;
	    for ( var j = 0; j < flilocs.length; j++ ) {

		flilocs[j].destinationx += offsetX;
		flilocs[j].destinationy += offsetY;

	    }

	}
    },
    calculateDimensions: function ( canvasWidth,
				    canvasHeight,
				    tileMaxRatio,
				    tileCount ) {

	var gap = 0.9;
	var a = tileMaxRatio * (tileCount - gap * gap);
	var b = (canvasHeight + (canvasWidth * tileMaxRatio)) * gap;
	var c = -1 * (canvasHeight * canvasWidth);

	//spl:072918 -- added Math.floor()
	var tileMaxWidth =
	    Math.floor( ((-1 * b) +
			 Math.sqrt( ( b * b ) - (4 * a * c))) / (2 * a) );
	var tileHeight = Math.floor(tileMaxWidth * tileMaxRatio);
	if (tileHeight < 3)
	    tileWidth = tileHeight = 3;

	var canvasRows = Math.floor(canvasHeight / tileHeight);
	var canvasColumns =
	    canvasWidth > tileMaxWidth ?
	    Math.floor(canvasWidth / tileMaxWidth) : 1; //RNP

	//spl:072918 -- added Math.ceil()
	var paddingX =
	    Math.ceil( canvasWidth - (canvasColumns * tileMaxWidth) );
	var paddingY =
	    Math.ceil( canvasHeight - (canvasRows * tileHeight) );
	var rc = {
	    Rows: canvasRows,
	    Columns: canvasColumns,
	    TileMaxWidth: tileMaxWidth,
	    TileHeight: tileHeight,
	    PaddingX : paddingX,
	    PaddingY: paddingY
	};

	return rc;
    },
    getTileDimensions: function ( canvasWidth,
				  canvasHeight,
				  tileMaxRatio,
				  tileCount,
				  rowscols ) {
	
	//spl:083117 -- Changed the wacky quadratic solution to just a
	//plain division.  I have no idea why there should be all this
	//elaboration when a simple solution seens all that is needed.

	// var gap = 0.9;
	// var a = tileMaxRatio * (tileCount - gap * gap);
	// var b = (canvasHeight + (canvasWidth * tileMaxRatio)) * gap;
	// var c = -1 * (canvasHeight * canvasWidth);

	// //spl:072918 -- added Math.floor()
	var tileMaxWidth =
	    canvasWidth / rowscols.Columns;
//	    ((-1 * b) + Math.sqrt(( b * b ) - (4 * a * c))) / (2 * a);
//	    Math.ceil( ((-1 * b) +
//			Math.sqrt(( b * b ) - (4 * a * c))) / (2 * a) );
//	    Math.floor( ((-1 * b) + Math.sqrt(b * b - (4 * a * c))) / (2 * a) );

	var tileHeight =
	    Math.floor(tileMaxWidth * tileMaxRatio);
	//spl:072918 -- added Math.ceil()
	var paddingX =
	    Math.ceil( canvasWidth - (rowscols.Columns * tileMaxWidth) ); 
	var paddingY =
	    Math.ceil( canvasHeight - (rowscols.Rows * tileHeight) );

	var rc = {
	    Rows: rowscols.Rows,
	    Columns: rowscols.Columns,
	    TileMaxWidth: tileMaxWidth,
	    TileHeight: tileHeight,
	    PaddingX: paddingX,
	    PaddingY: paddingY
	};

	return rc;
	
    }
});
