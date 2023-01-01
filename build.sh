#!/bin/bash

clang --target=wasm32 \
-Os \
-nostdlib \
-fuse-ld=lld \
-Wl,--lto-O3 \
-Wl,--export-all \
-Wl,--no-entry \
-Wl,-z,stack-size=$[8*1024 * 1024] \
fire.c -o public/fire.wasm

#emcc fire.c -o public/fire.wasm  -O3 -Wl,--export-all --no-entry
