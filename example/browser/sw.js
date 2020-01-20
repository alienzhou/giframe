self.importScripts('/giframe.js');

self.addEventListener('fetch', function (e) {
    console.log('now is request: ' + e.request.url);

    if (!/\.gif$/.test(e.request.url)) {
        e.respondWith(fetch(e.request));
        return;
    }

    e.respondWith(
        fetch(e.request)
            .then(res => {
                const [processStream, returnStream] = res.body.tee();
                const reader = processStream.getReader();
                let bytes = new Uint8Array(0);
                let frameInfo;

                const giframe = new self.GIFrame();

                const promise = new Promise(resolve => {
                    giframe.on(GIFrame.event.META, frame => frameInfo = frame);
                    giframe.on(GIFrame.event.PIXEL, pixels => {
                        giframe.lock();
    
                        self.clients.matchAll().then(clients => {
                            if (!clients || clients.length === 0) {
                                return;
                            }
                            clients.forEach(client => client.postMessage({
                                type: 'gif_pixel',
                                pixels,
                                width: frameInfo.width,
                                height: frameInfo.height
                            }));
                            resolve();
                        });
                    });
                });

                const decode = ({ value, done }) => {
                    if (value) {
                        giframe.feed(value);
                        const newBytes = new Uint8Array(bytes.length + value.length);
                        newBytes.set(bytes);
                        newBytes.set(value, bytes.length);
                        bytes = newBytes;
                    }

                    if (done) {
                        console.log('complete bytes:', bytes);
                        return;
                    }
                    return reader.read().then(decode);
                };

                reader.read().then(decode);
                e.waitUntil(promise);
                return new Response(returnStream, { headers: res.headers });
            })
    );
});