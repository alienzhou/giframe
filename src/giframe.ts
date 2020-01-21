import { IFrameInfo, ICreateBase64Opts } from './types';
import Decoder from './decoder';
import createArrayProxy from './utils/proxy';
import EventEmitter from './utils/event.emitter';
import createBase64 from './utils/canvas';

enum Stage {
    NONE = 'none',
    INIT = 'init',
    META = 'decode-meta',
    PIXEL = 'decode-pixel',
    DONE = 'done',
    ALREADY = 'already-done'
};

type EmitData = Array<number>|string|IFrameInfo;
interface IDeferred<Ret> {
    promise: Promise<Ret>;
    resolve: (data: Ret) => unknown;
    reject: Function;
}
interface IGIFrameOpts {
    usePNG: boolean;
}

const DEFAULT_OPTS: IGIFrameOpts = {
    usePNG: false
};

class GIFrame extends EventEmitter<EmitData> {
    static event = Stage;

    static createBase64ByPixels(pixels: Array<number>, opts: ICreateBase64Opts): string {
        return createBase64(pixels, opts);
    }

    private stage: Stage = Stage.NONE;
    private decoder: Decoder = null;
    private frameIdx: number = 0;
    private buf: Uint8Array;
    private base64: string = null;
    private deferred: IDeferred<string>;
    private pixels: Array<number> = null;
    private isLocked: boolean = false;
    public opts: IGIFrameOpts;

    constructor(frameIdx: number = 0, opts?: IGIFrameOpts) {
        super();
        this.frameIdx = frameIdx;
        if (opts) {
            this.opts = Object.assign({}, DEFAULT_OPTS, opts);
        }
        else {
            this.opts = Object.create(DEFAULT_OPTS);
        }
        let resolve: (data: string) => unknown;
        let reject: Function;
        const promise: Promise<string> = new Promise((r, j) => (resolve = r, reject = j));
        this.deferred = { promise, resolve, reject };
    }

    private concat(buf: Uint8Array): Uint8Array {
        let buffer = buf;
        if (this.buf) {
            buffer = new Uint8Array(this.buf.length + buf.length);
            buffer.set(this.buf);
            buffer.set(buf, this.buf.length);
        }
        return buffer;
    }

    private switchStage(stage: Stage, data?: EmitData): void {
        this.stage = stage;
        this.emit(stage, data);
    }

    get bufferLength(): number {
        if (!this.buf) {
            return 0;
        }
        return this.buf.length;
    }

    lock(): void {
        this.isLocked = true;
    }

    unlock(): void {
        this.isLocked = false;
    }

    feed(appendedBuf: Uint8Array): void {
        if (this.isLocked) {
            return;
        }

        const buf: Uint8Array = this.concat(appendedBuf);
        this.update(buf);
    }

    update(buf: Uint8Array): void {
        // the workflow is locked
        if (this.isLocked || Stage.ALREADY === this.stage) {
            return;
        }

        // already done, never update anymore
        if (Stage.DONE === this.stage) {
            this.switchStage(Stage.ALREADY, this.base64);
            return;
        }

        // record origin buffer
        this.buf = buf;
        // convert to a proxy
        buf = createArrayProxy(buf);

        // init decoder
        if (Stage.NONE === this.stage) {
            this.decoder = new Decoder(buf);
            this.switchStage(Stage.INIT);

            // NOTE: does it necessary to handle the case that init stage incomplete?
            // try to enter next stage
            this.update(buf);
            return;
        }

        if (Stage.INIT === this.stage) {
            const decoder = this.decoder;
            const finished = decoder.decodeMetaAndFrameInfo(buf, this.frameIdx);
            if (finished) {
                this.switchStage(Stage.META, decoder.getFrameInfo(this.frameIdx));
                // try to enter next stage
                this.update(buf);
            }
            return;
        }

        if (Stage.META === this.stage) {
            const decoder = this.decoder;
            const pixels = decoder.decodeFrameRGBA(this.frameIdx, buf);
            if (pixels) {
                this.pixels = pixels;
                this.switchStage(Stage.PIXEL, pixels);
                // try to enter next stage
                this.update(buf);
            }
            return;
        }

        if (Stage.PIXEL === this.stage) {
            const decoder = this.decoder;
            // convert to base64
            const { width, height } = decoder.getFrameInfo(this.frameIdx);
            const opts: ICreateBase64Opts = { width, height };
            if (this.opts.usePNG) {
                opts.usePNG = true;
            }
            this.base64 = createBase64(this.pixels, opts);
            this.deferred.resolve(this.base64);
            this.switchStage(Stage.DONE, this.base64);

            return;
        }

        const err = Error('unknown internal status: ' + this.stage);
        this.deferred.reject(err);
        throw err;
    }

    getBase64(): Promise<string> {
        return this.deferred.promise;
    }
}

export default GIFrame;