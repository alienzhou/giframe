import { expect } from 'chai';
import { unpackLZW } from '../src/decoder/lzw';
import { OutputLZWMsg } from '../src/types';

describe('LZW', () => {
    it('should unpack correctly', () => {
        const buf = Buffer.from('R0lGODlhAgACAPAAAP8AACDfACH5BAAyAAAAIf8LTkVUU0NBUEUyLjADAQAAACwAAAAAAgACAAACAgxcACH5BAAyAAAALAAAAAACAAIAAAICRFwAOw==', 'base64');
        const origin = Buffer.from(unpackLZW(buf, 56, 4).output);
        expect(origin).lengthOf(4, 'buffer length is wrong');
        expect(origin.toString('base64')).to.be.equal('AQABAA==', 'buffer content is wrong');
    });

    it('should return error info when shorter', () => {
        const buf = Buffer.from('ODlhAgACAPAAAP8AACDfACH5BAAyAAAAIf8LTkVUU0NBUEUyLjADAQAAACwAAAAAAgACAAACAgxcACH5BAAyAAAALAAAAAACAAIAAAICRFwAOw==', 'base64');
        const info = unpackLZW(buf, 56, 4);
        expect(info.ok).to.be.false;
        expect(info.msg).to.be.equal(OutputLZWMsg.SHORTER);
    });

    it('should return error info throw error when longer', () => {
        const buf = Buffer.from('R0lGODlhAgACAPAAAP8AACDfACH5BAAyAAAAIf8LTkVUU0NBUEUyLjADAQAAACwAAAAAAgACAAACAgxcACH5BAAyAAAALAAAAAACAAIAAAICRFwAOw==', 'base64');
        const info = unpackLZW(buf, 60, 4);
        expect(info.ok).to.be.false;
        expect(info.msg).to.be.equal(OutputLZWMsg.LONGER);
    });
});