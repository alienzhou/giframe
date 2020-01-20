import http from 'http';
import fs from 'fs-extra';
import path from 'path';
import { performance } from 'perf_hooks';

function getHTML(idx: string|number): string {
    if (typeof idx === 'number') {
        idx = String(idx);
    }
    const html: string = path.resolve(__dirname, 'index.html');
    return fs.readFileSync(html, 'utf-8').replace(/<=%filename%=>/g, idx);
}

const app: http.Server = http.createServer(function (req, res) {
    const url: string = req.url;
    const now = performance.now();
    if (url === '/giframe.js') {
        res.setHeader('Content-Type', 'application/javascript');
        const script: string = path.resolve(__dirname, '..', '..', 'dist', 'browser', 'giframe.js');
        fs.createReadStream(script).pipe(res);
    }
    else if (url === '/sw.js') {
        res.setHeader('Content-Type', 'application/javascript');
        const sw: string = path.resolve(__dirname, 'sw.js');
        fs.createReadStream(sw).pipe(res);
    }
    else if (url === '' || url === '/') {
        res.setHeader('Content-Type', 'text/html')
        res.end(getHTML(2));
    }
    else if (/^\/\d+\/?$/.test(url)) {
        const ret = /^\/(\d+)/.exec(url);
        res.setHeader('Content-Type', 'text/html')
        res.end(getHTML(ret[1]));
    }
    else if (/^\/\d+\.gif$/.test(url)) {
        const ret = /(\d+)\.gif/.exec(url);
        const gif: string = path.resolve(__dirname, '..', 'img', `${ret[1]}.gif`);
        res.setHeader('Content-Type', 'image/gif');
        res.setHeader('Access-Control-Allow-Origin', '*');
        fs.createReadStream(gif).pipe(res);
    }
    else {
        res.statusCode = 404;
        res.end('<html><body><h1>404</h1><a href="/">back >></a></body></html>');
    }

    console.log(`[ ${req.method} ] ${(performance.now() - now).toFixed(3)}ms - ${url}`);
});

const port: number = parseInt(process.env.PORT, 10) || 8080;
app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on ${port}...`);
});
