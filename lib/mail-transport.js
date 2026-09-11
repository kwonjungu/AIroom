const https = require('node:https');

// Vercel decorates global fetch with x-vercel-id/x-invocation-id. Mail.tm
// responds with an empty HTTP 500 when those headers are present, even outside
// Vercel. Use native HTTPS so only the explicitly selected API headers are sent.
function requestMail(url, options = {}) {
    return new Promise((resolve, reject) => {
        const request = https.request(url, {
            method: options.method || 'GET',
            headers: options.headers,
            signal: options.signal
        }, response => {
            const chunks = [];
            response.on('data', chunk => chunks.push(chunk));
            response.on('error', reject);
            response.on('end', () => {
                const headers = new Headers();
                for (const [name, value] of Object.entries(response.headers)) {
                    if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(', ') : value);
                }
                const status = response.statusCode;
                // Do not follow redirects or send credentials to another host.
                if (status >= 300 && status < 400) return reject(new Error('Unexpected mail API redirect'));
                resolve(new Response(status === 204 ? null : Buffer.concat(chunks), { status, headers }));
            });
        });
        request.on('error', error => reject(options.signal?.aborted ? options.signal.reason : error));
        // The runtime can also instrument https.request. Strip injected tracing
        // headers from the constructed request before Node writes any bytes.
        request.removeHeader('x-vercel-id');
        request.removeHeader('x-invocation-id');
        if (options.body) request.write(options.body);
        request.end();
    });
}

module.exports = { requestMail };
