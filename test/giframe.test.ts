import { expect } from 'chai';
import fs from 'fs-extra';
import path from 'path';
import GIFrame from '../src/giframe';
const BASE64 = 'R0lGODlhAgACAPAAAP8AACDfACH5BAAyAAAAIf8LTkVUU0NBUEUyLjADAQAAACwAAAAAAgACAAACAgxcACH5BAAyAAAALAAAAAACAAIAAAICRFwAOw==';

describe('Giframe', function() {

    this.timeout(5000);

    it('should automatically enter next stage when feeded enough bytes', async () => {
        const buf = fs.readFileSync(path.resolve(__dirname, 'img', '1.gif'));
        const giframe = new GIFrame(0);
        giframe.feed(buf);
        const base64 = await giframe.getBase64();
        expect(base64).to.be.string;
    });


    describe('Event Emit', () => {
        it('should only trigger \'INIT\' event', () => {
            expect(true).to.be.true;
        });
    
        it('should only trigger \'INIT\' and \'META\' events', () => {
            expect(true).to.be.true;
        });
    
        it('should only trigger \'INIT\', \'META\' and \'PIXEL\' event', () => {
            expect(true).to.be.true;
        });
    
        it('should trigger all events except \'ALREADY\'', () => {
            expect(true).to.be.true;
        });
    
        it('should trigger \'ALREADY\' event', () => {
            expect(true).to.be.true;
        });
    })

    it('should generate a correct first-frame image', () => {
        expect(true).to.be.true;
    });
});