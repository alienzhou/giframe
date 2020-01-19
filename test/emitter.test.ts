import sinon from 'sinon';
import { expect } from 'chai';
import EventEmitter from '../src/utils/event.emitter';

describe('Event Emitter', () => {
    it('should trigger the listener once when emitted', function () {
        const eventName = 'test-event';
        const emitter = new EventEmitter();

        const listener = sinon.spy();
        emitter.on(eventName, listener);
        emitter.emit(eventName);

        expect(listener.calledOnce).to.true;
    });

    it('should trigger the listener twice when emitted if register twice', function () {
        const eventName = 'test-event';
        const emitter = new EventEmitter();

        const listener = sinon.spy();
        emitter.on(eventName, listener);
        emitter.on(eventName, listener);
        emitter.emit(eventName);

        expect(listener.calledTwice).to.true;
    });

    it('should trigger the listener with correct data when emitted', function () {
        const eventName = 'test-event';
        const emitter = new EventEmitter();

        const data = 'hi';
        const listener = sinon.spy();
        emitter.on(eventName, listener);
        emitter.emit(eventName, data);

        const spy = listener.getCall(0);
        expect(spy.args[0]).to.equal(data);
    });

    it('should not trigger the listener when emitted the other event', function () {
        const eventName = 'test-event';
        const otherEventName = 'other-event';
        const emitter = new EventEmitter();

        const listener = sinon.spy();
        emitter.on(eventName, listener);
        emitter.emit(otherEventName);

        expect(listener.called).to.false;
    });

    it('should trigger multi listeners when emitted', function () {
        const eventName = 'test-event';
        const emitter = new EventEmitter();

        const listener1 = sinon.spy();
        const listener2 = sinon.spy();
        const listener3 = sinon.spy();
        emitter.on(eventName, listener1);
        emitter.on(eventName, listener2);
        emitter.on(eventName, listener3);
        emitter.emit(eventName);

        expect(listener1.called).to.true;
        expect(listener2.called).to.true;
        expect(listener3.called).to.true;
    });

    it('should not trigger the listener after calling .off', function () {
        const eventName = 'test-event';
        const emitter = new EventEmitter();

        const listener = sinon.spy();
        emitter.on(eventName, listener);
        emitter.off(eventName, listener);
        emitter.emit(eventName);

        expect(listener.called).to.false;
    });

    afterEach(() => sinon.restore());
});