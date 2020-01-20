(function() {
    const IMG_SRC = window.IMG_SRC;

    let st = +(new Date);
    const tmp = document.createElement('img');
    // display GIF only when completely loaded for a smoother and better user experience
    tmp.onload = () => {
        document.getElementById('js-img').src = tmp.src;
        document.getElementById('js-img').style.display = 'block';
        document.querySelector('.container-overlap').style.display = 'none';
        document.querySelector('#js-img-container>.loading-p').style.display = 'none';
        document.getElementById('js-img-text').innerHTML = `The first frame generated <b>${+(new Date) - st}ms</b> faster than whole GIF loaded.`;
    };
    tmp.src = IMG_SRC;

    // this will register a service worker to intercept the requests for GIF,
    // and it will tee a readable stream so that GIFrame can decode the first frame chunk by chunk
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker
            .register('/sw.js', {scope: '/'})
            .then(() => console.log('service worker is registered'));

        // create base64 by pixels passed by service worker
        navigator.serviceWorker.addEventListener('message', e => {
            const data = e.data;
            const img = document.getElementById('js-img');
            if (data.type === 'gif_pixel') {
                const { pixels, width, height } = data;
                const giframe = new GIFrame();
                const base64 = giframe.createBase64ByPixels(pixels, { width, height });
                if (!img.src) {
                    document.querySelector('#js-img-container>.loading-p').style.display = 'none';
                    img.style.display = 'block';
                    img.src = base64;
                    document.querySelector('.container-overlap').style.display = 'flex';
                    st = +(new Date);
                }

                document.querySelector('#js-img-preview-1>img').src = base64;
            }
        });
    }

    // start a new fetch request
    // then use the complete ArrayBuffer to decode frames
    document.querySelector('#js-img-preview-2>button').addEventListener('click', e => {
        e.target.style.display = 'none';
        document.querySelector('#js-img-preview-2>.loading-p').style.display = 'block';

        const giframe = new GIFrame();
        fetch(`${IMG_SRC}?no_throttle`)
            .then(res => res.arrayBuffer())
            .then(buf => giframe.feed(new Uint8Array(buf)));
        
        giframe.getBase64()
            .then(base64 => {
                document.querySelector('#js-img-preview-2>img').src = base64;
                document.querySelector('#js-img-preview-2>.loading-p').style.display = 'none';
            });
    });

    // choose a local GIF file to decode
    document.querySelector('#js-img-preview-3>input').addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) {
            alert('need to choose a file first!');
            return
        }

        const reader = new FileReader();
        reader.readAsArrayBuffer(file);
        reader.onload = e => giframe.feed(new Uint8Array(e.target.result));

        const giframe = new GIFrame();
        giframe.getBase64()
            .then(base64 => document.querySelector('#js-img-preview-3>img').src = base64);
    });
})();