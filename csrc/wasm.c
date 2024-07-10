/*
MIT License

Copyright (c) 2024 Yifan Gu (me .. at .. yifangu.com)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

#include <ikcp.h>
#include <stdlib.h>

#ifndef EXPORT
#define EXPORT __attribute__((visibility("default")))
#endif

#ifndef EXPORT_AS
#define EXPORT_AS(x) __attribute__((export_name(#x)))
#endif

#ifndef IMPORT
#define IMPORT
#endif

struct ctx {
	void *buf;
};

void * EXPORT_AS(malloc) _malloc(size_t size) {
	return malloc(size);
}

void EXPORT_AS(free) _free(void *ptr) {
	free(ptr);
}

extern int IMPORT output(ikcpcb *kcp, const char *buf, int len);

static int output_cb(const char *buf, int len, ikcpcb *kcp, void *user) {
	return output(kcp, buf, len);
}

ikcpcb* EXPORT create(IUINT32 conv) {
	ikcpcb *kcp = ikcp_create(conv, NULL);
	kcp->output = output_cb;
	return kcp;
}

void EXPORT release(ikcpcb *kcp) {
	ikcp_release(kcp);
}

void EXPORT update(ikcpcb *kcp, IUINT32 current) {
	ikcp_update(kcp, current);
}

void EXPORT input(ikcpcb *kcp, const char *data, long size) {
	ikcp_input(kcp, data, size);
}

int EXPORT send(ikcpcb *kcp, const char *data, long size) {
	return ikcp_send(kcp, data, size);
}

int EXPORT recv(ikcpcb *kcp, char *data, long size) {
	return ikcp_recv(kcp, data, size);
}

void EXPORT flush(ikcpcb *kcp) {
	ikcp_flush(kcp);
}

int EXPORT nodelay(ikcpcb *kcp, int nodelay, int interval, int resend, int nc) {
	return ikcp_nodelay(kcp, nodelay, interval, resend, nc);
}

int EXPORT wndsize(ikcpcb *kcp, int sndwnd, int rcvwnd) {
	return ikcp_wndsize(kcp, sndwnd, rcvwnd);
}

int EXPORT setmtu(ikcpcb *kcp, int mtu) {
	return ikcp_setmtu(kcp, mtu);
}
