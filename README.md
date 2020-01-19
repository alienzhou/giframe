# giframe

> WIP

Giframe can extract the first frame in GIFs without reading whole bytes in both browsers and NodeJS.

It may be used for accelerating GIFs loading experiences and providing a progressive GIF displaying.

## Motivation

Some websites contain a lot of [GIF images](https://en.wikipedia.org/wiki/GIF). Displaying animation images in your homepage, item list and so on may attract users' attention. However, GIF images are much larger than static images (sometimes 20x~30x depends on how many frames).

![](./doc/img/1.jpg)

As a result, users need to wait for a long time to see GIF images. A common method is to extract the first frame as a placeholder and load GIF lazily when in view or clicked. There are lots of libraries to extract frames in the server-side. However, it has some limitations:

- Most libs need to read whole bytes in GIF for extracting frames, even though we only need the first one. It's a waste of computing and time. For example, the first frame only use about 16% bytes in [`example/img/4.gif`](./example/img/4.gif) (8-frames) and .
- This solution needs the support of the server-side or CDN. Is there any frontend-only solution to improve user experience?

This repository aims to provide a stream-like GIF decoder which can run in both browsers (client-side) and NodeJS (server-side).

- It will try to extract the needed frame without reading all bytes. You can read bytes and decode at the same time. It is useful especially when using stream in I/O.
- Running in browsers means you can display a early static frame when downloading GIF, or use the client itself to calculate.

## Example

[Nodejs](https://nodejs.org/) required.

```bash
# install dependencies
npm i

# extract the first frame
# you can change the gif filename (1.gif ~ 5.gif)
npm run example:node:stream 1.gif

# or you can run
npm run example:node:limit 1.gif

# then the first frame image will be written in example/output
```

## Usage

In NodeJS,

```JavaScript
import GIFrame from 'giframe';

const giframe = new GIFrame();
giframe.on(GIFrame.event.DONE, base64 => {
    // create a image file in Nodejs
    const data = base64.replace(/^data:image\/\w+base64,/, '');
    fs.writeFileSync('output.jpg', Buffer.from(data, 'base64'));
});

const stream = fs.createReadStream('xxx.gif');
stream.on('data', chunk => giframe.feed(chunk));
```

Or in browsers,

```JavaScript
import GIFrame from 'giframe';

const giframe = new GIFrame();
giframe.on(GIFrame.event.DONE, base64 => {
    const img = document.createElement('img');
    img.src = base64;
    document.body.appendChild(img);
});

// fetch gif by http request
const stream = fetch('xxx.gif');
stream.on('data', chunk => giframe.feed(chunk));
```

## How it works

For a quick and robust start, the decoder is mostly a folk of [omggif](https://github.com/deanm/omggif). GIF is composed of [many blocks](http://matthewflickinger.com/lab/whatsinagif/bits_and_bytes.asp). Giframe treats every block as a valid unit and resets the position to the previous block's end when meet an incomplete block. It will try to continue to decoding when receiving another chunk (more bytes). It's like stream.

To generate the image's base64, Giframe uses the Canvas API - [node-canvas](https://github.com/Automattic/node-canvas) in NodeJS and [native canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API) in browsers. The canvas uses all RGBA pixels which are provided by Giframe to render a image and exports base64 string by `.toDataURL()`.

## License

[MIT](./LICENCE)
