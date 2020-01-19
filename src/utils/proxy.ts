import {BufferArray} from '../types';

function createArrayProxy(buf: BufferArray) {
    let proxy = new Proxy(buf, {
        get(target: BufferArray, prop) {
            if (typeof prop === 'symbol') {
                return target[prop];
            }
            if (typeof prop === 'string') {
                const intVal = parseInt(prop, 10);
                if (isNaN(intVal)) {
                    return target[prop];
                }
            }
            if (prop >= target.length) {
                throw RangeError(`index ${prop} is out of range`);
            }
            return target[prop];
        }
    });
    return proxy;
}

export default createArrayProxy;