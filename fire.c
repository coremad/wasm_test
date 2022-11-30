#include <stdint.h>

//#define shift_width 8

uint32_t shift_width = 8;
uint32_t seed = 7;

int test() {
    return seed;
}

void fire(uint8_t * fire_image, uint32_t w, uint32_t end) {
    int w2 = w << 1;
    for (int addr = w<<1; addr < end; addr++)
        fire_image[addr] =
            (fire_image[addr + w]+fire_image[addr + w2] + fire_image[addr - w - 1] + fire_image[addr - w + 1])>>2;
//            (fire_image[addr + (w<<1)]+fire_image[addr + w] + fire_image[addr - 1] + fire_image[addr + 1])>>2;
}

void index2rgba(uint32_t * data, uint8_t * fire_image, uint32_t * pal, uint32_t end) {
    for (int addr = 0; addr < end; addr++) data[addr] = pal[fire_image[addr]];
}


inline uint8_t randUInt8() {
    seed = (seed * 73129 + 95121) % 100000;
    return seed & 255;
}

inline unsigned iabs(int value) { return ((value < 0) ? (0 - value) : value); }

void line(uint8_t * fire_image, int x0, int y0, int x1, int y1) {
     int diry = y1 - y0;
     int deltay = iabs(diry);
     if (diry < 0) diry = -1;
     if (diry > 0) diry = 1;
     diry <<=  shift_width;

     int dirx = x1 - x0;
     int deltax = iabs(dirx);
     if (dirx > 0) dirx = 1;
     if (dirx < 0) dirx = -1;

     int error = 0;

     uint32_t addr = (y0 << shift_width) + x0;

     int deltaYerr = deltay + 1;
     int deltaXerr = deltax + 1;
     if (deltax >= deltay)
         while (deltax--) {
             fire_image[addr] = randUInt8();
             addr += dirx;
             error += deltaYerr;
             if (error >= deltaXerr) {
                addr += diry;
                error -= deltaXerr;
             }
         }
    else
         while (deltay--) {
             fire_image[addr] = randUInt8();
             addr += diry;
             error += deltaXerr;
             if (error >= deltaYerr) {
                 addr += dirx;
                 error -= deltaYerr;
             }
         }
}
