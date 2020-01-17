import {BufferArray} from '../types';

function LZW(buf: BufferArray, p: number, output: Uint8Array, outputLen: number) {
    let minCodeSize: number = buf[p++];

    let clearCode: number = 1 << minCodeSize;
    let eoiCode: number = clearCode + 1;
    let nextCode: number = eoiCode + 1;

    let curCodeSize: number = minCodeSize + 1;
    let codeMask: number = (1 << curCodeSize) - 1;
    let curShift: number = 0;
    let cur: number = 0;
    let op: number = 0;
    let subBlockSize: number = buf[p++];
    let codeTable = new Int32Array(4096);
    let prevCode: number = null;

    while (true) {
        while (curShift < 16) {
            if (subBlockSize === 0) {
                break;
            }

            cur |= buf[p++] << curShift;
            curShift += 8;

            if (subBlockSize === 1) {
                subBlockSize = buf[p++];
            }
            else {
                --subBlockSize;
            }
        }

        if (curShift < curCodeSize) {
            break;
        }

        let code: number = cur & codeMask;
        cur >>= curCodeSize;
        curShift -= curCodeSize;

        if (code === clearCode) {
            nextCode = eoiCode + 1;
            curCodeSize = minCodeSize + 1;
            codeMask = (1 << curCodeSize) - 1;

            prevCode = null;
            continue;
        }
        else if (code === eoiCode) {
            break;
        }

        let chaseCode: number = code < nextCode ? code : prevCode;

        let chaseLen: number = 0;
        let chase: number = chaseCode;
        while (chase > clearCode) {
            chase = codeTable[chase] >> 8;
            ++chaseLen;
        }

        let k: number = chase;

        let op_end: number = op + chaseLen + (chaseCode !== code ? 1 : 0);
        if (op_end > outputLen) {
            console.log('Warning, gif stream longer than expected.');
            return;
        }

        output[op++] = k;

        op += chaseLen;
        let b: number = op;

        if (chaseCode !== code) {
            output[op++] = k;
        }

        chase = chaseCode;
        while (chaseLen--) {
            chase = codeTable[chase];
            output[--b] = chase & 0xff;
            chase >>= 8;
        }

        if (prevCode !== null && nextCode < 4096) {
            codeTable[nextCode++] = prevCode << 8 | k;
            if (nextCode >= codeMask + 1 && curCodeSize < 12) {
                ++curCodeSize;
                codeMask = codeMask << 1 | 1;
            }
        }

        prevCode = code;
    }

    if (op !== outputLen) {
        console.log('Warning, gif stream shorter than expected.');
    }

    return output;
}


export default LZW;