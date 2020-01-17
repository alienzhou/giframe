import fs from 'fs-extra';
import path from 'path';
import ora from 'ora';
import GIFrame from '../../src/giframe';

type SpinFn = (text?: string, error?: Error) => number;
const examplePath: string = path.resolve(__dirname, '..');

export function addPrintFlow(giframe: GIFrame, filename: string, totalPromise: Promise<number>): void {

    function createSpin(text: string): SpinFn {
        let startTime: number = +(new Date);
        let spinner: ora.Ora = ora(text).start();
        let formerText: string = text;

        const spin: SpinFn = function (text?: string, error?: Error): number {
            const now: number = +(new Date);
            const cost: number = now - startTime;
            startTime = now;
    
            if (error) {
                spinner.fail(`${formerText} - failed!`);
                console.log(error);
            }
            else {
                spinner.succeed(`${formerText} - ${cost}ms`);
            }
    
            if (text) {
                spinner = ora(text).start();
                formerText = text;
            }
    
            return cost;
        }

        return spin;
    }

    let bufUsed: number = 0;
    function printStat(): void {
        totalPromise.then(total => {
            console.log(`total length:`, total);
            console.log('read length:', bufUsed);
            console.log('used percentage:', `${(Math.min(bufUsed / total, 1) * 100).toFixed(3)}%`);
        });
    }

    const spin: SpinFn = createSpin('init basic info');
    giframe.on(GIFrame.event.INIT, () => spin('read meta info'));
    giframe.on(GIFrame.event.META, () => spin('decode pixels'));
    giframe.on(GIFrame.event.PIXEL, () => spin('generate base64 string'));
    giframe.on(GIFrame.event.DONE, () => spin('create image file'));

    giframe.on(GIFrame.event.PIXEL, () => {
        bufUsed = giframe.bufferLength;
    });
    giframe.on(GIFrame.event.DONE, base64 => {
        const data = (base64 as string).replace(/^data:image\/\w+;base64,/, '');
        const name = path.parse(filename).name;
        const outputPath = path.resolve(examplePath, 'output', `${name}.jpg`);
        const buffer = Buffer.from(data, 'base64');
        fs.outputFile(outputPath, buffer, function (err) {
            if (err) {
                spin(null, err);
                return;
            }
            spin();
            printStat();
        });
    });
}
