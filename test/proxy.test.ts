import { expect } from 'chai';
import createArrayProxy from '../src/utils/proxy';
import { BufferArray } from '../src/types';

describe('Proxy', () => {
    it('should return val for a symbol key', function () {
        const arr: BufferArray = Buffer.from([0, 1, 2]);
        const key = Symbol('hey');
        const val = 'hi';
        arr[key] = val;
        const proxy = createArrayProxy(arr);
        expect(proxy[key]).to.be.equal(val);
    });

    it('should return val for a NaN string key', function () {
        const arr: BufferArray = Buffer.from([0, 1, 2]);
        const key: string = 'hey';
        const val: string = 'hi';
        arr[key] = val;
        const proxy = createArrayProxy(arr);
        expect(proxy[key]).to.be.equal(val);
    });

    it('should return val when numerical key is not out of range', function () {
        const arr: BufferArray = Buffer.from([0, 1, 2]);
        const proxy = createArrayProxy(arr);
        const access = () => proxy[0] & proxy[1] & proxy[2];
        expect(access).not.to.throw();
    });

    it('should throw error when numerical key is out of range', function () {
        const arr: BufferArray = Buffer.from([0, 1, 2]);
        let proxy = createArrayProxy(arr);
        const access = () => proxy[3];

        expect(access).to.throw(RangeError);
        expect(access).to.throw(/index \d+ is out of range/);
    });

    it('should throw error when numerical-like string key is out of range', function () {
        const arr: BufferArray = Buffer.from([0, 1, 2]);
        let proxy = createArrayProxy(arr);
        const access = () => proxy['3'];

        expect(access).to.throw(RangeError);
        expect(access).to.throw(/index \d+ is out of range/);
    });
});