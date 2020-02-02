/**
 * tiny event emitter
 * modify from mitt
*/

type EventHandler<DataType> = (data?: DataType) => void;
type EventHandlerList<DataType> = Array<EventHandler<DataType>>;
type HandlersMap<DataType> = {[propName: string]: EventHandlerList<DataType>};

class EventEmitter<DataType> {
    private handlersMap: HandlersMap<DataType> = Object.create(null);

    on(type: string, handler: EventHandler<DataType>): EventEmitter<DataType> {
        if (!this.handlersMap[type]) {
            this.handlersMap[type] = [];
        }
        this.handlersMap[type].push(handler);
        return this;
    }

    off(type: string, handler: EventHandler<DataType>): EventEmitter<DataType> {
        if (this.handlersMap[type]) {
            this.handlersMap[type].splice(this.handlersMap[type].indexOf(handler) >>> 0, 1);
        }
        return this;
    }

    emit(type: string, data?: DataType): EventEmitter<DataType> {
        if (this.handlersMap[type]) {
            this.handlersMap[type].slice().forEach(handler => handler(data));
        }
        return this;
    }
}

export default EventEmitter;