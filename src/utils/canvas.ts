import { createCanvas, Canvas } from 'canvas';
import { ICreateBase64Opts } from '../types';

enum MineType {
    JPG = 'image/jpeg',
    PNG = 'image/png',
}
const DEFAULT_QUALITY = 0.9;

function getCanvas(width: number = 0, height: number = 0): Canvas {
    return createCanvas(width, height);
}

function createBase64(pixels: Array<number>, opts: ICreateBase64Opts): string {
    const {
        width,
        height,
        usePNG = false,
        quality = DEFAULT_QUALITY
    } = opts;

    const canvas: Canvas = getCanvas(width, height);
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, width, height);
    for (let i = 0; i < imgData.data.length * 4; i++) {
        imgData.data[i] = pixels[i];
    }
    ctx.putImageData(imgData, 0, 0);

    let base64: string;
    if (usePNG) {
        base64 = canvas.toDataURL(MineType.PNG);
    }
    else {
        base64 = canvas.toDataURL(MineType.JPG, quality);
    }
    return base64;
}

export default createBase64;