type SubscribeCallback<DataType> = (data?: DataType) => any;
type UnsubscribeFn = () => void;

class Subscribe<DataType> {
    private listeners: Array<SubscribeCallback<DataType>> = [];
    private data: DataType;
    private completed: boolean;

    done(data: DataType) {
        this.data = data;
        this.completed = true;
        const listeners = this.listeners || [];
        listeners.forEach(listener => listener(data));
        this.listeners = [];
    }

    subscribe(fn: SubscribeCallback<DataType>): UnsubscribeFn {
        // already done
        if (this.completed) {
            fn(this.data);
            return;
        }

        // waiting for completing
        this.listeners.push(fn);
        return function unsubscribe() {
            for (let i = 0; i < this.listeners.length; i++) {
                if (this.listeners[i] === fn) {
                    this.listeners.splice(i, 1);
                }
            }
        }
    }
}

export default Subscribe;