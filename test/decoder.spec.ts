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

    it('should init when buffers from true GIF', () => {
        const init = () => new Decoder(buffer);
        expect(init).not.to.throw();
    });

    it('should throw an error when decoder none GIF', () => {
        const buf = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==', 'base64');
        const init = () => new Decoder(buf);
        expect(init).to.throw('Invalid GIF 87a/89a header.');
    });

    it('should throw correct error when decode a broken GIF', () => {
        const buf: Buffer = Buffer.from([
            0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x02, 0x00, 0x02, 0x00, 0xf0, 0x00, 0x00, 0xff, 0x00, 0x00,
            0x20, 0xdf, 0x00, 0x21, 0xf9, 0x04, 0x00, 0x32, 0x00, 0x00, 0x00, 0x21, 0xff, 0x0b, 0x4e, 0x45,
            0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2e, 0x30, 0x03, 0x01, 0x00, 0x00, 0x00, 0x2c, 0x00
        ]);
        const d: Decoder = new Decoder(buf);
        d.lastError = null;
        d.decodeMetaAndFrameInfo(buf.slice(1, buffer.length), 0);
        expect(d.lastError.message).to.include('Unknown gif block');
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

        it('should not throw an error when bytes are broken', () => {
            const genBreak = (list: Array<Array<number>> = []): Array<Function> => {
                return list.map(item => () => {
                    const buf = buffer = Buffer.from(BASE64, 'base64');
                    buf[item[0]] = item[1];
                    const decoder = new Decoder(buf.slice(0, 40));
                    decoder.decodeMetaAndFrameInfo(buf.slice(0, 50), 0);
                });
            };
            genBreak([[28, 0xfe], [28, 0x01], [28, 0xaa], [40, 0x00]])
                .forEach(fn => expect(fn).to.not.throw())
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

            const realRGBA: Array<number[]> = new Array(100);
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