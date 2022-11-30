const interval = 40;
const shift_width = 8;
const shift_height = 8;
const cwidth = 1 << shift_width;
const cheight = 1 << shift_height;
const isize = cwidth*cheight;

const status = document.getElementById('status');
const canvas = document.getElementById('canvas');
const debug = document.getElementById('debug');
const html_fps = document.getElementById('fps');
const pbutton = document.getElementById('pbutton');
const cbutton = document.getElementById('cbutton');

const ctx = canvas.getContext('2d');

if (ctx) {
    ctx.canvas.width  = cwidth;
    ctx.canvas.height  = cheight;
    fetch("fire.wasm")
      .then((response) => response.arrayBuffer())
      .then((bytes) => WebAssembly.instantiate(bytes, {}))
      .then((results) => {
        const myImage = new IndexImage(results.instance, cwidth, cheight);

        const figure = new Figure(myImage);
        figure.create();

        pbutton.onclick = pause;
        cbutton.onclick = clear_figure;
        canvas.addEventListener('click', event => pick(event));
        pause();

        function go() {
            const start = performance.now();
            figure.draw_figure();
            myImage.fire();
            myImage.index2rgba();
            ctx.putImageData(myImage.myImageData, 0, 0);
            const timeTaken = (performance.now() - start);
            html_fps.innerHTML = timeTaken;
            debug.innerHTML = myImage.static_data[256] +' / ' +myImage.testW();
        }
        function pause() {
            if(!pause.active) pause.active = 0;
            if (pause.active ^= 1) pause.intervalID = setInterval(go, interval)
            else clearInterval(pause.intervalID);
        }
        function pick(event) {
            const bounding = canvas.getBoundingClientRect();
            const x = (event.clientX - bounding.left) * cwidth/event.target.clientWidth;
            const y = (event.clientY - bounding.top) * cheight/event.target.clientHeight;
            if ((x < 2) || (y < 2) || (y > (cheight - 2)) || (x > (cwidth - 2))) return;
            const xy = figure.add_node(x, y);
            go();
            status.innerHTML = "pick("+xy[0]+", "+xy[1]+"); nodes: " + figure.nodes_count();
        }
        function clear_figure() {
            if (figure.nodes_count()) figure.clear()
            else figure.create();
            go();
            status.innerHTML = "nodes: " + figure.nodes_count();
        }
      });
} else status.innerHTML = 'ERROR canvas.getContext';

class IndexImage {

    constructor(ws) {
        const align = 1024;
        var static_space = (~~(ws.exports.__data_end/align))*align;
        if (ws.exports.__data_end%align) static_space += align;
        this.cwidth = cwidth;
        this.cheight = cheight;
        this.isize = isize;
        this.startXY = [cwidth >> 1, cheight >> 1];
        this.buffer = ws.exports.memory.buffer;
        this.static_data = new Uint32Array(this.buffer, 0, 1024);
        this.static_data[256] = shift_width;
        this.fire_image = new Uint8Array(this.buffer, static_space, isize);
        this.ui8ca = new Uint8ClampedArray(this.buffer, static_space + isize, isize*4);
        this.myImageData = new ImageData(this.ui8ca, cwidth, cheight);
        this.data = this.myImageData.data;
        this.pal = new Uint8Array(this.buffer, static_space + isize*5, 256*4);
        this.create_pal();
        this.testW = ws.exports.test;
        this.fireW = ws.exports.fire;
        this.lineW = ws.exports.line;
        this.index2rgbaW = ws.exports.index2rgba;
    }

    set_pal_color(i, c) {
        for (var n = 0; n < 4;n++)
        this.pal[(i<<2)+n] = c[n];
    }

    create_pal() {
        for (let c = 0; c < 64; c++) {
            this.set_pal_color(c,       [c*4, 0, 0, 255]);
            this.set_pal_color(64 + c,  [255, c*4, 0, 255]);
            this.set_pal_color(128 + c, [255, 255, c*4, 255]);
            this.set_pal_color(192 + c, [255, 255, 255, 255]);
        }
    }

    index2rgba() {
        this.index2rgbaW(this.data.byteOffset, this.fire_image.byteOffset, this.pal.byteOffset, this.isize);
    }

    fire() {
        this.fireW(this.fire_image.byteOffset, this.cwidth, this.isize - this.cwidth*2);
    }

    lineTo(x, y) {
        this.lineW(this.fire_image.byteOffset, this.startXY[0], this.startXY[1], x, y);
        this.startXY = [x, y];
    }
}

class Figure {

    constructor(dstImage) {
        this.figure = [];
        this.dstImage = dstImage;
    }

    add_node(x, y) {
        x = Math.floor(x) & (this.dstImage.cwidth - 1);
        y = Math.floor(y) & (this.dstImage.cheight - 1);
        if(!this.figure.length
            || (x != this.figure[this.figure.length - 1][0])
            || (y != this.figure[this.figure.length - 1][1]))
            this.figure.push([x, y]);
        return this.figure[this.figure.length - 1];
    }

    nodes_count() {
        return this.figure.length;
    }

    clear() {
        this.figure.length = 0;
    }

    create() {
        var alpha = (2 * Math.PI) / 5;
        var radius = -30 + Math.min(this.dstImage.cwidth, this.dstImage.cheight) >> 1;
        for(var i = 11; i != 0; i--) {
            var r = radius*(i % 2 + 1)/2;
            var omega = alpha * i;
            this.add_node(r * Math.sin(omega) + (this.dstImage.cwidth >> 1), 10 + r * Math.cos(omega) + (this.dstImage.cheight >> 1));
        }
    }

    draw_figure() {
        for (var i = 0; i < this.figure.length; i++)
            this.dstImage.lineTo(this.figure[i][0], this.figure[i][1]);
    }
}
