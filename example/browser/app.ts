import http from 'http';
import fs from 'fs-extra';
import path from 'path';
import opn from 'better-opn';
import Throttle from 'throttle-stream';

const port: number = parseInt(process.env.PORT, 10) || 8080;
const speed: number = isNaN(parseInt(process.env.SPEED, 10)) ? 250 : parseInt(process.env.SPEED, 10);
const interval: number = 25;
const publicDir = path.resolve(__dirname, 'public');

function getHTML(idx: string|number): string {
    if (typeof idx === 'number') {
        idx = String(idx);
    }
    const html: string = path.resolve(publicDir, 'index.html');
    return fs.readFileSync(html, 'utf-8')
        .replace(/<=%filename%=>/g, idx)
        .replace(/<=%speed%=>/g, String(speed));
}

const app: http.Server = http.createServer(function (req, res) {
    const url: string = req.url;
    if (url === '/giframe.js') {
        res.setHeader('Content-Type', 'application/javascript');
        const script: string = path.resolve(__dirname, '..', '..', 'dist', 'umd', 'giframe.js');
        fs.createReadStream(script).pipe(res);
    }
    else if (url === '/index.js') {
      res.setHeader('Content-Type', 'application/javascript');
      const script: string = path.resolve(publicDir, 'index.js');
      fs.createReadStream(script).pipe(res);
    }
    else if (url === '/sw.js') {
        res.setHeader('Content-Type', 'application/javascript');
        const sw: string = path.resolve(publicDir, 'sw.js');
        fs.createReadStream(sw).pipe(res);
    }
    else if (url === '' || url === '/') {
        res.setHeader('Content-Type', 'text/html')
        res.end(getHTML(1));
    }
    else if (/^\/\d+\/?$/.test(url)) {
        const ret = /^\/(\d+)/.exec(url);
        res.setHeader('Content-Type', 'text/html')
        res.end(getHTML(ret[1]));
    }
    else if (/^\/\d+\.gif/.test(url)) {
        const ret = /(\d+)\.gif/.exec(url);
        const gif: string = path.resolve(__dirname, '..', 'img', `${ret[1]}.gif`);
        res.setHeader('Content-Type', 'image/gif');
        res.setHeader('Access-Control-Allow-Origin', '*');

        // without throttle, pipe bytes immediately
        if (/\?no_throttle$/.test(url)) {
            fs.createReadStream(gif).pipe(res);
        }
        // throttle the network speed, so that you can see the loading process
        else {
            const bytes = (1024 * speed) / (1000 / interval);
            fs.createReadStream(gif).pipe(new Throttle({ bytes, interval })).pipe(res);
        }
    }
    else {
        res.statusCode = 404;
        res.end('<html><body><h1>404</h1><a href="/">back >></a></body></html>');
    }

    console.log(`[ ${req.method} ] ${url}`);
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on ${port}...`);
    opn(`http://127.0.0.1:${port}`);
});
