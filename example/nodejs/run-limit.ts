import fs from 'fs-extra';
import path from 'path';
import {addPrintFlow} from './util';
import GIFrame from '../../src/giframe';

const filename: string = process.argv[2] || '1.gif';
const examplePath: string = path.resolve(__dirname, '..');
let gifBuffer: Buffer = fs.readFileSync(path.resolve(examplePath, 'img', filename));
let gifBufferProxy: Buffer = new Proxy(gifBuffer, {
    get(target, prop) {
        if (prop === 'length') {
            return range;
        }
        if (typeof prop === 'symbol') {
            return target[prop];
        }
        if (typeof prop === 'string') {
            const intVal = parseInt(prop, 10);
            if (isNaN(intVal)) {
                return target[prop];
            }
            else {
                prop = intVal;
            }
        }
        if (prop > range) {
            throw new Error('out of range');
        }
        return target[prop];
    }
});

let range: number = 1000;
const giframe: GIFrame = new GIFrame();
addPrintFlow(giframe, filename, Promise.resolve(gifBuffer.length));

giframe.on(GIFrame.event.PIXEL, () => timer && clearInterval(timer));

const timer: NodeJS.Timer = setInterval(() => {
    giframe.update(gifBufferProxy);
    range += 1000;
}, 25);
