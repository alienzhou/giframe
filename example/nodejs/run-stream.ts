import fs from 'fs-extra';
import path from 'path';
import {addPrintFlow} from './util';
import GIFrame from '../../src/giframe';

const filename: string = process.argv[2] || '1.gif';
const examplePath: string = path.resolve(__dirname, '..');
const stream: fs.ReadStream = fs.createReadStream(path.resolve(examplePath, 'img', filename), {
    highWaterMark: 10 * 1024
});

let done: boolean = false;
const giframe: GIFrame = new GIFrame();
const promise = new Promise<number>(resolve => {
    let chunkLen: number = 0;
    giframe.on(GIFrame.event.PIXEL, () => done = true);
    stream.on('data', chunk => {
        chunkLen += chunk.length;
        if (!done) {
            giframe.feed(chunk);
        }
    });
    stream.on('end', () => {
        resolve(chunkLen);
    })
});

addPrintFlow(giframe, filename, promise);
