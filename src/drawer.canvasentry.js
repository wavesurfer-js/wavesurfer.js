/**
 * @since 3.0.0
 */

import style from './util/style';
import getId from './util/get-id';

/**
 * The `CanvasEntry` class represents an element consisting of a wave `canvas`
 * and an (optional) progress wave `canvas`.
 *
 * The `MultiCanvas` renderer uses one or more `CanvasEntry` instances to
 * render a waveform, depending on the zoom level.
 */
export default class CanvasEntry {
    constructor() {
        /**
         * The wave node
         *
         * @type {HTMLCanvasElement}
         */
        this.wave = null;
        /**
         * The wave canvas rendering context
         *
         * @type {CanvasRenderingContext2D}
         */
        this.waveCtx = null;
        /**
         * The (optional) progress wave node
         *
         * @type {HTMLCanvasElement}
         */
        this.progress = null;
        /**
         * The (optional) progress wave canvas rendering context
         *
         * @type {CanvasRenderingContext2D}
         */
        this.progressCtx = null;
        /**
         * Start of the area the canvas should render, between 0 and 1
         *
         * @type {number}
         */
        this.start = 0;
        /**
         * End of the area the canvas should render, between 0 and 1
         *
         * @type {number}
         */
        this.end = 1;
        /**
         * Unique identifier for this entry
         *
         * @type {string}
         */
        this.id = getId(
            typeof this.constructor.name !== 'undefined'
                ? this.constructor.name.toLowerCase() + '_'
                : 'canvasentry_'
        );
        /**
         * Canvas 2d context attributes
         *
         * @type {object}
         */
        this.canvasContextAttributes = {};
        /**
         * The Timeout id used to track this canvas entry.
         */
        this.drawTimeout = null;
        /**
         * Track whether the canvas has been drawn
         */
        this.drawn = false;

    }

    /**
     * Store the wave canvas element and create the 2D rendering context
     *
     * @param {HTMLCanvasElement} element The wave `canvas` element.
     */
    initWave(element) {
        this.wave = element;
        this.waveCtx = this.wave.getContext('2d', this.canvasContextAttributes);
    }

    /**
     * Store the progress wave canvas element and create the 2D rendering
     * context
     *
     * @param {HTMLCanvasElement} element The progress wave `canvas` element.
     */
    initProgress(element) {
        this.progress = element;
        this.progressCtx = this.progress.getContext(
            '2d',
            this.canvasContextAttributes
        );
    }

    /**
     * Update the dimensions
     *
     * @param {number} elementWidth Width of the entry
     * @param {number} totalWidth Total width of the multi canvas renderer
     * @param {number} width The new width of the element
     * @param {number} height The new height of the element
     */
    updateDimensions(elementWidth, totalWidth, width, height) {
        // where the canvas starts and ends in the waveform, represented as a
        // decimal between 0 and 1
        this.start = this.wave.offsetLeft / totalWidth || 0;
        this.end = this.start + elementWidth / totalWidth;

        // set wave canvas dimensions
        this.wave.width = width;
        this.wave.height = height;
        let elementSize = { width: elementWidth + 'px' };
        style(this.wave, elementSize);

        if (this.hasProgressCanvas) {
            // set progress canvas dimensions
            this.progress.width = width;
            this.progress.height = height;
            style(this.progress, elementSize);
        }
    }

    /**
     * Clear the wave and progress rendering contexts
     */
    clearWave() {

        // wave
        this.waveCtx.save();
        this.waveCtx.setTransform(1, 0, 0, 1, 0, 0);
        this.waveCtx.clearRect(
            0,
            0,
            this.wave.width,
            this.wave.height
        );
        this.waveCtx.restore();

        // progress
        if (this.hasProgressCanvas) {
            this.progressCtx.save();
            this.progressCtx.setTransform(1, 0, 0, 1, 0, 0);
            this.progressCtx.clearRect(
                0,
                0,
                this.progress.width,
                this.progress.height
            );
            this.progressCtx.restore();
            this.setBackimage("", "");
        } else {
            this.setBackimage("");
        }
        this.drawn = false;
    }

    /**
     * Set the fill styles for wave and progress
     * @param {string|string[]} waveColor Fill color for the wave canvas,
     * or an array of colors to apply as a gradient
     * @param {?string|string[]} progressColor Fill color for the progress canvas,
     * or an array of colors to apply as a gradient
     */
    setFillStyles(waveColor, progressColor) {
        this.waveCtx.fillStyle = this.getFillStyle(this.waveCtx, waveColor);

        if (this.hasProgressCanvas) {
            this.progressCtx.fillStyle = this.getFillStyle(this.progressCtx, progressColor);
        }
    }

    /**
     * Utility function to handle wave color arguments
     *
     * When the color argument type is a string or CanvasGradient instance,
     * it will be returned as is. Otherwise, it will be treated as an array,
     * and a new CanvasGradient will be returned
     *
     * @since 6.0.0
     * @param {CanvasRenderingContext2D} ctx Rendering context of target canvas
     * @param {string|string[]|CanvasGradient} color Either a single fill color
     *     for the wave canvas, an existing CanvasGradient instance, or an array
     *     of colors to apply as a gradient
     * @returns {string|CanvasGradient} Returns a string fillstyle value, or a
     *     canvas gradient
     */
    getFillStyle(ctx, color) {
        if (typeof color == 'string' || color instanceof CanvasGradient) {
            return color;
        }

        const waveGradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
        color.forEach((value, index) => waveGradient.addColorStop((index / color.length), value));

        return waveGradient;
    }

    /**
     * Set the canvas transforms for wave and progress
     *
     * @param {boolean} vertical Whether to render vertically
     */
    applyCanvasTransforms(vertical) {
        if (vertical) {
            // Reflect the waveform across the line y = -x
            this.waveCtx.setTransform(0, 1, 1, 0, 0, 0);

            if (this.hasProgressCanvas) {
                this.progressCtx.setTransform(0, 1, 1, 0, 0, 0);
            }
        }
    }

    /**
     * Draw a rectangle for wave and progress
     *
     * @param {number} x X start position
     * @param {number} y Y start position
     * @param {number} width Width of the rectangle
     * @param {number} height Height of the rectangle
     * @param {number} radius Radius of the rectangle
     */
    fillRects(x, y, width, height, radius) {
        this.fillRectToContext(this.waveCtx, x, y, width, height, radius);

        if (this.hasProgressCanvas) {
            this.fillRectToContext(
                this.progressCtx,
                x,
                y,
                width,
                height,
                radius
            );
        }
    }

    /**
     * Draw the actual rectangle on a `canvas` element
     *
     * @param {CanvasRenderingContext2D} ctx Rendering context of target canvas
     * @param {number} x X start position
     * @param {number} y Y start position
     * @param {number} width Width of the rectangle
     * @param {number} height Height of the rectangle
     * @param {number} radius Radius of the rectangle
     */
    fillRectToContext(ctx, x, y, width, height, radius) {
        if (!ctx) {
            return;
        }

        if (radius) {
            this.drawRoundedRect(ctx, x, y, width, height, radius);
        } else {
            ctx.fillRect(x, y, width, height);
        }
    }

    /**
     * Draw a rounded rectangle on Canvas
     *
     * @param {CanvasRenderingContext2D} ctx Canvas context
     * @param {number} x X-position of the rectangle
     * @param {number} y Y-position of the rectangle
     * @param {number} width Width of the rectangle
     * @param {number} height Height of the rectangle
     * @param {number} radius Radius of the rectangle
     *
     * @return {void}
     * @example drawRoundedRect(ctx, 50, 50, 5, 10, 3)
     */
    drawRoundedRect(ctx, x, y, width, height, radius) {
        if (height === 0) {
            return;
        }
        // peaks are float values from -1 to 1. Use absolute height values in
        // order to correctly calculate rounded rectangle coordinates
        if (height < 0) {
            height *= -1;
            y -= height;
        }
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(
            x + width,
            y + height,
            x + width - radius,
            y + height
        );
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
    }

    /**
     * Render the actual wave and progress lines
     *
     * @param {number[]} peaks Array with peaks data
     * @param {number} absmax Maximum peak value (absolute)
     * @param {number} halfH Half the height of the waveform
     * @param {number} offsetY Offset to the top
     * @param {number} start The x-offset of the beginning of the area that
     * should be rendered
     * @param {number} end The x-offset of the end of the area that
     * should be rendered
     */
    drawLines(peaks, absmax, halfH, offsetY, start, end) {
        this.drawLineToContext(
            this.waveCtx,
            peaks,
            absmax,
            halfH,
            offsetY,
            start,
            end
        );

        if (this.hasProgressCanvas) {
            this.drawLineToContext(
                this.progressCtx,
                peaks,
                absmax,
                halfH,
                offsetY,
                start,
                end
            );
        }
        this.drawn = true;
    }

    /**
     * Render the actual waveform line on a `canvas` element
     *
     * @param {CanvasRenderingContext2D} ctx Rendering context of target canvas
     * @param {number[]} peaks Array with peaks data
     * @param {number} absmax Maximum peak value (absolute)
     * @param {number} halfH Half the height of the waveform
     * @param {number} offsetY Offset to the top
     * @param {number} start The x-offset of the beginning of the area that
     * should be rendered
     * @param {number} end The x-offset of the end of the area that
     * should be rendered
     */
    drawLineToContext(ctx, peaks, absmax, halfH, offsetY, start, end) {
        if (!ctx) {
            return;
        }

        const length = peaks.length / 2;
        const first = Math.round(length * this.start);

        // use one more peak value to make sure we join peaks at ends -- unless,
        // of course, this is the last canvas
        const last = Math.round(length * this.end) + 1;

        const canvasStart = first;
        const canvasEnd = last;
        const scale = this.wave.width / (canvasEnd - canvasStart - 1);

        // optimization
        const halfOffset = halfH + offsetY;
        const absmaxHalf = absmax / halfH;

        ctx.beginPath();
        ctx.moveTo((canvasStart - first) * scale, halfOffset);

        ctx.lineTo(
            (canvasStart - first) * scale,
            halfOffset - Math.round((peaks[2 * canvasStart] || 0) / absmaxHalf)
        );

        let i, peak, h;
        for (i = canvasStart; i < canvasEnd; i++) {
            peak = peaks[2 * i] || 0;
            h = Math.round(peak / absmaxHalf);
            ctx.lineTo((i - first) * scale + this.halfPixel, halfOffset - h);
        }

        // draw the bottom edge going backwards, to make a single
        // closed hull to fill
        let j = canvasEnd - 1;
        for (j; j >= canvasStart; j--) {
            peak = peaks[2 * j + 1] || 0;
            h = Math.round(peak / absmaxHalf);
            ctx.lineTo((j - first) * scale + this.halfPixel, halfOffset - h);
        }

        ctx.lineTo(
            (canvasStart - first) * scale,
            halfOffset -
            Math.round((peaks[2 * canvasStart + 1] || 0) / absmaxHalf)
        );

        ctx.closePath();
        ctx.fill();
    }

    /**
     * Destroys this entry
     */
    destroy() {
        this.waveCtx = null;
        this.wave = null;

        this.progressCtx = null;
        this.progress = null;
    }

    /**
     * Return image data of the wave `canvas` element
     *
     * When using a `type` of `'blob'`, this will return a `Promise` that
     * resolves with a `Blob` instance.
     *
     * @param {string} format='image/png' An optional value of a format type.
     * @param {number} quality=0.92 An optional value between 0 and 1.
     * @param {string} type='dataURL' Either 'dataURL' or 'blob'.
     * @return {string|Promise} When using the default `'dataURL'` `type` this
     * returns a data URL. When using the `'blob'` `type` this returns a
     * `Promise` that resolves with a `Blob` instance.
     */
    getImage(format, quality, type) {
        if (type === 'blob') {
            return new Promise(resolve => {
                this.wave.toBlob(resolve, format, quality);
            });
        } else if (type === 'dataURL') {
            return this.wave.toDataURL(format, quality);
        }
    }

    /**
     * Return image data of the wave `canvas` element progress overlay
     *
     * When using a `type` of `'blob'`, this will return a `Promise` that
     * resolves with a `Blob` instance.
     *
     * @param {string} format='image/png' An optional value of a format type.
     * @param {number} quality=0.92 An optional value between 0 and 1.
     * @param {string} type='dataURL' Either 'dataURL' or 'blob'.
     * @return {string|Promise} When using the default `'dataURL'` `type` this
     * returns a data URL. When using the `'blob'` `type` this returns a
     * `Promise` that resolves with a `Blob` instance.
     */
    getProgressImage(format, quality, type) {
        if (type === 'blob') {
            return new Promise(resolve => {
                this.progress.toBlob(resolve, format, quality);
            });
        } else if (type === 'dataURL') {
            return this.progress.toDataURL(format, quality);
        }
    }

    /**
     * Creates the background images of wave and progress for mimicking zoom
     * @param {DataURL} backImage the image of the wave for the background
     * @param {DataURL} progBackImage=null the image of the progress for the background
     */
    setBackimage(backImage, progBackImage = null) {
        //For the wave
        if (this.wave.querySelector(".backimage") != null) {
            let image = this.wave.querySelector(".backimage");
            image.src = backImage;
        } else {
            let image = document.createElement('img');
            image.className = "backimage";
            image.src = backImage;
            this.wave.appendChild(image);
        }

        //For the progress
        if (progBackImage != null) {
            if (this.progress.querySelector(".progbackimage") != null) {
                let progImage = this.progress.querySelector(".progbackimage");
                progImage.src = progBackImage;
            } else {
                let progImage = document.createElement('img');
                progImage.className = "progbackimage";
                progImage.src = progBackImage;
                this.progress.appendChild(progImage);
            }
        }
    }

    /**
     * Stretches and displays the background images
     * @param {Number} start The start position of this canvas
     * @param {Number} totalWidth The desired width of the entire element (in pixels)
     * @param {Number} pixelRatio Pixel ratio of the screen being displayed to
     * @param {[Number, Number]} viewBounds the [left,right] boundaries of the viewable area
     * @param {HTMLImageElement|Array.<HTMLImageElement>} backupImg backimg image(s) loaded on first zoom
     * @returns the end position of the canvas if it were fully rendered
     */
    stretchBackimage(start, totalWidth, pixelRatio, viewBounds, backupImg) {
        //Adjust end
        let end = this.end * totalWidth;

        //Limit to viewbounds
        if (start > viewBounds[1] || end < viewBounds[0]) {
            //Canvas is not in frame
            this.waveCtx.clearRect(0, 0, this.waveCtx.canvas.width, this.waveCtx.canvas.height);
            this.progressCtx.clearRect(0, 0, this.progressCtx.canvas.width, this.progressCtx.canvas.height);
            return end;
        }
        let viewStart = Math.max(start, viewBounds[0]);
        let viewEnd = Math.min(end, viewBounds[1]);
        let viewOffset = (start - viewStart) * pixelRatio; //Move the image left to account for new canvas start

        //Calculation widths
        let newWidth = viewEnd - viewStart;
        let waveWidth = Math.round(newWidth);
        let canvasWidth = Math.round(newWidth * pixelRatio);
        let imageWidth = Math.round((end - start) * pixelRatio);

        //Stretch canvases
        this.wave.width = canvasWidth;
        let elementSize = { width: waveWidth + 'px' };
        let elementStart = {left: viewStart + 'px'};
        style(this.wave, elementSize);
        style(this.wave, elementStart);

        if (this.hasProgressCanvas) {
            this.progress.width = canvasWidth;
            style(this.progress, elementSize);
            style(this.progress, elementStart);
        }

        //Wave
        let image = this.wave.querySelector(".backimage");
        this.waveCtx.clearRect(0, 0, canvasWidth, this.wave.height);
        if (image.getAttribute('src') == "") {
            if (Array.isArray(backupImg)) {
                //Backup is more than 1 canvas
                //Find a ratio of backup positions to new positions
                let newWidth = totalWidth * pixelRatio;
                let backupWidth = 0;
                for (let i = 0; i < backupImg.length; i++) {
                    backupWidth += backupImg[i].width;
                }
                let backupScale = newWidth / backupWidth;

                //Check if backup is in range and then draw scaled version
                let backupOffset = 0; //Track left offset
                for (let i = 0; i < backupImg.length; i++) {
                    let dWidth = Math.ceil(backupImg[i].width * backupScale);
                    let dx = Math.floor(backupOffset - (this.wave.offsetLeft * pixelRatio) + viewOffset);

                    //This could be optimised to only draw images on the canvas
                    this.waveCtx.drawImage(backupImg[i], 0, 0, backupImg[i].width, backupImg[i].height, dx, 0, dWidth, backupImg[i].height);

                    //Setup next item
                    backupOffset += dWidth;
                }
            } else {
                this.waveCtx.drawImage(backupImg, image.width * this.start, 0, (image.width * this.end) - (image.width * this.start), image.height, viewOffset, 0, imageWidth, image.height);
            }
        } else {
            this.waveCtx.drawImage(image, viewOffset, 0, imageWidth, image.height);
        }

        //Progress
        let progImage = this.progress.querySelector(".progbackimage");
        if (progImage !== null) {
            this.progressCtx.clearRect(0, 0, canvasWidth, this.progress.height);
            this.progressCtx.drawImage(progImage, viewOffset, 0, imageWidth, progImage.height);
        }
        return end;
    }

    /**
     * Set the left offset of the canvas
     * @param {Number} position in px for the canvas to start
     */
    setLeft(position) {
        let elementStart = {left: position + 'px'};
        style(this.wave, elementStart);
        if (this.hasProgressCanvas) {
            style(this.progress, elementStart);
        }
    }
}
