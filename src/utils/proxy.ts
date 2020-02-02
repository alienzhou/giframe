function get(idx: number, buf: Uint8Array): number {
    if (!buf) {
        throw ReferenceError('buf cant be undefined or null');
    }
    if (idx >= buf.length || idx < 0) {
        throw RangeError(`index ${idx} is out of range`);
    }
    return buf[idx];
}

export default get;