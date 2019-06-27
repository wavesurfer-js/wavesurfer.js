/* eslint-env jasmine */

import WaveSurfer from '../src/wavesurfer.js';

import TestHelpers from './test-helpers.js';

/** @test {util.ajax} */
describe('util.ajax:', function() {
    var defaultUrl = TestHelpers.EXAMPLE_FILE_PATH;

    it('can load an arraybuffer', function(done) {
        var options = {
            url: defaultUrl,
            responseType: 'arraybuffer'
        };
        var instance = WaveSurfer.util.ajax(options);
        instance.on('success', (data, e) => {
            // url
            expect(e.target.responseURL).toContain(options.url);

            // responseType
            expect(instance.xhr.responseType).toBe(options.responseType);

            // returned data is an arraybuffer
            expect(data).toEqual(jasmine.any(ArrayBuffer));

            done();
        });
    });

    it('fires the error event when the file is not found', function(done) {
        var options = {
            url: '/foo/bar'
        };
        var instance = WaveSurfer.util.ajax(options);
        instance.on('error', e => {
            // url
            expect(e.target.responseURL).toContain(options.url);

            // error message
            expect(e.target.statusText).toBe('Not Found');
            expect(e.target.status).toBe(404);

            done();
        });
    });

    it('fires the progress event during loading', function(done) {
        var options = {
            url: defaultUrl,
            responseType: 'arraybuffer'
        };
        var instance = WaveSurfer.util.ajax(options);
        instance.on('progress', e => {
            // url
            expect(e.target.responseURL).toContain(options.url);

            // progress message
            expect(e.target.statusText).toBe('OK');
            expect(e.target.status).toBe(200);

            done();
        });
    });

    it('accepts custom request headers and credentials', function(done) {
        var options = {
            url: defaultUrl,
            responseType: 'arraybuffer',
            xhr: {
                withCredentials: true,
                requestHeaders: [
                    {
                        key: 'Authorization',
                        value: 'my-token'
                    }
                ]
            }
        };
        var instance = WaveSurfer.util.ajax(options);
        instance.on('success', (data, e) => {
            // with credentials
            expect(e.target.withCredentials).toBeTrue();

            // XXX: find a way to retrieve request headers
            done();
        });
    });
});

/** @test {util.fetchFile} */
describe('util.fetchFile:', function() {
    const audioExampleUrl = TestHelpers.EXAMPLE_FILE_PATH;

    it('load ArrayBuffer response', function(done) {
        let options = {
            url: audioExampleUrl,
            responseType: 'arraybuffer'
        };
        let instance = WaveSurfer.util.fetchFile(options);
        instance.on('success', data => {
            expect(instance.response.status).toEqual(200);

            // options
            expect(instance.fetchRequest.url).toEndWith(options.url);
            expect(instance.fetchRequest.cache).toEqual('default');
            expect(instance.fetchRequest.credentials).toEqual('same-origin');
            expect(instance.fetchRequest.method).toEqual('GET');
            expect(instance.fetchRequest.mode).toEqual('cors');

            // returned data is an arraybuffer
            expect(data).toEqual(jasmine.any(ArrayBuffer));

            done();
        });
    });

    it('load Blob response', function(done) {
        let options = {
            url: audioExampleUrl,
            responseType: 'blob'
        };
        let instance = WaveSurfer.util.fetchFile(options);
        instance.on('success', data => {
            expect(instance.response.status).toEqual(200);

            // returned data is a Blob
            expect(data).toEqual(jasmine.any(Blob));

            done();
        });
    });

    it('load JSON response', function(done) {
        let options = {
            url: '/base/spec/support/test.json',
            responseType: 'json'
        };
        let instance = WaveSurfer.util.fetchFile(options);
        instance.on('success', data => {
            expect(instance.response.status).toEqual(200);

            // returned data is an array
            expect(data).toEqual([[0, 1, 2, 3]]);

            done();
        });
    });

    it('load text response', function(done) {
        let options = {
            url: '/base/spec/support/test.txt',
            responseType: 'text'
        };
        let instance = WaveSurfer.util.fetchFile(options);
        instance.on('success', data => {
            expect(instance.response.status).toEqual(200);

            // returned data is a string
            expect(data).toEqual('hello world');

            done();
        });
    });

    it('load unknown reponse type', function(done) {
        let options = {
            url: audioExampleUrl,
            responseType: 'fooBar'
        };
        let instance = WaveSurfer.util.fetchFile(options);
        instance.on('error', error => {
            expect(error).toEqual(
                'Unknown responseType: ' + options.responseType
            );

            done();
        });
    });

    it('fires error event when the file is not found', function(done) {
        let options = {
            url: '/foo/bar'
        };
        let instance = WaveSurfer.util.fetchFile(options);
        instance.on('error', error => {
            expect(instance.response.status).toEqual(404);
            expect(error).toEqual('HTTP error status: 404');

            done();
        });
    });

    it('accepts custom request headers', function(done) {
        let options = {
            url: '/base/spec/support/test.txt',
            responseType: 'text',
            requestHeaders: [
                {
                    key: 'Content-Type',
                    value: 'text/plain'
                }
            ]
        };
        let instance = WaveSurfer.util.fetchFile(options);
        instance.on('success', data => {
            expect(instance.response.headers.has('Content-Type')).toBeTrue();
            expect(instance.response.headers.get('Content-Type')).toEqual(
                'text/plain'
            );

            done();
        });
    });
});

/** @test {util} */
describe('util:', function() {
    /** @test {extend} */
    it('extend extends an object shallowly with others', function() {
        var obj = {
            style: {}
        };
        var sources = {
            prop1: 'red',
            prop2: 123
        };
        var result = {
            style: {},
            prop1: 'red',
            prop2: 123
        };
        expect(WaveSurfer.util.extend(obj, sources)).toEqual(result);
    });

    /** @test {getId} */
    it('getId returns a random string with a default prefix', function() {
        const prefix = 'wavesurfer_';
        expect(WaveSurfer.util.getId()).toStartWith(prefix);
    });

    /** @test {getId} */
    it('getId returns a random string with a custom prefix', function() {
        const prefix = 'test-';
        expect(WaveSurfer.util.getId(prefix)).toStartWith(prefix);
    });

    /** @test {min} */
    it('min returns the smallest number in the provided array', function() {
        expect(WaveSurfer.util.min([0, 1, 1.1, 100, -1])).toEqual(-1);
    });

    /** @test {min} */
    it('min returns +Infinity for an empty array', function() {
        expect(WaveSurfer.util.min([])).toEqual(+Infinity);
    });

    /** @test {max} */
    it('max returns the largest number in the provided array', function() {
        expect(WaveSurfer.util.max([0, 1, 1.1, 100, -1])).toEqual(100);
    });

    /** @test {max} */
    it('max returns -Infinity for an empty array', function() {
        expect(WaveSurfer.util.max([])).toEqual(-Infinity);
    });

    /** @test {style} */
    it('style applies a map of styles to an element', function() {
        var el = {
            style: {}
        };
        var styles = {
            backgroundcolor: 'red',
            'background-color': 'blue'
        };
        var result = {
            style: styles
        };
        expect(WaveSurfer.util.style(el, styles)).toEqual(result);
    });
});
