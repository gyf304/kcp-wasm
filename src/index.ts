interface Exports {
	memory: WebAssembly.Memory;
	malloc(size: number): number;
	free(ptr: number): void;
	create(conv: number): number;
	release(kcp: number): void;
	update(kcp: number, current: number): void;
	input(kcp: number, data: number, size: number): void;
	send(kcp: number, data: number, size: number): number;
	recv(kcp: number, data: number, size: number): number;
	flush(kcp: number): void;
	nodelay(kcp: number, nodelay: number, interval: number, resend: number, nc: number): number;
	wndsize(kcp: number, sndwnd: number, rcvwnd: number): number;
	setmtu(kcp: number, mtu: number): number;
}

interface Imports extends WebAssembly.Imports {
	env: {
		output(kcp: number, data: number, size: number): number;
	}
}

const cbMap = new Map<number, (data: ArrayBuffer) => void>();
let wasmInstance: WebAssembly.Instance | undefined;
function output(kcp: number, data: number, size: number): number {
	const exports = wasmInstance!.exports as unknown as Exports;
	const buffer = exports.memory.buffer.slice(data, data + size);
	cbMap.get(kcp)?.(buffer);
	return 0;
}

export interface KCPOptions {
	conv?: number; // default is 0
	interval?: number; // default is 40
	nodelay?: boolean; // default is false
	resend?: number; // default is 0
	nc?: boolean; // default is false
	sndwnd?: number; // default is 32
	rcvwnd?: number; // default is 32
	mtu?: number; // default is 1400
}

class CondVar {
	private promise: Promise<void>;
	private resolve: (value: void) => void = () => {};

	constructor() {
		this.promise = new Promise((resolve) => {
			this.resolve = resolve;
		});
	}

	notify() {
		this.resolve();
		this.promise = new Promise((resolve) => {
			this.resolve = resolve;
		});
	}

	wait() {
		return this.promise;
	}
}

export class KCP implements Readonly<KCPOptions> {
	private exports: Exports;
	private kcp: number;
	private intervalHandle: ReturnType<typeof setInterval>;
	private intervalCondVar: CondVar;

	public readonly conv: number;
	public readonly interval: number;
	public readonly nodelay: boolean;
	public readonly resend: number;
	public readonly nc: boolean;
	public readonly sndwnd: number;
	public readonly rcvwnd: number;
	public readonly mtu: number;

	constructor(cb: (data: ArrayBuffer) => void, options: KCPOptions = {}) {
		if (wasmInstance === undefined) {
			throw new Error("KCP wasm instance is not initialized, call KCP.initialize() first");
		}

		this.conv = options.conv ?? 0;
		this.interval = options.interval ?? 40;
		this.nodelay = options.nodelay ?? false;
		this.resend = options.resend ?? 0;
		this.nc = options.nc ?? false;
		this.sndwnd = options.sndwnd ?? 32;
		this.rcvwnd = options.rcvwnd ?? 32;
		this.mtu = options.mtu ?? 1400;

		this.intervalCondVar = new CondVar();

		this.exports = wasmInstance.exports as unknown as Exports;
		this.kcp = this.exports.create(this.conv);
		cbMap.set(this.kcp, cb);
		this.interval = Math.max(this.interval, 10);
		this.exports.nodelay(
			this.kcp,
			options.nodelay ? 1 : 0,
			this.interval,
			options.resend ?? 0,
			options.nc ? 1 : 0,
		);
		this.exports.wndsize(this.kcp, this.sndwnd, this.rcvwnd);
		this.exports.setmtu(this.kcp, this.mtu);
		this.intervalHandle = setInterval(() => {
			this.exports.update(this.kcp, performance.now());
			this.intervalCondVar.notify();
		}, this.interval / 2);
	}

	input(data: ArrayBuffer | Uint8Array) {
		if (this.kcp === 0) {
			return;
		}
		const ptr = this.exports.malloc(data.byteLength);
		new Uint8Array(this.exports.memory.buffer, ptr, data.byteLength).set(new Uint8Array(data));
		this.exports.input(this.kcp, ptr, data.byteLength);
	}

	send(data: ArrayBuffer | Uint8Array) {
		if (this.kcp === 0) {
			return;
		}
		const ptr = this.exports.malloc(data.byteLength);
		new Uint8Array(this.exports.memory.buffer, ptr, data.byteLength).set(new Uint8Array(data));
		this.exports.send(this.kcp, ptr, data.byteLength);
		this.exports.free(ptr);
	}

	async recv(size: number = 1024 * 1024) {
		if (this.kcp === 0) {
			throw new Error("KCP is not initialized");
		}
		const ptr = this.exports.malloc(size);
		while (true) {
			const recvSize = this.exports.recv(this.kcp, ptr, size);
			if (recvSize < 0) {
				await this.intervalCondVar.wait();
				continue;
			}
			const buffer = this.exports.memory.buffer.slice(ptr, ptr + recvSize);
			this.exports.free(ptr);
			return buffer;
		}
	}

	flush() {
		if (this.kcp === 0) {
			return;
		}
		this.exports.flush(this.kcp);
	}

	release() {
		if (this.kcp === 0) {
			return;
		}
		this.exports.release(this.kcp);
		clearInterval(this.intervalHandle);
		cbMap.delete(this.kcp);
		this.kcp = 0;
	}

	static async initialize(wasm: WebAssembly.Module) {
		if (wasmInstance !== undefined) {
			return wasmInstance;
		}
		const imports: Imports = {
			env: {
				output,
			}
		};
		wasmInstance = await WebAssembly.instantiate(wasm, imports);
		return wasmInstance;
	}
}

export default KCP;
