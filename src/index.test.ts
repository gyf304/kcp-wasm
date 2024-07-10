import { describe, it, test, expect } from "bun:test";

import KCP from "./index";

const module = await WebAssembly.compile(await Bun.file("dist/kcp.wasm").arrayBuffer());
await KCP.initialize(module);

describe("KCP", () => {
	it("should be able to create a KCP instance", async () => {
		const kcp = new KCP(() => {});
		expect(kcp).toBeInstanceOf(KCP);
	});

	it("should be able to send and receive data", async () => {
		let kcp1: KCP;
		let kcp2: KCP;
		kcp1 = new KCP((data) => {
			kcp2.input(data);
		});
		kcp2 = new KCP((data) => {
			kcp1.input(data);
		});
		const data = new Uint8Array([1, 2, 3, 4, 5]);
		kcp1.send(data);
		kcp1.flush();
		const recvData = new Uint8Array(await kcp2.recv());
		expect(recvData).toEqual(data);
	});
});
