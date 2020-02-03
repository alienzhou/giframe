/**
 * a GIF decoder, support stream-like decoding
 * folk from omggif
 */
import { IFrameInfo } from '../types';
import { unpackLZW } from './lzw';
import get from '../utils/proxy';

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
            get(p++, buf) !== 0x47
            || get(p++, buf) !== 0x49
            || get(p++, buf) !== 0x46
            || get(p++, buf) !== 0x38
            || (get(p++, buf) + 1 & 0xfd) !== 0x38
            || get(p++, buf) !== 0x61
        ) {
            throw new Error('Invalid GIF 87a/89a header.');
        }

        const width: number = get(p++, buf) | get(p++, buf) << 8;
        const height: number = get(p++, buf) | get(p++, buf) << 8;
        const pf0: number = get(p++, buf);
        const globalPaletteFlag: number = pf0 >> 7;
        const numGlobalColorsPow2: number = pf0 & 0x7;
        const numGlobalColors: number = 1 << (numGlobalColorsPow2 + 1);
        /* eslint-disable @typescript-eslint/no-unused-vars */
        const background: number = get(p++, buf);
        /* eslint-enable @typescript-eslint/no-unused-vars */
        get(p++, buf);

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
                switch (get(p++, buf)) {
                    case 0x21:
                        switch (get(p++, buf)) {
                            case 0xff:
                                if (get(p, buf) !== 0x0b
                                    || get(p + 1, buf) === 0x4e
                                    && get(p + 2, buf) === 0x45
                                    && get(p + 3, buf) === 0x54
                                    && get(p + 4, buf) === 0x53
                                    && get(p + 5, buf) === 0x43
                                    && get(p + 6, buf) === 0x41
                                    && get(p + 7, buf) === 0x50
                                    && get(p + 8, buf) === 0x45
                                    && get(p + 9, buf) === 0x32
                                    && get(p + 10, buf) === 0x2e
                                    && get(p + 11, buf) === 0x30
                                    && get(p + 12, buf) === 0x03
                                    && get(p + 13, buf) === 0x01
                                    && get(p + 16, buf) === 0
                                ) {
                                    p += 14;
                                    this.loopCount = get(p++, buf) | get(p++, buf) << 8;
                                    p++;
                                }
                                else {
                                    p += 12;
                                    while (true) {
                                        const blockSize: number = get(p++, buf);
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
                                if (get(p++, buf) !== 0x4 || get(p + 4, buf) !== 0) {
                                    throw new Error('Invalid graphics extension block.');
                                }
                                const pf1: number = get(p++, buf);
                                this.delay = get(p++, buf) | get(p++, buf) << 8;
                                this.transparentIndex = get(p++, buf);
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
                                    const blockSize: number = get(p++, buf);
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
                                throw new Error('Unknown graphic control label: 0x' + get(p - 1, buf).toString(16));
                        }
                        this.lastCorrectPos = p;
                        break;

                    case 0x2c:
                        const x: number = get(p++, buf) | get(p++, buf) << 8;
                        const y: number = get(p++, buf) | get(p++, buf) << 8;
                        const w: number = get(p++, buf) | get(p++, buf) << 8;
                        const h: number = get(p++, buf) | get(p++, buf) << 8;
                        const pf2: number = get(p++, buf);
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
                            const blockSize: number = get(p++, buf);
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
                        throw new Error('Unknown gif block: 0x' + get(p - 1, buf).toString(16));
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
                    const r: number = get(paletteOffset + index * 3, buf);
                    const g: number = get(paletteOffset + index * 3 + 1, buf);
                    const b: number = get(paletteOffset + index * 3 + 2, buf);
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