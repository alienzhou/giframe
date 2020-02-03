import { OutputLZWMsg } from '../types';
import get from '../utils/proxy';

export interface IOutputLZW {
    output: Uint8Array;
    ok: boolean;
    msg: OutputLZWMsg;
}

export function unpackLZW(buf: Uint8Array, p: number, outputLen: number): IOutputLZW {
    let msg: OutputLZWMsg;
    let ok: boolean = true;
    const output: Uint8Array = new Uint8Array(outputLen);
    const minCodeSize: number = get(p++, buf);

    const clearCode: number = 1 << minCodeSize;
    const eoiCode: number = clearCode + 1;
    let nextCode: number = eoiCode + 1;

    let curCodeSize: number = minCodeSize + 1;
    let codeMask: number = (1 << curCodeSize) - 1;
    let curShift: number = 0;
    let cur: number = 0;
    let op: number = 0;
    let subBlockSize: number = get(p++, buf);
    const codeTable: Int32Array = new Int32Array(4096);
    let prevCode: number = null;

    while (true) {
        while (curShift < 16) {
            if (subBlockSize === 0) {
                break;
            }

            cur |= get(p++, buf) << curShift;
            curShift += 8;

            if (subBlockSize === 1) {
                subBlockSize = get(p++, buf);
            }
            else {
                --subBlockSize;
            }
        }

        if (curShift < curCodeSize) {
            break;
        }

        const code: number = cur & codeMask;
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

        const chaseCode: number = code < nextCode ? code : prevCode;

        let chaseLen: number = 0;
        let chase: number = chaseCode;
        while (chase > clearCode) {
            chase = codeTable[chase] >> 8;
            ++chaseLen;
        }

        const k: number = chase;

        const opEnd: number = op + chaseLen + (chaseCode !== code ? 1 : 0);
        if (opEnd > outputLen) {
            ok = false;
            msg = OutputLZWMsg.LONGER;
            return { output, ok, msg};
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
        ok = false;
        msg = OutputLZWMsg.SHORTER;
    }

    return { output, ok, msg};
}
