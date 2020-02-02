/**
 * a GIF decoder, support stream-like decoding
 * folk from omggif
 */

import { IFrameInfo } from '../types';
import { unpackLZW } from './lzw';

class Decoder {
    private pos: number;
    private globalPaletteOffset: number;
    private globalPaletteSize: number;
    private eof: boolean;
    private delay: number;
    private transparentIndex: number;
    private disposal: number;
    private loopCount: number;
    private width: number;
    private height: number;
    private frames: Array<IFrameInfo>;
    private lastCorrectPos: number;

    public lastError: Error;

    constructor(buf: Uint8Array) {
        this.init(buf);
    }

    private init(buf: Uint8Array): void {
        this.pos = 0;
        let p: number = this.pos;

        if (
            buf[p++] !== 0x47
            || buf[p++] !== 0x49
            || buf[p++] !== 0x46
            || buf[p++] !== 0x38
            || (buf[p++] + 1 & 0xfd) !== 0x38
            || buf[p++] !== 0x61
        ) {
            throw new Error('Invalid GIF 87a/89a header.');
        }

        const width: number = buf[p++] | buf[p++] << 8;
        const height: number = buf[p++] | buf[p++] << 8;
        const pf0: number = buf[p++];
        const globalPaletteFlag: number = pf0 >> 7;
        const numGlobalColorsPow2: number = pf0 & 0x7;
        const numGlobalColors: number = 1 << (numGlobalColorsPow2 + 1);
        /* eslint-disable @typescript-eslint/no-unused-vars */
        const background: number = buf[p++];
        /* eslint-enable @typescript-eslint/no-unused-vars */
        buf[p++];

        this.globalPaletteOffset = null;
        this.globalPaletteSize = null;

        if (globalPaletteFlag) {
            this.globalPaletteOffset = p;
            this.globalPaletteSize = numGlobalColors;
            p += numGlobalColors * 3;
        }

        this.eof = false;

        this.frames = [];

        this.delay = 0;
        this.transparentIndex = null;
        this.disposal = 0;
        this.loopCount = null;

        this.width = width;
        this.height = height;

        this.pos = p;
    }

    decodeMetaAndFrameInfo(buf: Uint8Array, frameIdx: number): boolean {
        let p: number = this.pos;
        this.lastCorrectPos = p;
        try {
            while (!this.eof && p < buf.length) {
                switch (buf[p++]) {
                    case 0x21:
                        switch (buf[p++]) {
                            case 0xff:
                                if (buf[p] !== 0x0b
                                    || buf[p + 1] === 0x4e
                                    && buf[p + 2] === 0x45
                                    && buf[p + 3] === 0x54
                                    && buf[p + 4] === 0x53
                                    && buf[p + 5] === 0x43
                                    && buf[p + 6] === 0x41
                                    && buf[p + 7] === 0x50
                                    && buf[p + 8] === 0x45
                                    && buf[p + 9] === 0x32
                                    && buf[p + 10] === 0x2e
                                    && buf[p + 11] === 0x30
                                    && buf[p + 12] === 0x03
                                    && buf[p + 13] === 0x01
                                    && buf[p + 16] === 0
                                ) {
                                    p += 14;
                                    this.loopCount = buf[p++] | buf[p++] << 8;
                                    p++;
                                }
                                else {
                                    p += 12;
                                    while (true) {
                                        const blockSize: number = buf[p++];
                                        if (!(blockSize >= 0)) {
                                            throw Error('Invalid block size');
                                        }
                                        if (blockSize === 0) {
                                            break;
                                        }
                                        p += blockSize;
                                    }
                                }
                                this.lastCorrectPos = p;
                                break;

                            case 0xf9:
                                if (buf[p++] !== 0x4 || buf[p + 4] !== 0) {
                                    throw new Error('Invalid graphics extension block.');
                                }
                                const pf1: number = buf[p++];
                                this.delay = buf[p++] | buf[p++] << 8;
                                this.transparentIndex = buf[p++];
                                if ((pf1 & 1) === 0) {
                                    this.transparentIndex = null;
                                }
                                this.disposal = pf1 >> 2 & 0x7;
                                p++;
                                this.lastCorrectPos = p;
                                break;

                            case 0x01:
                            case 0xfe:
                                while (true) {
                                    const blockSize: number = buf[p++];
                                    if (!(blockSize >= 0)) {
                                        throw Error('Invalid block size');
                                    }
                                    if (blockSize === 0) {
                                        break;
                                    }
                                    p += blockSize;
                                }
                                this.lastCorrectPos = p;
                                break;

                            default:
                                throw new Error('Unknown graphic control label: 0x' + buf[p - 1].toString(16));
                        }
                        this.lastCorrectPos = p;
                        break;

                    case 0x2c:
                        const x: number = buf[p++] | buf[p++] << 8;
                        const y: number = buf[p++] | buf[p++] << 8;
                        const w: number = buf[p++] | buf[p++] << 8;
                        const h: number = buf[p++] | buf[p++] << 8;
                        const pf2: number = buf[p++];
                        const localPaletteFlag: number = pf2 >> 7;
                        const interlaceFlag: number = pf2 >> 6 & 1;
                        const numLocalColorsPow2: number = pf2 & 0x7;
                        const numLocalColors: number = 1 << (numLocalColorsPow2 + 1);
                        let paletteOffset: number = this.globalPaletteOffset;
                        let paletteSize: number = this.globalPaletteSize;
                        let hasLocalPalette: boolean = false;
                        if (localPaletteFlag) {
                            hasLocalPalette = true;
                            paletteOffset = p;
                            paletteSize = numLocalColors;
                            p += numLocalColors * 3;
                        }

                        const dataOffset: number = p;

                        p++;
                        while (true) {
                            const blockSize: number = buf[p++];
                            if (!(blockSize >= 0)) {
                                throw Error('Invalid block size');
                            }
                            if (blockSize === 0) {
                                this.lastCorrectPos = p;
                                break;
                            }
                            p += blockSize;
                        }

                        const frameInfo: IFrameInfo = {
                            x: x,
                            y: y,
                            width: w,
                            height: h,
                            hasLocalPalette: hasLocalPalette,
                            paletteOffset: paletteOffset,
                            paletteSize: paletteSize,
                            dataOffset: dataOffset,
                            dataLength: p - dataOffset,
                            transparentIndex: this.transparentIndex,
                            interlaced: !!interlaceFlag,
                            delay: this.delay,
                            disposal: this.disposal
                        };

                        this.frames.push(frameInfo);
                        this.lastCorrectPos = p;
                        if (this.frames.length > frameIdx) {
                            return true;
                        }
                        break;

                    case 0x3b:
                        this.eof = true;
                        this.lastCorrectPos = p;
                        break;

                    default:
                        throw new Error('Unknown gif block: 0x' + buf[p - 1].toString(16));
                }
            }
            this.pos = p;
            return true;
        }
        catch (e) {
            this.lastError = e;
            this.pos = this.lastCorrectPos;
            return false;
        }
    }

    getFramesNum(): number {
        return this.frames.length;
    }

    getFrameInfo(idx: number): IFrameInfo {
        const frames = this.frames;
        if (idx < 0 || idx >= frames.length) {
            throw new Error('Frame index out of range.');
        }
        return frames[idx];
    }

    decodeFrameRGBA(idx: number, buf: Uint8Array): Array<number> {
        const pixels: Array<number> = [];
        try {

            const frame: IFrameInfo = this.getFrameInfo(idx);
            const numPixels = frame.width * frame.height;
            const unpackInfo = unpackLZW(buf, frame.dataOffset, numPixels);
            if (!unpackInfo.ok) {
                throw Error(unpackInfo.msg)
            }
            const indexStream: Uint8Array = unpackInfo.output;

            const paletteOffset: number = frame.paletteOffset;
            let trans: number = frame.transparentIndex;
            if (trans === null) {
                trans = 256;
            }

            const width: number = this.width;
            const frameWidth: number = frame.width;
            const frameStride: number = width - frameWidth;
            let xLeft: number = frameWidth;

            const opBegin: number = ((frame.y * width) + frame.x) * 4;
            const opEnd: number = ((frame.y + frame.height) * width + frame.x) * 4;
            let op: number = opBegin;

            let scanStride: number = frameStride * 4;

            if (frame.interlaced === true) {
                scanStride += width * 4 * 7;
            }

            let interlaceSkip: number = 8;

            for (let i = 0, il = indexStream.length; i < il; ++i) {
                const index: number = indexStream[i];

                if (xLeft === 0) {
                    op += scanStride;
                    xLeft = frameWidth;
                    if (op >= opEnd) {
                        scanStride = frameStride * 4 + width * 4 * (interlaceSkip - 1);
                        op = opBegin + (frameWidth + frameStride) * (interlaceSkip << 1);
                        interlaceSkip >>= 1;
                    }
                }

                if (index === trans) {
                    op += 4;
                }
                else {
                    const r: number = buf[paletteOffset + index * 3];
                    const g: number = buf[paletteOffset + index * 3 + 1];
                    const b: number = buf[paletteOffset + index * 3 + 2];
                    pixels[op++] = r;
                    pixels[op++] = g;
                    pixels[op++] = b;
                    pixels[op++] = 255;
                }
                --xLeft;
            }
            return pixels;
        }
        catch (e) {
            return null;
        }
    };
}

export default Decoder;