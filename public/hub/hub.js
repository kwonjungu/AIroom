// 학교 공간(/hub) 화면 공통 도구. 세션 열쇠: 학교 = localStorage 'hub_token:<학교코드>', 관리자 = 'hub_admin_token'.
(function () {
    'use strict';
    const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    // 로그인 잠금(기기 10회·IP 30회)이 기기 단위로 센다. 백암이와 같은 기기 ID 를 쓴다.
    function deviceId() {
        try {
            let v = localStorage.getItem('baekam_device_id');
            if (!/^[A-Za-z0-9_-]{16,64}$/.test(v || '')) { v = (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36) + Math.random().toString(36).slice(2)).replace(/[^A-Za-z0-9_-]/g, ''); localStorage.setItem('baekam_device_id', v); }
            return v;
        } catch (e) { return ''; }
    }
    const store = {
        get: k => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } },
        set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} },
        del: k => { try { localStorage.removeItem(k); } catch (e) {} }
    };
    async function call(path, { method = 'GET', body, token } = {}) {
        const headers = { 'Content-Type': 'application/json', 'X-Device-Id': deviceId() };
        if (token) headers['X-Hub-Token'] = token;
        const r = await fetch('/api/hub' + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
        let data = {}; try { data = await r.json(); } catch (e) {}
        if (!r.ok) { const err = new Error(data.error || '처리하지 못했습니다.'); err.status = r.status; throw err; }
        return data;
    }
    const schoolIdFromPath = () => (location.pathname.match(/\/hub\/s\/(\d{7,10})/) || [])[1] || '';
    // 학교 화면에서 쓸 열쇠: 그 학교 세션이 있으면 그것, 없으면 관리자 세션(관리자는 모든 학교를 연다).
    const tokenFor = id => store.get('hub_token:' + id) || store.get('hub_admin_token');
    let timer;
    function toast(msg) { const el = document.getElementById('message'); if (!el) return; clearTimeout(timer); el.textContent = msg; el.hidden = false; timer = setTimeout(() => { el.hidden = true; }, 5000); }
    window.Hub = { esc, call, store, deviceId, schoolIdFromPath, tokenFor, toast };
})();
