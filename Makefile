.PHONY: all

# CC = wasm32-unknown-wasi-clang
LD = wasm32-unknown-wasi-wasm-ld

CFLAGS = -x c -Os -fPIC \
	-D__wasi_api_h '-DEXPORT=__attribute__((visibility("default")))' \
	-I./csrc

LDFLAGS = --no-entry --export-dynamic --allow-undefined -lc $(NIX_LDFLAGS)

all: dist/kcp.wasm

clean:
	rm -rf dist

csrc/%.o: csrc/%.c
	$(CC) $(CFLAGS) -c $< -o $@

dist/kcp.wasm: csrc/ikcp.o csrc/wasm.o
	mkdir -p dist
	$(LD) $(LDFLAGS) -o $@ $^
