/* ==========================================================
   About + Projects interactions
   ========================================================== */
(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    /* colour comes from --accent / --accent-rgb in styles.css */
    let RED = '#dc2626', RGB = '220, 38, 38';
    const readAccent = () => {
        const css = getComputedStyle(document.documentElement);
        RED = css.getPropertyValue('--accent').trim() || RED;
        RGB = css.getPropertyValue('--accent-rgb').trim() || RGB;
    };
    readAccent();
    const acc = a => `rgba(${RGB}, ${a})`;
    const onView = (el, cb, threshold = .2) => {
        if (!el) return;
        if (!('IntersectionObserver' in window)) return cb();
        const io = new IntersectionObserver(es => {
            if (es.some(e => e.isIntersecting)) { cb(); io.disconnect(); }
        }, { threshold });
        io.observe(el);
    };

    /* ======================= ABOUT ======================= */

    /* 1. paragraphs: split into words, light them up while scrolling */
    document.querySelectorAll('[data-scrub]').forEach(scrub => {
        const words = [];
        const split = node => {
            [...node.childNodes].forEach(n => {
                if (n.nodeType === 3) {
                    const frag = document.createDocumentFragment();
                    n.textContent.split(/(\s+)/).forEach(part => {
                        if (!part) return;
                        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
                        const s = document.createElement('span');
                        s.className = 'w';
                        s.textContent = part;
                        frag.appendChild(s);
                        words.push(s);
                    });
                    n.replaceWith(frag);
                } else if (n.nodeType === 1) split(n);
            });
        };
        split(scrub);

        if (reduce) { words.forEach(w => w.classList.add('on')); return; }
        let ticking = false, lastLit = -1;
        const update = () => {
            ticking = false;
            const r = scrub.getBoundingClientRect(), vh = window.innerHeight;
            const p = Math.min(1, Math.max(0, (vh * .8 - r.top) / (r.height + vh * .2)));
            const lit = Math.round(p * words.length);
            if (lit === lastLit) return;
            lastLit = lit;
            words.forEach((w, i) => w.classList.toggle('on', i < lit));
        };
        window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
        window.addEventListener('resize', update);
        update();
    });

    /* 2. skills ticker: duplicate content so it loops seamlessly */
    document.querySelectorAll('.ab-ticker-track').forEach(tr => {
        const n = tr.children.length;
        tr.innerHTML += tr.innerHTML;
        [...tr.children].slice(n).forEach(c => c.setAttribute('aria-hidden', 'true'));
    });

    /* 3. Baku local time (Contact) */
    const clocks = document.querySelectorAll('.ab-clock');
    if (clocks.length) {
        const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Baku', hour: '2-digit', minute: '2-digit' });
        const tick = () => { const t = fmt.format(new Date()); clocks.forEach(c => { c.textContent = t; }); };
        tick();
        setInterval(tick, 15000);
    }

    /* ======================= CERTIFICATES ======================= */
    document.querySelectorAll('.ct-group').forEach(g => {
        const n = g.querySelectorAll('li').length;
        const c = g.querySelector('.ct-count');
        if (c) c.textContent = String(n).padStart(2, '0') + (n === 1 ? ' course' : ' courses');
    });

    /* phones: course groups collapse into tap-to-open lists */
    document.querySelectorAll('.ct-group').forEach(g => {
        const h = g.querySelector('header');
        if (!h) return;
        h.setAttribute('role', 'button');
        h.setAttribute('tabindex', '0');
        h.setAttribute('aria-expanded', 'false');
        const toggle = () => {
            const open = g.classList.toggle('is-open');
            h.setAttribute('aria-expanded', String(open));
        };
        h.addEventListener('click', () => { if (window.innerWidth <= 760) toggle(); });
        h.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && window.innerWidth <= 760) { e.preventDefault(); toggle(); } });
    });

    /* phones: dots under the swipeable award cards */
    const awards = document.querySelector('.ct-awards');
    if (awards) {
        const cards = [...awards.querySelectorAll('.ct-award')];
        const dotsEl = document.createElement('div');
        dotsEl.className = 'ct-dots';
        cards.forEach((c, i) => {
            const d = document.createElement('button');
            d.type = 'button';
            d.setAttribute('aria-label', 'Award ' + (i + 1));
            d.addEventListener('click', () => awards.scrollTo({ left: c.offsetLeft - awards.offsetLeft, behavior: 'smooth' }));
            dotsEl.appendChild(d);
        });
        awards.after(dotsEl);
        const mark = () => {
            const i = Math.round(awards.scrollLeft / Math.max(1, (cards[1] ? cards[1].offsetLeft - cards[0].offsetLeft : 1)));
            [...dotsEl.children].forEach((d, k) => d.classList.toggle('is-on', k === Math.min(cards.length - 1, i)));
        };
        awards.addEventListener('scroll', () => requestAnimationFrame(mark), { passive: true });
        mark();
    }

    /* ======================= CONTACT ======================= */

    /* magnetic "Say hello" button */
    const zone = document.querySelector('.cx-magnet-zone');
    const magnet = zone && zone.querySelector('.cx-magnet');
    if (magnet && !reduce && window.matchMedia('(hover: hover)').matches) {
        const inner = magnet.querySelector('.cx-magnet-inner');
        zone.addEventListener('pointermove', e => {
            const r = zone.getBoundingClientRect();
            const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
            magnet.style.transform = `translate(${dx * .35}px, ${dy * .35}px)`;
            inner.style.transform = `translate(${dx * .15}px, ${dy * .15}px)`;
        });
        zone.addEventListener('pointerleave', () => { magnet.style.transform = ''; inner.style.transform = ''; });
    }

    /* copy email */
    document.querySelectorAll('.cx-copy').forEach(btn => {
        const hint = btn.querySelector('.cx-copy-hint');
        btn.addEventListener('click', async () => {
            const text = btn.dataset.copy;
            try {
                await navigator.clipboard.writeText(text);
                btn.classList.add('is-copied');
                hint.textContent = 'Copied ✓';
                setTimeout(() => { btn.classList.remove('is-copied'); hint.textContent = 'Copy'; }, 1800);
            } catch (e) {
                window.location.href = 'mailto:' + text;
            }
        });
    });

    /* footer year */
    document.querySelectorAll('.cx-year').forEach(y => { y.textContent = new Date().getFullYear(); });

    /* ======================= PROJECTS ======================= */
    const list = document.querySelector('.pj-list');
    if (!list) return;
    const items = [...list.querySelectorAll('.pj-item')];

    /* numbering */
    /* ---------- phones: compact tap-to-open cards (built from each row) ---------- */
    items.forEach((it, i) => {
        const link = it.querySelector('.pj-link');
        const name = it.querySelector('.pj-name').textContent;
        const tags = it.querySelector('.pj-tags').textContent;
        const desc = it.querySelector('.pj-desc').textContent;
        const go = it.querySelector('.pj-go').textContent.replace('↗', '').trim();
        const m = document.createElement('div');
        m.className = 'pj-m';
        m.innerHTML = `
            <button type="button" class="pj-m-head" aria-expanded="false">
                <span class="pj-m-num"></span>
                <span class="pj-m-text"><span class="pj-m-name">${name}</span><span class="pj-m-meta">${tags}</span></span>
                <span class="pj-m-plus" aria-hidden="true"></span>
            </button>
            <div class="pj-m-body"><div class="pj-m-inner">
                <canvas class="pj-art" aria-hidden="true"></canvas>
                <p class="pj-m-metric">${it.dataset.metric || ''}</p>
                <p class="pj-m-desc">${desc}</p>
                <a class="pj-m-go" href="${link.href}" target="_blank" rel="noopener">Open ${go} <i>↗</i></a>
            </div></div>`;
        const head = m.querySelector('.pj-m-head');
        head.addEventListener('click', () => {
            const open = !it.classList.contains('is-open');
            items.forEach(x => {
                x.classList.toggle('is-open', x === it && open);
                const h = x.querySelector('.pj-m-head');
                if (h) h.setAttribute('aria-expanded', String(x === it && open));
            });
        });
        it.appendChild(m);
        if (i === 0) { it.classList.add('is-open'); head.setAttribute('aria-expanded', 'true'); }
    });

    const renumber = () => {
        let k = 0;
        items.forEach(it => {
            if (it.classList.contains('is-hidden')) return;
            const n = String(++k).padStart(2, '0');
            it.querySelectorAll('.pj-num, .pj-m-num').forEach(el => { el.textContent = n; });
        });
    };
    renumber();

    /* filters */
    document.querySelectorAll('.pj-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.pj-chip').forEach(c => c.classList.toggle('is-on', c === chip));
            const f = chip.dataset.filter;
            items.forEach(it => it.classList.toggle('is-hidden', f !== 'all' && it.dataset.cat !== f));
            renumber();
            if (!reduce) items.filter(it => !it.classList.contains('is-hidden')).forEach((it, i) =>
                it.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }],
                    { duration: 420, delay: i * 55, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }));
        });
    });

    /* ---------- tiny generative charts, one per project ---------- */
    const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const grid = (c, w, h, step = 24) => {
        c.strokeStyle = 'rgba(255,255,255,.045)'; c.lineWidth = 1;
        c.beginPath();
        for (let x = step; x < w; x += step) { c.moveTo(x + .5, 0); c.lineTo(x + .5, h); }
        for (let y = step; y < h; y += step) { c.moveTo(0, y + .5); c.lineTo(w, y + .5); }
        c.stroke();
    };
    const label = (c, txt, x, y, col = 'rgba(255,255,255,.45)', align = 'left') => {
        c.fillStyle = col; c.font = '500 10px Inter, sans-serif'; c.textAlign = align; c.fillText(txt, x, y);
    };
    const dot = (c, x, y, r, col, glow) => {
        c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = col;
        if (glow) { c.shadowColor = col; c.shadowBlur = glow; }
        c.fill(); c.shadowBlur = 0;
    };

    const ART = {
        match(c, w, h, t) {
            /* two student profiles -> habit bars fill -> compatibility ring -> rent split in half */
            const cyc = t % 6.5, p = Math.min(1, cyc / 3), ease = 1 - Math.pow(1 - p, 3);
            const rows = ['City', 'Budget', 'Sleep', 'Tidy'];
            const A = [.82, .55, .3, .72], B = [.82, .6, .36, .78], score = 92;
            const cw = Math.min(110, w * .32), top = 16, rowH = 24;
            const card = (x, name, vals, other) => {
                c.fillStyle = 'rgba(255,255,255,.04)'; c.fillRect(x, top, cw, 22 + rows.length * rowH + 6);
                c.strokeStyle = 'rgba(255,255,255,.1)'; c.strokeRect(x + .5, top + .5, cw - 1, 22 + rows.length * rowH + 5);
                dot(c, x + 13, top + 12, 6, 'rgba(255,255,255,.85)');
                label(c, name, x + 24, top + 15, '#fff');
                rows.forEach((lab, i) => {
                    const y = top + 30 + i * rowH, bw = cw - 16, v = vals[i] * ease;
                    const same = Math.abs(vals[i] - other[i]) < .1;
                    label(c, lab, x + 8, y + 4, 'rgba(255,255,255,.45)');
                    c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect(x + 8, y + 8, bw, 4);
                    c.fillStyle = same && p > .6 ? RED : 'rgba(255,255,255,.55)'; c.fillRect(x + 8, y + 8, bw * v, 4);
                });
            };
            card(12, 'Student A', A, B);
            card(w - cw - 12, 'Student B', B, A);
            /* compatibility ring */
            const cx = w / 2, cy = top + 58, R = Math.min(34, (w - 2 * cw - 40) / 2);
            c.lineWidth = 6; c.strokeStyle = 'rgba(255,255,255,.08)';
            c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.stroke();
            c.strokeStyle = RED; c.shadowColor = RED; c.shadowBlur = 12;
            c.beginPath(); c.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (score / 100) * ease); c.stroke();
            c.shadowBlur = 0; c.lineWidth = 1;
            c.fillStyle = '#fff'; c.font = '700 15px Inter, sans-serif'; c.textAlign = 'center';
            c.fillText(Math.round(score * ease) + '%', cx, cy + 5);
            label(c, 'match', cx, cy + 18, 'rgba(255,255,255,.5)', 'center');
            /* rent split */
            if (cyc > 3.2) {
                const a = Math.min(1, (cyc - 3.2) / .6), y = h - 18;
                c.globalAlpha = a;
                label(c, 'Rent  €900', cx - 6, y, 'rgba(255,255,255,.45)', 'right');
                label(c, '→  €450 each', cx + 4, y, RED, 'left');
                c.globalAlpha = 1;
            }
        },
        taxi(c, w, h, t) {
            /* street network; grey = random agent wandering, accent = learned Q-Learning route */
            const r = rng(13), cols = 9, rows = 5, P = 22;
            const gx = (w - 2 * P) / (cols - 1), gy = (h - 2 * P - 14) / (rows - 1);
            const N = [];
            for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++)
                N.push([P + i * gx + (r() - .5) * gx * .35, P + j * gy + (r() - .5) * gy * .35]);
            const at = (i, j) => N[j * cols + i];
            for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
                const a = at(i, j), main = j === 2 || i === 4;
                c.strokeStyle = main ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.08)';
                c.lineWidth = main ? 2 : 1;
                if (i < cols - 1) { const b = at(i + 1, j); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }
                if (j < rows - 1) { const b = at(i, j + 1); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }
            }
            c.lineWidth = 1;
            const path = (cells, prog, col, width, dash) => {
                const pts = cells.map(([i, j]) => at(i, j)), n = (pts.length - 1) * prog;
                c.strokeStyle = col; c.lineWidth = width; c.setLineDash(dash || []);
                c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
                for (let k = 1; k <= Math.floor(n); k++) c.lineTo(pts[k][0], pts[k][1]);
                const k = Math.floor(n), f = n - k;
                let head = pts[k];
                if (k < pts.length - 1) { head = [pts[k][0] + (pts[k + 1][0] - pts[k][0]) * f, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * f]; c.lineTo(head[0], head[1]); }
                c.stroke(); c.setLineDash([]); c.lineWidth = 1;
                return head;
            };
            const taxiAt = [0, 4], pax = [4, 1], dest = [8, 3];
            const randomWalk = [[0,4],[1,4],[1,3],[0,3],[0,2],[1,2],[2,2],[2,3],[3,3],[3,4],[4,4],[4,3],[3,3],[3,2],[3,1],[4,1],[5,1],[5,0],[6,0],[6,1],[7,1],[7,2],[6,2],[6,3],[7,3],[7,4],[8,4],[8,3]];
            const learned = [[0,4],[0,3],[0,2],[1,2],[2,2],[3,2],[4,2],[4,1],[4,2],[5,2],[6,2],[7,2],[8,2],[8,3]];
            const cyc = t % 6, prog = Math.min(1, cyc / 3.6);
            path(randomWalk, 1, 'rgba(255,255,255,.18)', 1.2, [3, 4]);
            c.shadowColor = RED; c.shadowBlur = 10;
            const head = path(learned, prog, RED, 2.4);
            c.shadowBlur = 0;
            const T = at(...taxiAt), Pp = at(...pax), D = at(...dest);
            dot(c, T[0], T[1], 4, 'rgba(255,255,255,.6)');
            c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.beginPath(); c.arc(Pp[0], Pp[1], 6, 0, Math.PI * 2); c.stroke(); c.lineWidth = 1;
            c.fillStyle = '#fff'; c.fillRect(D[0] - 5, D[1] - 5, 10, 10);
            dot(c, head[0], head[1], 5, '#fff', 14);
            label(c, 'passenger', Pp[0] + 9, Pp[1] - 7, 'rgba(255,255,255,.7)');
            label(c, 'drop-off', D[0] - 8, D[1] + 18, 'rgba(255,255,255,.7)', 'right');
            label(c, '— random agent', P, h - 6, 'rgba(255,255,255,.45)');
            label(c, '— Q-learning', w - P, h - 6, RED, 'right');
        },
        screen(c, w, h, t) {
            /* recall vs share of papers screened: 95% recall reached after ~49% → 50.7% saved */
            const P = 26, W = w - 2 * P, H = h - 2 * P, k = 5, cut = .493;
            const X = x => P + x * W, Y = y => P + H - y * H;
            c.fillStyle = acc(.12); c.fillRect(X(cut), P, W * (1 - cut), H);
            label(c, '50.7% work saved', X(cut) + 8, P + H * .62, RED);
            c.strokeStyle = 'rgba(255,255,255,.3)'; c.setLineDash([4, 4]);
            c.beginPath(); c.moveTo(P, Y(.95)); c.lineTo(P + W, Y(.95)); c.stroke();
            c.beginPath(); c.moveTo(X(cut), P); c.lineTo(X(cut), P + H); c.stroke(); c.setLineDash([]);
            label(c, '95% recall', P + 4, Y(.95) - 6);
            const prog = Math.min(1, (t % 5) / 2.6), pts = [];
            for (let i = 0; i <= 90 * prog; i++) { const x = i / 90; pts.push([X(x), Y(1 - Math.pow(1 - x, k))]); }
            if (pts.length > 1) {
                c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]));
                c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke(); c.lineWidth = 1;
                const e = pts[pts.length - 1]; dot(c, e[0], e[1], 4.5, RED, 14);
            }
            const r = rng(9);   /* ranked papers along the bottom: relevant ones cluster at the front */
            for (let i = 0; i < 60; i++) {
                const x = i / 60, rel = r() < Math.pow(1 - x, 3) * .5;
                c.fillStyle = rel ? RED : 'rgba(255,255,255,.18)';
                c.fillRect(X(x), P + H + 6, Math.max(2, W / 60 - 2), rel ? 8 : 4);
            }
            label(c, 'papers screened →', P + W, h - 4, 'rgba(255,255,255,.45)', 'right');
        },
        mood(c, w, h, t) {
            const r = rng(7), P = 22, cx = w / 2, cy = h / 2;
            c.strokeStyle = 'rgba(255,255,255,.18)'; c.beginPath();
            c.moveTo(P, cy); c.lineTo(w - P, cy); c.moveTo(cx, P); c.lineTo(cx, h - P); c.stroke();
            label(c, 'HAPPY', w - P, cy - 6, undefined, 'right'); label(c, 'SAD', P, cy - 6);
            label(c, 'ENERGETIC', cx + 6, P + 8); label(c, 'CALM', cx + 6, h - P);
            for (let i = 0; i < 46; i++) {
                const bx = r(), by = r(), ph = r() * 6.28;
                const x = P + (bx * (w - 2 * P)) + Math.sin(t * .8 + ph) * 3;
                const y = P + (by * (h - 2 * P)) + Math.cos(t * .7 + ph) * 3;
                const hot = x > cx && y < cy;
                dot(c, x, y, hot ? 3 : 2.2, hot ? RED : 'rgba(255,255,255,.55)');
            }
            const a = t * .7, x = cx + Math.cos(a) * (w * .28), y = cy + Math.sin(a * 1.3) * (h * .28);
            dot(c, x, y, 6, '#fff', 18);
            label(c, '♪ now playing', x + 10, y + 3, '#fff');
        },
        roc(c, w, h, t) {
            const P = 26, W = w - 2 * P, H = h - 2 * P, k = 11.8;
            c.strokeStyle = 'rgba(255,255,255,.25)'; c.setLineDash([4, 4]);
            c.beginPath(); c.moveTo(P, P + H); c.lineTo(P + W, P); c.stroke(); c.setLineDash([]);
            c.strokeStyle = 'rgba(255,255,255,.2)'; c.strokeRect(P + .5, P + .5, W, H);
            const prog = Math.min(1, (t % 5) / 2.5);
            const pts = [];
            for (let i = 0; i <= 80 * prog; i++) { const x = i / 80; pts.push([P + x * W, P + H - (1 - Math.pow(1 - x, k)) * H]); }
            if (pts.length > 1) {
                c.beginPath(); c.moveTo(P, P + H); pts.forEach(p => c.lineTo(p[0], p[1])); c.lineTo(pts[pts.length - 1][0], P + H); c.closePath();
                const g = c.createLinearGradient(0, P, 0, P + H); g.addColorStop(0, acc(.35)); g.addColorStop(1, acc(0));
                c.fillStyle = g; c.fill();
                c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]));
                c.strokeStyle = RED; c.lineWidth = 2.2; c.shadowColor = RED; c.shadowBlur = 10; c.stroke(); c.shadowBlur = 0; c.lineWidth = 1;
                const e = pts[pts.length - 1]; dot(c, e[0], e[1], 3.5, '#fff', 10);
            }
            label(c, 'AUC 0.922', P + W - 6, P + H - 10, '#fff', 'right');
            label(c, 'FPR →', P, h - 8); label(c, 'TPR', 4, P + 8);
        },
        graph(c, w, h, t) {
            const r = rng(21), N = 30, nodes = [];
            for (let i = 0; i < N; i++) {
                const ph = r() * 6.28;
                nodes.push({ x: 20 + r() * (w - 40) + Math.sin(t * .5 + ph) * 6, y: 20 + r() * (h - 40) + Math.cos(t * .4 + ph) * 6, big: r() < .16 });
            }
            nodes.forEach((n, i) => {
                const near = nodes.map((m, j) => [j, Math.hypot(m.x - n.x, m.y - n.y)]).sort((a, b) => a[1] - b[1]).slice(1, 3);
                near.forEach(([j]) => {
                    const m = nodes[j];
                    c.strokeStyle = (n.big || m.big) ? acc(.35) : 'rgba(255,255,255,.12)';
                    c.beginPath(); c.moveTo(n.x, n.y); c.lineTo(m.x, m.y); c.stroke();
                    if (i % 4 === 0) {
                        const p = (t * .5 + i * .13) % 1;
                        dot(c, n.x + (m.x - n.x) * p, n.y + (m.y - n.y) * p, 1.6, '#fff');
                    }
                });
            });
            nodes.forEach(n => dot(c, n.x, n.y, n.big ? 5 : 2.4, n.big ? RED : 'rgba(255,255,255,.7)', n.big ? 12 : 0));
            label(c, 'citations', 12, h - 10);
        },
        cltv(c, w, h, t) {
            const r = rng(3), P = 22, prog = Math.min(1, (t % 5.5) / 3);
            for (let k = 0; k < 14; k++) {
                const top = k < 3, slope = top ? .75 + r() * .2 : .15 + r() * .45;
                c.beginPath();
                let y = 0;
                const steps = 40;
                for (let i = 0; i <= steps * prog; i++) {
                    if (r() < .5) y += slope / steps * (1 + r());
                    const X = P + (i / steps) * (w - 2 * P), Y = h - P - Math.min(1, y) * (h - 2 * P);
                    i ? c.lineTo(X, Y) : c.moveTo(X, Y);
                }
                c.strokeStyle = top ? RED : 'rgba(255,255,255,.22)'; c.lineWidth = top ? 2 : 1;
                if (top) { c.shadowColor = RED; c.shadowBlur = 8; }
                c.stroke(); c.shadowBlur = 0; c.lineWidth = 1;
            }
            label(c, 'top customers', w - P, P + 4, RED, 'right'); label(c, 'time →', P, h - 6);
        },
        sigmoid(c, w, h, t) {
            const r = rng(11), P = 24, f = x => 1 / (1 + Math.exp(-(x - .5) * 9));
            for (let i = 0; i < 70; i++) {
                const x = r(), yes = r() < f(x);
                dot(c, P + x * (w - 2 * P), yes ? P + r() * 10 : h - P - r() * 10, 2.2, yes ? acc(.75) : 'rgba(255,255,255,.45)');
            }
            c.beginPath();
            for (let i = 0; i <= 100; i++) { const x = i / 100; const X = P + x * (w - 2 * P), Y = h - P - f(x) * (h - 2 * P); i ? c.lineTo(X, Y) : c.moveTo(X, Y); }
            c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke(); c.lineWidth = 1;
            const sx = (Math.sin(t * .9) + 1) / 2, X = P + sx * (w - 2 * P), Y = h - P - f(sx) * (h - 2 * P);
            c.strokeStyle = acc(.5); c.beginPath(); c.moveTo(X, P); c.lineTo(X, h - P); c.stroke();
            dot(c, X, Y, 5, RED, 14);
            label(c, 'p = ' + f(sx).toFixed(2), X + 8, Y - 6, '#fff');
            label(c, 'checks use-by', P, P - 8); label(c, "doesn't", P, h - 6);
        },
        candles(c, w, h, t) {
            const r = rng(5), cw = 9, gap = 5, n = Math.ceil(w / (cw + gap)) + 2, shift = (t * 14) % (cw + gap);
            let v = .5; const data = [];
            for (let i = 0; i < n + 40; i++) { const o = v; v = Math.min(.9, Math.max(.1, v + (r() - .5) * .12)); data.push([o, v, Math.max(o, v) + r() * .05, Math.min(o, v) - r() * .05]); }
            const off = ((Math.floor(t * 14 / (cw + gap)) % 40) + 40) % 40;
            for (let i = 0; i < n; i++) {
                const [o, cl, hi, lo] = data[i + off], x = i * (cw + gap) - shift, up = cl >= o;
                const Y = v => h - 18 - v * (h - 36);
                c.strokeStyle = up ? 'rgba(255,255,255,.7)' : RED;
                c.beginPath(); c.moveTo(x + cw / 2, Y(hi)); c.lineTo(x + cw / 2, Y(lo)); c.stroke();
                c.fillStyle = up ? 'rgba(255,255,255,.85)' : RED;
                c.fillRect(x, Y(Math.max(o, cl)), cw, Math.max(2, Math.abs(Y(o) - Y(cl))));
            }
            label(c, 'NASDAQ · closing auction', 12, 16, '#fff');
        },
        route(c, w, h, t) {
            const pts = [[.12, .7], [.32, .3], [.52, .62], [.7, .28], [.86, .58]].map(([x, y]) => [x * w, y * h]);
            for (let y = 10; y < h; y += 14) for (let x = 10; x < w; x += 14) { c.fillStyle = 'rgba(255,255,255,.06)'; c.fillRect(x, y, 1.5, 1.5); }
            c.setLineDash([5, 6]); c.lineDashOffset = -t * 20;
            c.strokeStyle = acc(.7); c.lineWidth = 1.6; c.beginPath();
            pts.forEach((p, i) => { if (!i) c.moveTo(p[0], p[1]); else { const q = pts[i - 1]; c.quadraticCurveTo((q[0] + p[0]) / 2, Math.min(q[1], p[1]) - 30, p[0], p[1]); } });
            c.stroke(); c.setLineDash([]); c.lineWidth = 1;
            const seg = (t * .5) % (pts.length - 1), i = Math.floor(seg), f = seg - i, a = pts[i], b = pts[i + 1];
            const mx = (a[0] + b[0]) / 2, my = Math.min(a[1], b[1]) - 30;
            const x = (1 - f) * (1 - f) * a[0] + 2 * (1 - f) * f * mx + f * f * b[0], y = (1 - f) * (1 - f) * a[1] + 2 * (1 - f) * f * my + f * f * b[1];
            pts.forEach((p, k) => dot(c, p[0], p[1], 4, k === pts.length - 1 ? RED : '#fff'));
            dot(c, x, y, 5, RED, 16);
            const dx = pts[4][0] + 14, dy = pts[4][1] - 34;
            c.strokeStyle = 'rgba(255,255,255,.7)'; c.strokeRect(dx, dy, 26, 32);
            label(c, 'PDF', dx + 13, dy + 20, RED, 'center');
        },
        blocks(c, w, h, t) {
            c.fillStyle = 'rgba(255,255,255,.05)'; c.fillRect(12, 12, w * .22, h - 24);
            for (let i = 0; i < 6; i++) { c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(20, 24 + i * 16, w * .22 - 30 - (i % 3) * 8, 5); }
            const x0 = w * .22 + 24, cols = 3, bw = (w - x0 - 14 - (cols - 1) * 8) / cols, bh = 34;
            const active = Math.floor(t * 1.2) % 9;
            for (let i = 0; i < 9; i++) {
                const cx = x0 + (i % cols) * (bw + 8), cy = 40 + Math.floor(i / cols) * (bh + 10);
                c.fillStyle = 'rgba(255,255,255,.06)'; c.fillRect(cx, cy, bw, bh);
                c.fillStyle = 'rgba(255,255,255,.22)'; c.fillRect(cx + 8, cy + 9, bw * .55, 4); c.fillRect(cx + 8, cy + 19, bw * .35, 4);
                if (i <= active) {
                    const flag = [1, 4, 6].includes(i);
                    c.strokeStyle = flag ? RED : 'rgba(255,255,255,.5)'; c.lineWidth = i === active ? 2 : 1;
                    c.strokeRect(cx + .5, cy + .5, bw - 1, bh - 1); c.lineWidth = 1;
                    label(c, flag ? '!' : '✓', cx + bw - 10, cy + 14, flag ? RED : 'rgba(255,255,255,.7)', 'center');
                }
            }
            c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(x0, 20, w * .3, 7);
            label(c, 'heuristic ' + (active + 1) + '/10', w - 14, h - 10, '#fff', 'right');
        }
    };

    function paint(canvas, kind, t) {
        const c = canvas.getContext('2d');
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const w = canvas.clientWidth, h = canvas.clientHeight;
        if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
            canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
        }
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        readAccent();
        c.clearRect(0, 0, w, h);
        c.fillStyle = '#0b0b0c'; c.fillRect(0, 0, w, h);
        grid(c, w, h);
        (ART[kind] || ART.graph)(c, w, h, t);
    }

    /* ---------- desktop: floating preview that follows the cursor ---------- */
    const preview = document.querySelector('.pj-preview');
    const pCanvas = preview && preview.querySelector('.pj-canvas');
    const pMetric = preview && preview.querySelector('.pj-preview-metric');
    const fine = window.matchMedia('(hover: hover) and (min-width: 761px)');
    let kind = null, on = false, tx = 0, ty = 0, x = 0, y = 0, raf = 0, t0 = performance.now();

    const frame = now => {
        raf = 0;
        if (!on) return;
        x += (tx - x) * (reduce ? 1 : .16);
        y += (ty - y) * (reduce ? 1 : .16);
        const vx = Math.max(-1, Math.min(1, (tx - x) / 60));
        preview.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${vx * 4}deg)`;
        paint(pCanvas, kind, reduce ? 1.5 : Math.max(0, now - t0) / 1000);
        raf = requestAnimationFrame(frame);
    };
    /* the card lives over the right-hand (tags) column so it never hides the title;
       it follows the cursor vertically and drifts a little horizontally */
    const place = e => {
        const pw = preview.offsetWidth || 340, ph = preview.offsetHeight || 260;
        const lr = list.getBoundingClientRect();
        const anchor = lr.right - pw - 130;
        const drift = ((e.clientX - lr.left) / lr.width - .5) * 40;
        let nx = anchor + drift, ny = e.clientY - ph / 2;
        nx = Math.max(12, Math.min(window.innerWidth - pw - 12, nx));
        ny = Math.max(70, Math.min(window.innerHeight - ph - 12, ny));
        tx = nx; ty = ny;
    };

    if (preview) {
        items.forEach(it => {
            it.addEventListener('pointerenter', e => {
                if (!fine.matches) return;
                const first = !on;
                kind = it.dataset.art;
                pMetric.textContent = it.dataset.metric || '';
                place(e);
                if (first) { x = tx; y = ty + 20; t0 = performance.now(); }
                on = true;
                preview.classList.add('is-on');
                if (!raf) raf = requestAnimationFrame(frame);
            });
        });
        let px = -1, py = -1;
        list.addEventListener('pointermove', e => { px = e.clientX; py = e.clientY; if (on) place(e); });
        list.addEventListener('pointerleave', () => { on = false; preview.classList.remove('is-on'); });
        /* hide the card as soon as the list scrolls away from under the cursor */
        window.addEventListener('scroll', () => {
            if (!on) return;
            const r = list.getBoundingClientRect();
            if (px < r.left || px > r.right || py < r.top || py > r.bottom) { on = false; preview.classList.remove('is-on'); }
        }, { passive: true });
    }

    /* ---------- phones / touch: a live chart inside every row ---------- */
    const inline = [];
    items.forEach(it => {
        const cv = it.querySelector('.pj-m .pj-art');
        if (cv) inline.push({ cv, it, kind: it.dataset.art, vis: false });
    });
    const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => {
        es.forEach(e => { const o = inline.find(i => i.cv === e.target); if (o) o.vis = e.isIntersecting; });
    }) : null;
    inline.forEach(o => io && io.observe(o.cv));
    const inlineLoop = now => {
        if (!fine.matches) inline.forEach(o => { if (o.vis && o.it.classList.contains('is-open') && o.cv.clientWidth) paint(o.cv, o.kind, reduce ? 1.5 : now / 1000); });
        if (!reduce) requestAnimationFrame(inlineLoop);
    };
    requestAnimationFrame(inlineLoop);
})();
