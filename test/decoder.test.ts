import { expect } from 'chai';
import Decoder from '../src/decoder';
import fs from 'fs-extra';
import path from 'path';
import flattenDeep from 'lodash.flattendeep';

const BASE64 = 'R0lGODlhAgACAPAAAP8AACDfACH5BAAyAAAAIf8LTkVUU0NBUEUyLjADAQAAACwAAAAAAgACAAACAgxcACH5BAAyAAAALAAAAAACAAIAAAICRFwAOw==';

describe('Decoder', () => {

    let buffer: Buffer;

    beforeEach(() => {
        buffer = Buffer.from(BASE64, 'base64');
    });

    it('should init when buffers from true gif', () => {
        const init = () => new Decoder(buffer);
        expect(init).not.to.throw();
    });

    it('should throw an error when decoder none gif', () => {
        const buf = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==', 'base64');
        const init = () => new Decoder(buf);
        expect(init).to.throw('Invalid GIF 87a/89a header.');
    });

    it('should decode frames\' information correctly', () => {
        const decoder = new Decoder(buffer);
        const completed = decoder.decodeMetaAndFrameInfo(buffer, 0);
        expect(completed, 'decoding for frames should complete').to.be.true;

        const frame = decoder.getFrameInfo(0);
        expect(frame).to.be.deep.equal({
            x: 0,
            y: 0,
            width: 2,
            height: 2,
            hasLocalPalette: false,
            paletteOffset: 13,
            paletteSize: 2,
            dataOffset: 56,
            dataLength: 5,
            transparentIndex: null,
            interlaced: false,
            delay: 50,
            disposal: 0
        }, 'frame information is wrong');
    });

    it('should only decode as less frames as necessary', () => {
        const decoder = new Decoder(buffer);
        decoder.decodeMetaAndFrameInfo(buffer, 0);
        expect(decoder.getFramesNum()).to.be.equal(1, 'it should only decode one frame');
    });

    it('should decode correctly even though \'frameIdx\' argument is larger than then biggest index', () => {
        const decoder = new Decoder(buffer);
        decoder.decodeMetaAndFrameInfo(buffer, 10e10);
        expect(decoder.getFramesNum()).to.be.equal(2, 'there should be two frames');
    });

    it('should decode correctly when chunks are divided and input many times', () => {
        const decoder = new Decoder(buffer.slice(0, 40));
        const decodeFrame = (end: number): boolean => decoder.decodeMetaAndFrameInfo(buffer.slice(0, end), 0);

        expect(decodeFrame(50), '50 bytes are not enough').to.be.false;
        expect(decoder.getFramesNum()).to.be.equal(0);
        expect(decodeFrame(60), '60 bytes are not enough').to.be.false;
        expect(decoder.getFramesNum()).to.be.equal(0);

        expect(decodeFrame(70), '70 bytes are enough').to.be.true;
        expect(buffer).length.greaterThan(70, 'amount of total bytes is more than 70');
    });

    describe('Decode RGBA pixels', () => {
        it('should be correct when all bytes are input', () => {
            const decoder = new Decoder(buffer);
            decoder.decodeMetaAndFrameInfo(buffer, 0);
    
            const pixels = decoder.decodeFrameRGBA(0, buffer.slice(0, 70));
            expect(pixels).to.be.deep.equal([
                32, 223, 0, 255,
                255, 0, 0, 255,
                32, 223, 0, 255,
                255, 0, 0, 255
            ]);
        });
    
        it('should be correctly when chunks are divided and input many times', () => {
            const decoder = new Decoder(buffer.slice(0, 40));
            decoder.decodeMetaAndFrameInfo(buffer.slice(0, 50), 0);
            decoder.decodeMetaAndFrameInfo(buffer.slice(0, 60), 0);
            decoder.decodeMetaAndFrameInfo(buffer.slice(0, 70), 0);
    
            const pixels = decoder.decodeFrameRGBA(0, buffer.slice(0, 70));
            expect(pixels).to.be.deep.equal([
                32, 223, 0, 255,
                255, 0, 0, 255,
                32, 223, 0, 255,
                255, 0, 0, 255
            ]);
        });

        it('should be correctly from a GIF file', async () => {
            let offset = 40;
            const buf = fs.readFileSync(path.resolve(__dirname, 'img', '1.gif'));
            const decoder = new Decoder(buf.slice(0, offset));
            while (!decoder.decodeMetaAndFrameInfo(buf.slice(0, offset), 0)) {
                offset += 10;
            }

            let pixels: Array<number> = null;
            while (!(pixels = decoder.decodeFrameRGBA(0, buf.slice(0, offset)))) {
                offset += 10;
            }

            let realRGBA: Array<number[]> = new Array(100);
            // the same as ./img/1-1.png
            for (let i = 0; i < 20; i++) {
                realRGBA[i] = [255, 0, 0, 255];
                realRGBA[i + 20] = [255, 0, 255, 255];
                realRGBA[i + 40] = [0, 100, 255, 255];
                realRGBA[i + 60] = [0, 255, 0, 255];
                realRGBA[i + 80] = [255, 0, 0, 255];
            }
            const realPixels: Array<number> = flattenDeep(realRGBA);
            expect(pixels).to.be.deep.equal(realPixels);
        });
    });
});