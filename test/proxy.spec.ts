import { expect } from 'chai';
import get from '../src/utils/proxy';

describe('Proxy', () => {
    it('should throw error when buffer is null', function () {
        const access = () => get(0, null);
        expect(access).to.throw(ReferenceError);
        expect(access).to.throw('buf cant be undefined or null');
    });

    it('should return val when numerical key is not out of range', function () {
        const arr: Uint8Array = Buffer.from([0, 1, 2]);
        const access = () => get(0, arr) & get(1, arr) & get(2, arr);
        expect(access).not.to.throw();
    });

    it('should throw error when numerical key is out of range', function () {
        const arr: Uint8Array = Buffer.from([0, 1, 2]);
        const access = () => get(3, arr);
        const access2 = () => get(-1, arr);

        expect(access).to.throw(RangeError);
        expect(access).to.throw(/index -?\d+ is out of range/);
        expect(access2).to.throw(RangeError);
        expect(access2).to.throw(/index -?\d+ is out of range/);
    });
});