/**
 *
 * Copyright (c) 2013 psteam Inc.(http://www.psteam.co.jp)
 * http://www.psteam.co.jp/qface/license
 * 
 * @Author: liwenfeng
 * @Date: 2013/02/28
 */
define([
	"qface/lang/declare",
	"qface/windows/media/Visual"
],function(declare,Visual) {


	var DrawingVisual = declare([Visual],{
		"-privates-" : {
		},
		"-attributes-" : {
		// public properties:
			/**
			 * The image to render. This can be an Image, a Canvas, or a Video.
			 * @property image
			 * @type Image | HTMLCanvasElement | HTMLVideoElement
			 **/
			image : null,
			
			/**
			 * Whether or not the Bitmap should be draw to the canvas at whole pixel coordinates.
			 * @property snapToPixel
			 * @type Boolean
			 * @default true
			 **/
			snapToPixel : true,

			/**
			 * Specifies an area of the source image to draw. If omitted, the whole image will be drawn.
			 * @property sourceRect
			 * @type Rectangle
			 * @default null
			 */
			sourceRect : null,
		},
		"-methods-" : {
		// public methods:

			/**
			 * Draws the display object into the specified context ignoring it's visible, alpha, shadow, and transform.
			 * Returns true if the draw was handled (useful for overriding functionality).
			 * NOTE: This method is mainly for internal use, though it may be useful for advanced uses.
			 * @method draw
			 * @param {CanvasRenderingContext2D} gctx The canvas 2D context object to draw into.
			 * @param {Boolean} ignoreCache Indicates whether the draw operation should ignore any current cache.
			 * For example, used for drawing the cache (to prevent it from simply drawing an existing cache back
			 * into itself).
			 **/
			draw : function(gctx, ignoreCache) {
				if (this.inherited(arguments)){ return true; }
				var rect = this.sourceRect;
				if (rect) {
					gctx.drawImage(this.image, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
				} else {
					gctx.drawImage(this.image, 0, 0);
				}
				return true;
			},
			
			//Note, the doc sections below document using the specified APIs (from DisplayObject)  from
			//Bitmap. This is why they have no method implementations.
			
			/**
			 * Because the content of a Bitmap is already in a simple format, cache is unnecessary for Bitmap instances.
			 * You should <b>not</b> cache Bitmap instances as it can degrade performance.
			 * @method cache
			 **/
			
			/**
			 * Because the content of a Bitmap is already in a simple format, cache is unnecessary for Bitmap instances.
			 * You should <b>not</b> cache Bitmap instances as it can degrade performance.
			 * @method updateCache
			 **/
			
			/**
			 * Because the content of a Bitmap is already in a simple format, cache is unnecessary for Bitmap instances.
			 * You should <b>not</b> cache Bitmap instances as it can degrade performance.
			 * @method uncache
			 **/
			

			/**
			 * Returns true or false indicating whether the display object would be visible if drawn to a canvas.
			 * This does not account for whether it would be visible within the boundaries of the stage.
			 * NOTE: This method is mainly for internal use, though it may be useful for advanced uses.
			 * @method isVisible
			 * @return {Boolean} Boolean indicating whether the display object would be visible if drawn to a canvas
			 **/
			isVisible : function() {
				var hasContent = this.cacheCanvas || (this.image && (this.image.complete || this.image.getContext || this.image.readyState >= 2));
				return !!(this.visible && this.alpha > 0 && this.scaleX != 0 && this.scaleY != 0 && hasContent);
			},

			/**
			 * Returns a clone of the Bitmap instance.
			 * @method clone
			 * @return {Bitmap} a clone of the Bitmap instance.
			 **/
			clone : function() {
				var o = new ImageVisual(this.image);
				if (this.sourceRect) { o.sourceRect = this.sourceRect.clone(); }
				this.cloneProps(o);
				return o;
			},
			
			/**
			 * Returns a string representation of this object.
			 * @method toString
			 * @return {String} a string representation of the instance.
			 **/
			toString : function() {
				return "[Bitmap (name="+  this.name +")]";
			}
		},

		/**
		 * A Bitmap represents an Image, Canvas, or Video in the display list. A Bitmap can be instantiated using an existing
		 * HTML element, or a string.
		 *
		 * <h4>Example</h4>
		 *      var bitmap = new createjs.Bitmap("imagePath.jpg");
		 *
		 * Note: When a string path or image tag that is not yet loaded is used, the stage may need to be redrawn before it
		 * will be displayed.
		 *
		 * @class Bitmap
		 * @extends DisplayObject
		 * @constructor
		 * @param {Image | HTMLCanvasElement | HTMLVideoElement | String} imageOrUri The source object or URI to an image to display. This can be either an Image, Canvas, or Video object, or a string URI to an image file to load and use. If it is a URI, a new Image object will be constructed and assigned to the .image property.
		 **/
		constructor : function(imageOrUri) {
			if (typeof imageOrUri == "string") {
				this.image = new Image();
				this.image.src = imageOrUri;
			} else {
				this.image = imageOrUri;
			}
		}

	});



	return ImageVisual;

});