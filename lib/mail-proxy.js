// Fixed upstream and route allowlist prevent this authenticated endpoint becoming
// an arbitrary URL proxy. Never forward the page key or browser cookies upstream.
module.exports = async function mailProxy(req, res) {
    res.set('Cache-Control', 'no-store');
    const allowed = {
        GET: /^\/(domains|messages(?:\/[a-zA-Z0-9_-]+(?:\/download|\/attachment\/[a-zA-Z0-9_.-]+)?)?)$/,
        POST: /^\/(accounts|token)$/,
        PATCH: /^\/messages\/[a-zA-Z0-9_-]+$/,
        DELETE: /^\/messages\/[a-zA-Z0-9_-]+$/
    };
    const [pathname, query = ''] = req.url.split('?');
    if (!allowed[req.method]?.test(pathname)) {
        return res.status(400).json({ error: '지원하지 않는 메일 API 요청입니다.' });
    }
    const url = new URL(pathname, 'https://api.mail.tm');
    const page = new URLSearchParams(query).get('page');
    if (page !== null) {
        if (!/^[1-9]\d{0,5}$/.test(page)) return res.status(400).json({ error: '잘못된 페이지입니다.' });
        url.searchParams.set('page', page);
    }
    const headers = { Accept: 'application/json' };
    if (req.headers.authorization) headers.Authorization = req.headers.authorization;
    const hasBody = req.method === 'POST' || req.method === 'PATCH';
    if (hasBody) headers['Content-Type'] = req.method === 'PATCH' ? 'application/merge-patch+json' : 'application/json';
    try {
        const upstream = await fetch(url, {
            method: req.method, headers,
            body: hasBody ? JSON.stringify(req.body || {}) : undefined,
            redirect: 'error', signal: AbortSignal.timeout(15000)
        });
        if (upstream.status === 204) return res.status(204).end();
        const body = Buffer.from(await upstream.arrayBuffer());
        if (upstream.status >= 500 || upstream.status === 403) {
            console.warn('Mail upstream rejected request', { status: upstream.status, region: process.env.VERCEL_REGION, server: upstream.headers.get('server'), detail: body.toString('utf8').slice(0, 300) });
            const diagnostics = [];
            if (pathname === '/domains' && process.env.VERCEL_ENV !== 'production') {
                for (const [base, extra] of [
                    ['https://api.mail.gw', {}],
                    ['https://api.mail.tm', { 'User-Agent': 'AIroom/1.0', Origin: 'https://a-iroom.vercel.app' }],
                    ['https://api.mail.tm', { Origin: 'https://mail.tm' }],
                    ['https://api.mail.tm', { Accept: 'application/ld+json' }]
                ]) {
                    try {
                        const probe = await fetch(base + '/domains', { headers: extra, signal: AbortSignal.timeout(3000) });
                        diagnostics.push({ base, extra, status: probe.status });
                        console.warn('Mail domain connectivity check', { base, extra, status: probe.status, detail: (await probe.text()).slice(0, 300) });
                    } catch (e) { console.warn('Mail domain connectivity check failed', { base, name: e.name }); }
                }
            }
            if (diagnostics.length) return res.status(502).json({ diagnostics });
            return res.status(502).json({ error: '외부 메일 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.' });
        }
        for (const name of ['content-type', 'content-disposition', 'retry-after']) {
            const value = upstream.headers.get(name);
            if (value) res.set(name, value);
        }
        return res.status(upstream.status).send(body);
    } catch (error) {
        return res.status(error.name === 'TimeoutError' ? 504 : 502).json({ error: '메일 서버 연결이 지연되거나 실패했습니다. 잠시 후 다시 시도해주세요.' });
    }
};
