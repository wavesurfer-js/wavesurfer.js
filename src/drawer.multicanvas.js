import Drawer from './drawer';
import * as util from './util';
import CanvasEntry from './drawer.canvasentry';
import { parseISO } from 'date-fns';

/**
 * MultiCanvas renderer for wavesurfer. Is currently the default and sole
 * builtin renderer.
 *
 * A `MultiCanvas` consists of one or more `CanvasEntry` instances, depending
 * on the zoom level.
 */
export default class MultiCanvas extends Drawer {
    /**
     * @param {HTMLElement} container The container node of the wavesurfer instance
     * @param {WavesurferParams} params The wavesurfer initialisation options
     */
    constructor(container, params) {
        super(container, params);

        /**
         * @type {number}
         */
        this.maxCanvasWidth = params.maxCanvasWidth;

        /**
         * @type {number}
         */
        this.maxCanvasElementWidth = Math.round(
            params.maxCanvasWidth / params.pixelRatio
        );

        /**
         * Whether or not the progress wave is rendered. If the `waveColor`
         * and `progressColor` are the same color it is not.
         *
         * @type {boolean}
         */
        this.hasProgressCanvas = params.waveColor != params.progressColor;

        /**
         * @type {number}
         */
        this.halfPixel = 0.5 / params.pixelRatio;

        /**
         * List of `CanvasEntry` instances.
         *
         * @type {Array}
         */
        this.canvases = [];

        /**
         * @type {HTMLElement}
         */
        this.progressWave = null;

        /**
         * Class used to generate entries.
         *
         * @type {function}
         */
        this.EntryClass = CanvasEntry;

        /**
         * Canvas 2d context attributes.
         *
         * @type {object}
         */
        this.canvasContextAttributes = params.drawingContextAttributes;

        /**
         * Overlap added between entries to prevent vertical white stripes
         * between `canvas` elements.
         *
         * @type {number}
         */
        this.overlap = 2 * Math.ceil(params.pixelRatio / 2);

        /**
         * The radius of the wave bars. Makes bars rounded
         *
         * @type {number}
         */
        this.barRadius = params.barRadius || 0;

        /**
         * Whether to render the waveform vertically. Defaults to false.
         *
         * @type {boolean}
         */
        this.vertical = params.vertical;

        /**
         * Image generated on first load as a backup for unloaded sections
         *
         * @type {HTMLImageElement}
         */
        this.backupImage = null;
    }

    /**
     * Initialize the drawer
     */
    init() {
        this.createWrapper();
        this.createElements();
    }

    /**
     * Create the canvas elements and style them
     *
     */
    createElements() {
        this.progressWave = util.withOrientation(
            this.wrapper.appendChild(document.createElement('wave')),
            this.params.vertical
        );
        this.style(this.progressWave, {
            position: 'absolute',
            zIndex: 3,
            left: 0,
            top: 0,
            bottom: 0,
            overflow: 'hidden',
            width: '0',
            display: 'none',
            boxSizing: 'border-box',
            borderRightStyle: 'solid',
            pointerEvents: 'none'
        });

        this.addCanvas();
        this.updateCursor();
    }

    /**
     * Update cursor style
     */
    updateCursor() {
        this.style(this.progressWave, {
            borderRightWidth: this.params.cursorWidth + 'px',
            borderRightColor: this.params.cursorColor
        });
    }

    /**
     * Adjust to the updated size by adding or removing canvases
     */
    updateSize() {
        const totalWidth = Math.round(this.width / this.params.pixelRatio);
        const requiredCanvases = Math.ceil(
            totalWidth / (this.maxCanvasElementWidth + this.overlap)
        );

        // add required canvases
        while (this.canvases.length < requiredCanvases) {
            this.addCanvas();
        }

        // remove older existing canvases, if any
        while (this.canvases.length > requiredCanvases) {
            this.removeCanvas();
        }

        let canvasWidth = this.maxCanvasWidth + this.overlap;
        const lastCanvas = this.canvases.length - 1;

        let leftOffset = 0;
        this.canvases.forEach((entry, i) => {
            //Last canvas gets custom width, all others are max
            if (i == lastCanvas) {
                canvasWidth = this.width - this.maxCanvasWidth * lastCanvas;
            }

            //Set left offset and add to next entry
            entry.setLeft(leftOffset);
            leftOffset += canvasWidth / this.params.pixelRatio;

            this.updateDimensions(entry, canvasWidth, this.height);
            entry.clearWave();
        });
    }

    /**
     * Add a canvas to the canvas list
     *
     */
    addCanvas() {
        const entry = new this.EntryClass();
        entry.canvasContextAttributes = this.canvasContextAttributes;
        entry.hasProgressCanvas = this.hasProgressCanvas;
        entry.halfPixel = this.halfPixel;
        const leftOffset = this.maxCanvasElementWidth * this.canvases.length;

        // wave
        let wave = util.withOrientation(
            this.wrapper.appendChild(document.createElement('canvas')),
            this.params.vertical
        );
        this.style(wave, {
            position: 'absolute',
            zIndex: 2,
            left: leftOffset + 'px',
            top: 0,
            bottom: 0,
            height: '100%',
            pointerEvents: 'none'
        });
        entry.initWave(wave);

        // progress
        if (this.hasProgressCanvas) {
            let progress = util.withOrientation(
                this.progressWave.appendChild(document.createElement('canvas')),
                this.params.vertical
            );
            this.style(progress, {
                position: 'absolute',
                left: leftOffset + 'px',
                top: 0,
                bottom: 0,
                height: '100%'
            });
            entry.initProgress(progress);
        }

        this.canvases.push(entry);
    }

    /**
     * Pop single canvas from the list
     *
     */
    removeCanvas() {
        let lastEntry = this.canvases[this.canvases.length - 1];

        // wave
        lastEntry.wave.parentElement.removeChild(lastEntry.wave.domElement);

        // progress
        if (this.hasProgressCanvas) {
            lastEntry.progress.parentElement.removeChild(lastEntry.progress.domElement);
        }

        // cleanup
        if (lastEntry) {
            lastEntry.destroy();
            lastEntry = null;
        }

        this.canvases.pop();
    }

    /**
     * Update the dimensions of a canvas element
     *
     * @param {CanvasEntry} entry Target entry
     * @param {number} width The new width of the element
     * @param {number} height The new height of the element
     */
    updateDimensions(entry, width, height) {
        const elementWidth = Math.round(width / this.params.pixelRatio);
        const totalWidth = Math.round(this.width / this.params.pixelRatio);

        // update canvas dimensions
        entry.updateDimensions(elementWidth, totalWidth, width, height);

        // style element
        this.style(this.progressWave, { display: 'block' });
    }

    /**
     * Clear the whole multi-canvas
     */
    clearWave() {
        util.frame(() => {
            this.canvases.forEach(entry => entry.clearWave());
        })();
    }

    /**
     * Draw a waveform with bars
     *
     * @param {number[]|Number.<Array[]>} peaks Can also be an array of arrays
     * for split channel rendering
     * @param {number} channelIndex The index of the current channel. Normally
     * should be 0. Must be an integer.
     * @param {number} start The x-offset of the beginning of the area that
     * should be rendered
     * @param {number} end The x-offset of the end of the area that should be
     * rendered
     * @returns {void}
     */
    drawBars(peaks, channelIndex, start, end) {
        return this.prepareDraw(
            peaks,
            channelIndex,
            start,
            end,
            ({ absmax, hasMinVals, height, offsetY, halfH, peaks, channelIndex: ch }) => {
                // if drawBars was called within ws.empty we don't pass a start and
                // don't want anything to happen
                if (start === undefined) {
                    return;
                }
                // Skip every other value if there are negatives.
                const peakIndexScale = hasMinVals ? 2 : 1;
                const length = peaks.length / peakIndexScale;
                const bar = this.params.barWidth * this.params.pixelRatio;
                const gap =
                    this.params.barGap === null
                        ? Math.max(this.params.pixelRatio, ~~(bar / 2))
                        : Math.max(
                            this.params.pixelRatio,
                            this.params.barGap * this.params.pixelRatio
                        );
                const step = bar + gap;

                const scale = length / this.width;
                const first = start;
                const last = end;
                let peakIndex = first;
                for (peakIndex; peakIndex < last; peakIndex += step) {

                    // search for the highest peak in the range this bar falls into
                    let peak = 0;
                    let peakIndexRange = Math.floor(peakIndex * scale) * peakIndexScale; // start index
                    const peakIndexEnd = Math.floor((peakIndex + step) * scale) * peakIndexScale;
                    do { // do..while makes sure at least one peak is always evaluated
                        const newPeak = Math.abs(peaks[peakIndexRange]); // for arrays starting with negative values
                        if (newPeak > peak) {
                            peak = newPeak; // higher
                        }
                        peakIndexRange += peakIndexScale; // skip every other value for negatives
                    } while (peakIndexRange < peakIndexEnd);

                    // calculate the height of this bar according to the highest peak found
                    let h = Math.round((peak / absmax) * halfH);

                    // raise the bar height to the specified minimum height
                    // Math.max is used to replace any value smaller than barMinHeight (not just 0) with barMinHeight
                    if (this.params.barMinHeight) {
                        h = Math.max(h, this.params.barMinHeight);
                    }

                    this.fillRect(
                        peakIndex + this.halfPixel,
                        halfH - h + offsetY,
                        bar + this.halfPixel,
                        h * 2,
                        this.barRadius,
                        ch
                    );
                }
            }
        );
    }

    /**
     * Draw a waveform
     *
     * @param {number[]|Number.<Array[]>} peaks Can also be an array of arrays
     * for split channel rendering
     * @param {number} channelIndex The index of the current channel. Normally
     * should be 0
     * @param {number?} start The x-offset of the beginning of the area that
     * should be rendered (If this isn't set only a flat line is rendered)
     * @param {number?} end The x-offset of the end of the area that should be
     * rendered
     * @returns {void}
     */
    drawWave(peaks, channelIndex, start, end) {
        return this.prepareDraw(
            peaks,
            channelIndex,
            start,
            end,
            ({ absmax, hasMinVals, height, offsetY, halfH, peaks, channelIndex }) => {
                if (!hasMinVals) {
                    const reflectedPeaks = [];
                    const len = peaks.length;
                    let i = 0;
                    for (i; i < len; i++) {
                        reflectedPeaks[2 * i] = peaks[i];
                        reflectedPeaks[2 * i + 1] = -peaks[i];
                    }
                    peaks = reflectedPeaks;
                }

                // if drawWave was called within ws.empty we don't pass a start and
                // end and simply want a flat line
                if (start !== undefined) {
                    this.drawLine(peaks, absmax, halfH, offsetY, start, end, channelIndex);
                }

                // always draw a median line
                this.fillRect(
                    0,
                    halfH + offsetY - this.halfPixel,
                    this.width,
                    this.halfPixel,
                    this.barRadius,
                    channelIndex
                );
            }
        );
    }

    /**
     * Tell the canvas entries to render their portion of the waveform
     *
     * @param {number[]} peaks Peaks data
     * @param {number} absmax Maximum peak value (absolute)
     * @param {number} halfH Half the height of the waveform
     * @param {number} offsetY Offset to the top
     * @param {number} start The x-offset of the beginning of the area that
     * should be rendered
     * @param {number} end The x-offset of the end of the area that
     * should be rendered
     * @param {channelIndex} channelIndex The channel index of the line drawn
     */
    drawLine(peaks, absmax, halfH, offsetY, start, end, channelIndex) {
        const { waveColor, progressColor } = this.params.splitChannelsOptions.channelColors[channelIndex] || {};
        this.canvases.forEach((entry, i) => {
            this.setFillStyles(entry, waveColor, progressColor);
            this.applyCanvasTransforms(entry, this.params.vertical);

            let canvasRect = entry.wave.getBoundingClientRect();
            let wrapperRect = this.wrapper.getBoundingClientRect();

            //Determine whether canvas is in viewframe or not and assign priority
            let priority = 0;
            if (Math.floor(canvasRect['left']) > Math.ceil(wrapperRect['right'])) {
                //Canvas is to the right of view window
                let distance = canvasRect['left'] - wrapperRect['right'];
                priority = Math.ceil(distance / wrapperRect['width']);
            } else if (Math.ceil(canvasRect['right']) < Math.floor(wrapperRect['left'])) {
                //Canvas is to the left of the view window
                let distance = wrapperRect['left'] - canvasRect['right'];
                priority = Math.ceil(distance / wrapperRect['width']);
            }

            //This staggers the drawing of canvases so they don't all draw at once
            entry.clearWave();
            clearTimeout(entry.drawTimeout);
            entry.drawTimeout = setTimeout(function(){
                entry.drawLines(peaks, absmax, halfH, offsetY, start, end);
                entry.setBackimage(entry.getImage('image/png', 1, 'dataURL'), entry.getProgressImage('image/png', 1, 'dataURL'));
                entry.drawTimeout = null;
            }, 50 * priority);
        });
    }

    /**
     * Draw a rectangle on the multi-canvas
     *
     * @param {number} x X-position of the rectangle
     * @param {number} y Y-position of the rectangle
     * @param {number} width Width of the rectangle
     * @param {number} height Height of the rectangle
     * @param {number} radius Radius of the rectangle
     * @param {channelIndex} channelIndex The channel index of the bar drawn
     */
    fillRect(x, y, width, height, radius, channelIndex) {
        const startCanvas = Math.floor(x / this.maxCanvasWidth);
        const endCanvas = Math.min(
            Math.ceil((x + width) / this.maxCanvasWidth) + 1,
            this.canvases.length
        );
        let i = startCanvas;
        for (i; i < endCanvas; i++) {
            const entry = this.canvases[i];
            const leftOffset = i * this.maxCanvasWidth;

            const intersection = {
                x1: Math.max(x, i * this.maxCanvasWidth),
                y1: y,
                x2: Math.min(
                    x + width,
                    i * this.maxCanvasWidth + entry.wave.width
                ),
                y2: y + height
            };

            if (intersection.x1 < intersection.x2) {
                const { waveColor, progressColor } = this.params.splitChannelsOptions.channelColors[channelIndex] || {};
                this.setFillStyles(entry, waveColor, progressColor);
                this.applyCanvasTransforms(entry, this.params.vertical);

                entry.fillRects(
                    intersection.x1 - leftOffset,
                    intersection.y1,
                    intersection.x2 - intersection.x1,
                    intersection.y2 - intersection.y1,
                    radius
                );
            }
        }
    }

    /**
     * Returns whether to hide the channel from being drawn based on params.
     *
     * @param {number} channelIndex The index of the current channel.
     * @returns {bool} True to hide the channel, false to draw.
     */
    hideChannel(channelIndex) {
        return this.params.splitChannels && this.params.splitChannelsOptions.filterChannels.includes(channelIndex);
    }

    /**
     * Performs preparation tasks and calculations which are shared by `drawBars`
     * and `drawWave`
     *
     * @param {number[]|Number.<Array[]>} peaks Can also be an array of arrays for
     * split channel rendering
     * @param {number} channelIndex The index of the current channel. Normally
     * should be 0
     * @param {number?} start The x-offset of the beginning of the area that
     * should be rendered. If this isn't set only a flat line is rendered
     * @param {number?} end The x-offset of the end of the area that should be
     * rendered
     * @param {function} fn The render function to call, e.g. `drawWave`
     * @param {number} drawIndex The index of the current channel after filtering.
     * @param {number?} normalizedMax Maximum modulation value across channels for use with relativeNormalization. Ignored when undefined
     * @returns {void}
     */
    prepareDraw(peaks, channelIndex, start, end, fn, drawIndex, normalizedMax) {
        return util.frame(() => {
            // Split channels and call this function with the channelIndex set
            if (peaks[0] instanceof Array) {
                const channels = peaks;

                if (this.params.splitChannels) {
                    const filteredChannels = channels.filter((c, i) => !this.hideChannel(i));
                    if (!this.params.splitChannelsOptions.overlay) {
                        this.setHeight(
                            Math.max(filteredChannels.length, 1) *
                                this.params.height *
                                this.params.pixelRatio
                        );
                    }

                    let overallAbsMax;
                    if (this.params.splitChannelsOptions && this.params.splitChannelsOptions.relativeNormalization) {
                        // calculate maximum peak across channels to use for normalization
                        overallAbsMax = util.max(channels.map((channelPeaks => util.absMax(channelPeaks))));
                    }


                    return channels.forEach((channelPeaks, i) =>
                        this.prepareDraw(channelPeaks, i, start, end, fn, filteredChannels.indexOf(channelPeaks), overallAbsMax)
                    );
                }
                peaks = channels[0];
            }

            // Return and do not draw channel peaks if hidden.
            if (this.hideChannel(channelIndex)) {
                return;
            }

            // calculate maximum modulation value, either from the barHeight
            // parameter or if normalize=true from the largest value in the peak
            // set
            let absmax = 1 / this.params.barHeight;
            if (this.params.normalize) {
                absmax = normalizedMax === undefined ? util.absMax(peaks) : normalizedMax;
            }

            // Bar wave draws the bottom only as a reflection of the top,
            // so we don't need negative values
            const hasMinVals = [].some.call(peaks, val => val < 0);
            const height = this.params.height * this.params.pixelRatio;
            const halfH = height / 2;

            let offsetY = height * drawIndex || 0;

            // Override offsetY if overlay is true
            if (this.params.splitChannelsOptions && this.params.splitChannelsOptions.overlay) {
                offsetY = 0;
            }

            return fn({
                absmax: absmax,
                hasMinVals: hasMinVals,
                height: height,
                offsetY: offsetY,
                halfH: halfH,
                peaks: peaks,
                channelIndex: channelIndex
            });
        })();
    }

    /**
     * Set the fill styles for a certain entry (wave and progress)
     *
     * @param {CanvasEntry} entry Target entry
     * @param {string} waveColor Wave color to draw this entry
     * @param {string} progressColor Progress color to draw this entry
     */
    setFillStyles(entry, waveColor = this.params.waveColor, progressColor = this.params.progressColor) {
        entry.setFillStyles(waveColor, progressColor);
    }

    /**
     * Set the canvas transforms for a certain entry (wave and progress)
     *
     * @param {CanvasEntry} entry Target entry
     * @param {boolean} vertical Whether to render the waveform vertically
     */
    applyCanvasTransforms(entry, vertical = false) {
        entry.applyCanvasTransforms(vertical);
    }

    /**
     * Return image data of the multi-canvas
     *
     * When using a `type` of `'blob'`, this will return a `Promise`.
     *
     * @param {string} format='image/png' An optional value of a format type.
     * @param {number} quality=0.92 An optional value between 0 and 1.
     * @param {string} type='dataURL' Either 'dataURL' or 'blob'.
     * @return {string|string[]|Promise} When using the default `'dataURL'`
     * `type` this returns a single data URL or an array of data URLs,
     * one for each canvas. When using the `'blob'` `type` this returns a
     * `Promise` that resolves with an array of `Blob` instances, one for each
     * canvas.
     */
    getImage(format, quality, type) {
        if (type === 'blob') {
            return Promise.all(
                this.canvases.map(entry => {
                    return entry.getImage(format, quality, type);
                })
            );
        } else if (type === 'dataURL') {
            let images = this.canvases.map(entry =>
                entry.getImage(format, quality, type)
            );
            return images.length > 1 ? images : images[0];
        }
    }

    /**
     * Stretches the backimage to mimic zoom without calculation
     *
     * @param {Number} desiredWidth width of new wave
     * @param {Number} progress Value between 0 and 1 for wave progress
     */
    stretchBackimage(desiredWidth, progress) {
        let totalCanvasWidth = Math.round(desiredWidth / this.params.pixelRatio);
        let progressPos = progress * totalCanvasWidth;
        this.width = desiredWidth;

        let view = [Math.max(progressPos - this.wrapper.clientWidth, 0), progressPos + this.wrapper.clientWidth];

        //Start tracks the starting point of each canvas
        let start = 0;
        this.canvases.forEach((entry, i) => {
            clearTimeout(entry.drawTimeout);
            start = entry.stretchBackimage(start, totalCanvasWidth, this.params.pixelRatio, view, this.backupImage);
        });
        //Update progress
        this.updateProgress(progressPos);
        this.recenterOnPosition(progressPos, true);
    }

    /**
     * Render the new progress
     *
     * @param {number} position X-offset of progress position in pixels
     */
    updateProgress(position) {
        this.style(this.progressWave, { width: position + 'px' });
    }

    /**
     * Called at startup to set backup image once all images have loaded
     */
    setBackupImage() {
        //Check image doesn't already exist
        if (this.backupImage !== null) {return;}

        //Check drawer is not in progress
        let ready = true;
        this.canvases.forEach((entry, i) => {
            if (entry.drawn == false) {
                ready = false;
            }
        });
        if (ready == false || this.canvases.length < 1) {
            //Wait 100ms and come back
            setTimeout(() => this.setBackupImage(), 100);
            return;
        } else {
            //Make sure to get valid dataURL for all images
            let dataURLS = [];
            for (let i = 0; i < this.canvases.length; i++) {
                dataURLS[i] = this.canvases[i].getImage('image/png', 1, 'dataURL');
                if (dataURLS[i] == "") {
                    setTimeout(() => this.setBackupImage(), 100);
                    return;
                }
            }
            //Create images from URLS
            this.backupImage = [];
            for (let i = 0; i < dataURLS.length; i++) {
                this.backupImage[i] = document.createElement('img');
                this.backupImage[i].src = dataURLS[i];
            }

        }
    }
}
