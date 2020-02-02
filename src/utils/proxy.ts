function createArrayProxy(buf: Uint8Array): Uint8Array {
    const proxy = new Proxy(buf, {
        get(target: Uint8Array, prop): unknown {
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