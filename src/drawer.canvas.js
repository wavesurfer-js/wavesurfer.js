'use strict';

WaveSurfer.Drawer.Canvas = Object.create(WaveSurfer.Drawer);

WaveSurfer.util.extend(WaveSurfer.Drawer.Canvas, {
    createElements: function () {
        var waveCanvas = this.wrapper.appendChild(
            this.style(document.createElement('canvas'), {
                position: 'absolute',
                zIndex: 1
            })
        );
        this.waveCc = waveCanvas.getContext('2d');

        this.progressWave = this.wrapper.appendChild(
            this.style(document.createElement('wave'), {
                position: 'absolute',
                zIndex: 2,
                overflow: 'hidden',
                width: '0',
                height: this.params.height + 'px',
                borderRightStyle: 'solid',
                borderRightWidth: this.params.cursorWidth + 'px',
                borderRightColor: this.params.cursorColor
            })
        );

        if (this.params.waveColor != this.params.progressColor) {
            var progressCanvas = this.progressWave.appendChild(
                document.createElement('canvas')
            );
            this.progressCc = progressCanvas.getContext('2d');
        }
    },

    updateWidth: function () {
        var width = Math.round(this.width / this.params.pixelRatio);

        this.waveCc.canvas.width = this.width;
        this.waveCc.canvas.height = this.height;
        this.style(this.waveCc.canvas, { width: width + 'px'});

        if (this.progressCc) {
            this.progressCc.canvas.width = this.width;
            this.progressCc.canvas.height = this.height;
            this.style(this.progressCc.canvas, { width: width + 'px'});
        }

        this.clearWave();
    },
    
    updateWidthnHeight: function () {
        var width = Math.round(this.width / this.params.pixelRatio);
        var height = this.height;

        this.waveCc.canvas.width = this.width;
        this.waveCc.canvas.height = this.height;
        this.style(this.waveCc.canvas, { width: width + 'px'});
        this.style(this.waveCc.canvas, { height: height + 'px'});

        if (this.progressCc) {
            this.progressCc.canvas.width = this.width;
	    this.progressCc.canvas.height = this.height;
            this.style(this.progressCc.canvas, { width: width + 'px'});
            this.style(this.progressCc.canvas.parentElement, { height: height + 'px'});
        }

        this.clearWave();
    },

    clearWave: function () {
        this.waveCc.clearRect(0, 0, this.width, this.height);
        if (this.progressCc) {
            this.progressCc.clearRect(0, 0, this.width, this.height);
        }
    },

    drawWave: function (peaks, max) {
        // A half-pixel offset makes lines crisp
        var $ = 0.5 / this.params.pixelRatio;

        var halfH = this.height / 2;
        var coef = halfH / max;
        var length = peaks.length;
        var scale = 1;
        if (this.params.fillParent && this.width != length) {
            scale = this.width / length;
        }

        this.waveCc.fillStyle = this.params.waveColor;
        if (this.progressCc) {
            this.progressCc.fillStyle = this.params.progressColor;
        }

        [ this.waveCc, this.progressCc ].forEach(function (cc) {
            if (!cc) { return; }

            cc.beginPath();
            cc.moveTo($, halfH);

            for (var i = 0; i < length; i++) {
                var h = Math.round(peaks[i] * coef);
                cc.lineTo(i * scale + $, halfH + h);
            }

            cc.lineTo(this.width + $, halfH);
            cc.moveTo($, halfH);

            for (var i = 0; i < length; i++) {
                var h = Math.round(peaks[i] * coef);
                cc.lineTo(i * scale + $, halfH - h);
            }

            cc.lineTo(this.width + $, halfH);
            cc.fill();

            // Always draw a median line
            cc.fillRect(0, halfH - $, this.width, $);
        }, this);
    },

    drawWaveMainWaveform: function (peaks, length, max) {
    // A half-pixel offset makes lines crisp
    var $ = 0.5 / this.params.pixelRatio;

    var vscale = 0.95; // scaled values of height of waveform
    var totalChannels = Math.round(peaks.length/length);

    var heightChannel = this.height / totalChannels;
    var midLength = heightChannel / 2;
    for (var n = 0; n < totalChannels; n++)
	{
	    var midpoint = n*heightChannel + midLength;
	    var coef = midLength / max;
			
	    var scale = 1;
            if (this.params.fillParent && this.width != length) {
            	scale = this.width / length;
            }
        	
            this.waveCc.fillStyle = this.params.waveColor;
            if (this.progressCc) {
            	this.progressCc.fillStyle = this.params.progressColor;
            }
        	
            [ this.waveCc, this.progressCc ].forEach(function (cc) {
		if (!cc) { return; }

		// Draw the channel separator line
		cc.fillRect(0, (n*heightChannel) - $, this.width, $);
				
		// Always draw a median line
		cc.fillRect(0, midpoint - $, this.width, $);

		cc.beginPath();
		cc.moveTo($, midpoint);

		for (var i = n*length; i < (n+1)*length; i++) {
		    var h = Math.round(peaks[i] * coef);
		    cc.lineTo((i-(n*length)) * scale + $, midpoint + (vscale * h));
		}

		cc.lineTo(this.width + $, midpoint);
		cc.moveTo($, midpoint);

		for (var i = n*length; i < (n+1)*length; i++) {
		    var h = Math.round(peaks[i] * coef);
		    cc.lineTo((i-(n*length)) * scale + $, midpoint - (vscale * h));
		}

		cc.lineTo(this.width + $, midpoint);
		cc.fill();
            }, this);	
	}
    },

    updateProgress: function (progress) {
        var pos = Math.round(
            this.width * progress
        ) / this.params.pixelRatio;
        this.style(this.progressWave, { width: pos + 'px' });
    }
});
