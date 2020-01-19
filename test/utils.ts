import fs from 'fs-extra';
import path from 'path';
import sharp from 'sharp';
import pixelmatch from 'pixelmatch';

const TEMP_DIR = path.resolve(__dirname, 'tmp');
export function writeTempImage(base64: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const filename = +(new Date);
        const ret = /^data:image\/(\w+);base64,([A-Za-z0-9+\/=]+)/.exec(base64);
        const outputPath = path.resolve(TEMP_DIR, `${filename}.${ret[1]}`);
        const buffer = Buffer.from(ret[2], 'base64');
        fs.outputFile(outputPath, buffer, function (err) {
            if (err) {
                reject(err);
                return;
            }
            resolve(outputPath);
        });
    });
}

export function getMeta(filePath: string): Promise<sharp.Metadata> {
    return sharp(filePath).metadata();
}

export async function getRGBAPixels(filePath: string): Promise<Uint8Array> {
    const { width, height } = await getMeta(filePath);
    const rawInfo = await sharp(filePath).raw().toBuffer({ resolveWithObject: true });
    const pixels = rawInfo.data.toJSON().data;

    if (width * height * 3 === pixels.length) {
        // add alpha val
        for (let i = 1; i <= pixels.length; i++) {
            if (i % 4 === 3) {
                pixels.splice(i, 0, 255);
                i++;
            }
        }
    }
    if (pixels.length !== width * height * 4) {
        throw Error(
            `There are ${pixels.length} RGBA pixel items in a ${width}x${height} image. Expect to be ${width * height * 4}`
        );
    }
    return new Uint8Array(pixels);
}

export async function diffImage(sourcePath: string, targetPath: string, threshold: number = 0): Promise<number> {
    const { width, height } = await getMeta(sourcePath);
    const source = await getRGBAPixels(sourcePath);
    const target = await getRGBAPixels(targetPath);
    return pixelmatch(source, target, new Uint8Array(source.length), width, height, { threshold });
}

export function cleanTempDir(): void {
    fs.removeSync(TEMP_DIR);
}

export async function timeout(time: number = 1000): Promise<void> {
    await new Promise((r, j) => setTimeout(() => j(`timeout for ${time}ms`), time));
}