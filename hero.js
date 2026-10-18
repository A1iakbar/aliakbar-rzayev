/* ==========================================================
   Intro hero animation
   1) a white dot falls and bounces under a spotlight
   2) a bar drops onto it → "!"  → the bar tips over
   3) the letters of your name tumble in around it
   4) the name morphs letter-by-letter into the final word
   5) the word slides down, a star field appears and the particles
      fly together to draw your photo
   ========================================================== */
(() => {
    /* ---------------- Settings: change these ---------------- */
    const CFG = {
        name: 'ALIAKBAR',          // word built in step 3
        word: 'PORTFOLIO',         // final big word
        photo: 'photo.png',        // your photo inside the repo (best: background removed, PNG)
        photoFallback: 'https://i.ibb.co/GQRQ8bPN/Photo.jpg',
        fullIntroOncePerSession: true, // on refresh in the same tab, play the short version

        /* portrait placement (fractions of the hero height / width) */
        photoTop: .08,       // where the top of your head sits (0 = top of screen)
        photoBottom: 1.05,   // where the bottom of the photo ends (1 = bottom of screen)
        photoMaxWidth: .6,   // max width of the person on desktop
        contrast: 1.5,       // higher = more black & white, fewer grey particles

        /* big word size */
        wordWidth: .62       // width of the final word on desktop (mobile uses .9)
    };
    /* -------------------------------------------------------- */

    const hero = document.getElementById('home');
    if (!hero) return;
    const root = document.documentElement;
    const wrap = hero.querySelector('.hx-word-wrap');
    const wordEl = hero.querySelector('.hx-word');
    const measure = hero.querySelector('.hx-measure');
    const meta = hero.querySelector('.hx-meta');
    const spot = hero.querySelector('.hx-spot');
    const canvas = hero.querySelector('.hx-canvas');
    const skipBtn = hero.querySelector('.hx-skip');

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let seen = false;
    try { seen = CFG.fullIntroOncePerSession && sessionStorage.getItem('hxSeen') === '1'; } catch (e) { /* storage blocked */ }

    const IN = 'cubic-bezier(.55,0,1,.45)';   // gravity: speeding up
    const OUT = 'cubic-bezier(0,.55,.45,1)';  // rising: slowing down
    const rand = (a, b) => a + Math.random() * (b - a);

    /* ---------------- skip-able sleep ---------------- */
    let skipCtl = new AbortController();
    const SKIP = new Error('skip');
    const sleep = ms => new Promise((res, rej) => {
        if (skipCtl.signal.aborted) return rej(SKIP);
        const t = setTimeout(res, ms);
        skipCtl.signal.addEventListener('abort', () => { clearTimeout(t); rej(SKIP); }, { once: true });
    });

    /* ---------------- word building ---------------- */
    let slots = [];
    const ch = c => (c === ' ' ? ' ' : c);

    function makeGlyph(c) {
        const g = document.createElement('span');
        g.className = 'hx-g';
        g.textContent = ch(c);
        return g;
    }
    function addSlot(c, hidden) {
        const s = document.createElement('span');
        s.className = 'hx-l';
        const g = makeGlyph(c);
        if (hidden) g.style.opacity = '0';
        s.appendChild(g);
        wordEl.appendChild(s);
        slots.push(s);
        return s;
    }
    function buildWord(text, hidden) {
        wordEl.textContent = '';
        slots = [];
        [...text].forEach(c => addSlot(c, hidden));
        wordEl.setAttribute('aria-label', text);
    }
    const glyph = i => slots[i].querySelector('.hx-g');

    /* ---------------- layout ---------------- */
    let fs = 100, introScale = .45, pose = { intro: '', final: '' };

    function textWidth(text, size) {
        measure.style.fontSize = size + 'px';
        measure.textContent = '';
        [...text].forEach(c => {
            const s = document.createElement('span');
            s.className = 'hx-l';
            s.appendChild(makeGlyph(c));
            measure.appendChild(s);
        });
        return measure.getBoundingClientRect().width;
    }

    function layout() {
        const W = hero.clientWidth, H = hero.clientHeight;
        const w100 = textWidth(CFG.word, 100);
        const maxW = Math.min(W * (W < 600 ? .9 : CFG.wordWidth), 1300);
        fs = Math.min(100 * maxW / w100, H * .22);
        wordEl.style.fontSize = fs + 'px';
        measure.style.fontSize = fs + 'px';

        const finalW = w100 * fs / 100;
        hero.style.setProperty('--ww', finalW + 'px');

        const nameW = textWidth(CFG.name, fs);
        introScale = Math.min(.5, (W * (W < 600 ? .62 : .36)) / nameW);

        const wh = measure.getBoundingClientRect().height || fs * .86;
        const metaTop = H - parseFloat(getComputedStyle(meta).bottom) - meta.offsetHeight;
        const finalTop = metaTop - wh - Math.max(6, fs * .04);
        const centerTop = H * .5 - wh / 2;
        pose.intro = `translate(-50%, ${centerTop}px) scale(${introScale})`;
        pose.final = `translate(-50%, ${finalTop}px) scale(1)`;
    }

    /* ---------------- spotlight follows an element ---------------- */
    let follow = null;
    (function track() {
        if (follow && follow.isConnected) {
            const r = follow.getBoundingClientRect(), h = hero.getBoundingClientRect();
            spot.style.setProperty('--x', (r.left + r.width / 2 - h.left) + 'px');
            spot.style.setProperty('--y', (r.top + r.height / 2 - h.top) + 'px');
        }
        requestAnimationFrame(track);
    })();

    const flash = () => spot.animate([{ opacity: 1 }, { opacity: .8 }], { duration: 500, easing: 'ease-out' });

    /* ---------------- the intro ---------------- */
    function stemIndex(text) {
        const i = text.toUpperCase().indexOf('I');
        return i >= 0 ? i : Math.floor(text.length / 2);
    }

    async function playIntro() {
        const W = hero.clientWidth, H = hero.clientHeight;
        const L = v => v / introScale;                     // screen px → word-local px
        buildWord(CFG.name, true);
        const iIdx = stemIndex(CFG.name);
        const stemSlot = slots[iIdx];
        const stem = glyph(iIdx);
        const dot = document.createElement('span');
        dot.className = 'hx-dot';
        dot.style.opacity = '0';
        stemSlot.appendChild(dot);

        wrap.style.transform = pose.intro;
        hero.classList.add('is-ready', 'is-intro');
        follow = dot;

        await sleep(450);

        /* 1. dot falls and bounces */
        const y0 = -L(H * .62), xA = -L(W * .1);
        dot.style.opacity = '1';
        await dot.animate([
            { transform: `translate(${xA}px, ${y0}px) scale(1,1)`, easing: IN },
            { transform: `translate(${xA * .55}px, 0px) scale(1.4,.65)`, offset: .3, easing: OUT },
            { transform: `translate(${-xA * .45}px, ${y0 * .4}px) scale(1,1)`, offset: .52, easing: IN },
            { transform: `translate(${-xA * .2}px, 0px) scale(1.3,.75)`, offset: .73, easing: OUT },
            { transform: `translate(${-xA * .06}px, ${y0 * .12}px) scale(1,1)`, offset: .86, easing: IN },
            { transform: 'translate(0px, 0px) scale(1.15,.85)', offset: .96 },
            { transform: 'translate(0px, 0px) scale(1,1)' }
        ], { duration: 1600, fill: 'both' }).finished;

        /* 2. the bar drops on top → "!" */
        stem.style.transformOrigin = '50% 100%';
        await stem.animate([
            { transform: `translateY(${-L(H * .6)}px) scale(1,1)`, opacity: 1, easing: IN },
            { transform: 'translateY(0px) scale(1,1)', opacity: 1, offset: .72 },
            { transform: 'translateY(0px) scale(1.1,.84)', opacity: 1, offset: .84 },
            { transform: 'translateY(0px) scale(1,1)', opacity: 1 }
        ], { duration: 600, fill: 'both' }).finished;
        flash();
        await sleep(380);

        /* 3. bar tips over while the letters tumble in */
        const order = [];
        for (let k = iIdx - 1; k >= 0; k--) order.push(k);
        for (let k = iIdx + 1; k < slots.length; k++) order.push(k);
        const STAG = 120, DUR = 780;
        const total = order.length * STAG + DUR;

        stem.animate([
            { transform: 'rotate(0deg)', easing: 'ease-in' },
            { transform: 'rotate(-14deg)', offset: .08, easing: 'cubic-bezier(.5,0,.3,1.4)' },
            { transform: 'rotate(68deg)', offset: .26 },
            { transform: 'rotate(74deg)', offset: .62, easing: 'cubic-bezier(.6,0,.2,1.3)' },
            { transform: 'rotate(-6deg)', offset: .86 },
            { transform: 'rotate(0deg)' }
        ], { duration: total, fill: 'both', composite: 'add' });

        let last;
        order.forEach((k, j) => {
            const side = k < iIdx ? -1 : 1;
            const dx = L(side * rand(W * .02, W * .07));
            const dy = -L(H * rand(.22, .38));
            const r = rand(150, 320) * (Math.random() < .5 ? -1 : 1);
            const g = glyph(k);
            last = g.animate([
                { transform: `translate(${dx}px, ${dy}px) rotate(${r}deg)`, opacity: 0, easing: 'cubic-bezier(.45,0,.9,.55)' },
                { opacity: 1, offset: .14 },
                { transform: `translate(0px, 0px) rotate(${r * .05}deg)`, opacity: 1, offset: .7, easing: OUT },
                { transform: `translate(0px, ${-L(12)}px) rotate(${-r * .02}deg)`, offset: .84, easing: IN },
                { transform: 'translate(0px, 0px) rotate(0deg)', opacity: 1 }
            ], { duration: DUR, delay: STAG * j, fill: 'both' });
            if (j === 0) setTimeout(() => { if (follow === dot) flash(); }, STAG * j + DUR * .7);
        });
        if (last) await last.finished;
        follow = wordEl;

        /* dot disappears */
        await dot.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(0)' }],
            { duration: 380, easing: 'ease-in', fill: 'forwards' }).finished;
        dot.remove();
        await sleep(520);

        /* 4. morph name → final word */
        await morph(CFG.word);
        await sleep(450);

        /* 5. slide down, reveal everything */
        const move = wrap.animate([{ transform: pose.intro }, { transform: pose.final }],
            { duration: 1100, easing: 'cubic-bezier(.76,0,.24,1)', fill: 'forwards' });
        setTimeout(reveal, 250);
        await move.finished;
        wrap.style.transform = pose.final;
        move.cancel();
    }

    async function morph(to) {
        for (let k = 0; k < to.length; k++) {
            let g;
            if (k < slots.length) {
                const old = glyph(k);
                g = makeGlyph(to[k]);
                old.replaceWith(g);
            } else {
                g = addSlot(to[k]).firstChild;
            }
            g.animate([
                { transform: 'perspective(400px) rotateX(-90deg)', opacity: .2, filter: 'blur(4px)' },
                { transform: 'perspective(400px) rotateX(0deg)', opacity: 1, filter: 'blur(0px)' }
            ], { duration: 280, easing: 'cubic-bezier(.2,.8,.2,1)' });
            await sleep(85);
        }
        while (slots.length > to.length) {
            const s = slots.pop();
            s.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160 }).finished.then(() => s.remove(), () => s.remove());
            await sleep(70);
        }
        wordEl.setAttribute('aria-label', to);
    }

    /* ---------------- end state ---------------- */
    let revealed = false;
    function reveal(quick) {
        if (revealed) return;
        revealed = true;
        follow = null;
        hero.classList.remove('is-intro');
        hero.classList.add('is-done');
        root.classList.remove('hx-intro');
        try { sessionStorage.setItem('hxSeen', '1'); } catch (e) { /* ignore */ }
        Particles.start(quick ? 'quick' : 'full');
    }

    function finishNow() {
        hero.getAnimations({ subtree: true }).forEach(a => a.cancel());
        buildWord(CFG.word, false);
        layout();
        wrap.style.transform = pose.final;
        hero.classList.add('is-ready');
        reveal(true);
    }

    function skip() {
        if (revealed && !hero.classList.contains('is-intro')) return;
        if (skipCtl.signal.aborted) return;
        skipCtl.abort();
    }

    /* ======================================================
       Particles: star field → portrait built from your photo
       ====================================================== */
    const Particles = (() => {
        const ctx = canvas.getContext('2d');
        let W = 0, H = 0, img32 = null, imgData = null;
        let n = 0;
        let x, y, vx, vy, tx, ty, sx, sy, dl, pa, sa, ph, scx, scy, cr, cg, cb, isStar;
        let mode = 'off', t0 = 0, running = false, visible = true;
        let mx = -1e5, my = -1e5, scrollP = 0;
        let photo = null, photoTried = false;
        const SZ = 2;

        function loadImage(src, cors) {
            return new Promise((res, rej) => {
                const im = new Image();
                if (cors) im.crossOrigin = 'anonymous';
                im.onload = () => res(im);
                im.onerror = rej;
                im.src = src;
            });
        }

        function readable(im) {
            try {
                const c = document.createElement('canvas');
                c.width = c.height = 2;
                const x2 = c.getContext('2d');
                x2.drawImage(im, 0, 0, 2, 2);
                x2.getImageData(0, 0, 1, 1);
                return true;
            } catch (e) { return false; }
        }

        const ready = (async () => {
            for (const [src, cors] of [[CFG.photo, false], [CFG.photoFallback, true]]) {
                if (!src) continue;
                try {
                    const im = await loadImage(src, cors);
                    if (readable(im)) { photo = im; break; }
                    console.warn('[hero] photo loaded but canvas cannot read it (CORS / file://):', src);
                } catch (e) { /* try next */ }
            }
            photoTried = true;
        })();

        /* decide which pixels belong to the person (not the background).
           The background colour is estimated per row from the left/right photo edges,
           so plain and gently graded studio backgrounds are removed too. */
        function makeKeyer(d, cols, rows) {
            let alphaBorder = false;
            for (let c = 0; c < cols; c++) if (d[c * 4 + 3] < 200) alphaBorder = true;
            for (let r = 0; r < rows; r++) if (d[(r * cols) * 4 + 3] < 200 || d[(r * cols + cols - 1) * 4 + 3] < 200) alphaBorder = true;
            if (alphaBorder) return (R, G, B, A) => A >= 128;

            const lastRow = Math.max(1, Math.floor(rows * .6));
            const L = [], Rr = [];
            const avg = (r, c0, c1) => {
                let a = 0, b = 0, e = 0, k = 0;
                for (let c = c0; c <= c1; c++) { const i = (r * cols + c) * 4; a += d[i]; b += d[i + 1]; e += d[i + 2]; k++; }
                return [a / k, b / k, e / k];
            };
            for (let r = 0; r < rows; r++) {
                const rr = Math.min(r, lastRow);
                L.push(avg(rr, 1, 3)); Rr.push(avg(rr, cols - 4, cols - 2));
            }
            /* how busy is the background? */
            let spread = 0;
            for (let r = 1; r < lastRow; r++) spread += Math.abs(L[r][0] - L[r - 1][0]) + Math.abs(Rr[r][1] - Rr[r - 1][1]);
            spread /= lastRow * 2;
            const lr = Math.abs(L[0][0] - Rr[0][0]) + Math.abs(L[0][1] - Rr[0][1]) + Math.abs(L[0][2] - Rr[0][2]);
            const simple = spread < 6 && lr < 120;
            if (!simple) {
                /* busy background: just keep the brighter pixels (works for dark photos) */
                return (R, G, B) => (.2126 * R + .7152 * G + .0722 * B) / 255 > .08;
            }
            return (R, G, B, A, u, v) => {
                if (A < 128) return false;
                const r = Math.min(rows - 1, Math.max(0, Math.floor(v * rows)));
                const l = L[r], q = Rr[r];
                const br = l[0] + (q[0] - l[0]) * u, bg = l[1] + (q[1] - l[1]) * u, bb = l[2] + (q[2] - l[2]) * u;
                return Math.hypot(R - br, G - bg, B - bb) > 38;
            };
        }

        function sample(im) {
            const iw = im.naturalWidth, ih = im.naturalHeight;
            const small = W < 700;

            /* pass 1: find the person's bounding box in the photo */
            const aw = 160, ah = Math.max(2, Math.round(aw * ih / iw));
            const ac = document.createElement('canvas');
            ac.width = aw; ac.height = ah;
            const ax_ = ac.getContext('2d', { willReadFrequently: true });
            ax_.drawImage(im, 0, 0, aw, ah);
            const ad = ax_.getImageData(0, 0, aw, ah).data;
            const keep1 = makeKeyer(ad, aw, ah);
            const trim = 2;
            let u0 = aw, u1 = 0, v0 = ah, v1 = 0;
            const colCount = new Uint16Array(aw), rowCount = new Uint16Array(ah);
            for (let r = trim; r < ah; r++) for (let c = trim; c < aw - trim; c++) {
                const i = (r * aw + c) * 4;
                if (keep1(ad[i], ad[i + 1], ad[i + 2], ad[i + 3], (c + .5) / aw, (r + .5) / ah)) { colCount[c]++; rowCount[r]++; }
            }
            const minC = ah * .015, minR = aw * .015;   // ignore stray specks
            for (let c = 0; c < aw; c++) if (colCount[c] > minC) { u0 = Math.min(u0, c); u1 = Math.max(u1, c); }
            for (let r = 0; r < ah; r++) if (rowCount[r] > minR) { v0 = Math.min(v0, r); v1 = Math.max(v1, r); }
            if (u1 <= u0 || v1 <= v0) { u0 = 0; u1 = aw - 1; v0 = 0; v1 = ah - 1; }
            /* box in real photo pixels; always keep everything down to the bottom of the photo */
            const bx0 = u0 / aw * iw, bx1 = (u1 + 1) / aw * iw, by0 = v0 / ah * ih, by1 = ih;

            /* place it: top of the head at photoTop, body runs off the bottom of the screen */
            const top = H * CFG.photoTop;
            let sc = (H * CFG.photoBottom - top) / (by1 - by0);
            const maxW = W * (small ? 1.5 : CFG.photoMaxWidth);   // on phones the shoulders may run off-screen
            if ((bx1 - bx0) * sc > maxW) sc = maxW / (bx1 - bx0);
            const pw = (bx1 - bx0) * sc, ph_ = (by1 - by0) * sc;
            const ox = W / 2 - pw / 2;
            /* if the width limit made it smaller, slide it down so the body still reaches the bottom */
            const oy = small ? top + H * .04 : Math.max(top, H * CFG.photoBottom - ph_);

            /* pass 2: sample the person on a fine grid */
            const maxN = small ? 10000 : 26000;
            let g = small ? 2.4 : 2.2;
            g = Math.max(g, Math.sqrt(pw * Math.min(ph_, H - oy) * .35 / maxN));
            const cols = Math.max(2, Math.round(pw / g)), rows = Math.max(2, Math.round(ph_ / g));
            const gx = pw / cols, gy = ph_ / rows;
            const gxi = (bx1 - bx0) / cols, gyi = (by1 - by0) / rows;
            const oc = document.createElement('canvas');
            oc.width = cols; oc.height = rows;
            const o = oc.getContext('2d', { willReadFrequently: true });
            o.imageSmoothingQuality = 'high';
            o.drawImage(im, bx0, by0, bx1 - bx0, by1 - by0, 0, 0, cols, rows);
            const d = o.getImageData(0, 0, cols, rows).data;

            const pts = [];
            const hist = new Uint32Array(256);
            for (let r = 0; r < rows; r++) {
                const py = oy + (r + .5) * gy;
                if (py > H + 4) break;
                for (let c = 0; c < cols; c++) {
                    const i = (r * cols + c) * 4;
                    if (!keep1(d[i], d[i + 1], d[i + 2], d[i + 3], (bx0 + (c + .5) * gxi) / iw, (by0 + (r + .5) * gyi) / ih)) continue;
                    let l = (.2126 * d[i] + .7152 * d[i + 1] + .0722 * d[i + 2]) / 255;
                    const edge = Math.min(1, Math.min(c, cols - 1 - c) / (cols * .05));   // soft left/right edge
                    pts.push(ox + (c + .5) * gx + rand(-.3, .3) * gx, py + rand(-.3, .3) * gy, l, edge);
                    hist[Math.min(255, (l * 255) | 0)]++;
                }
            }

            /* stretch contrast between the 3rd and 99th percentile */
            const cnt = pts.length / 4;
            let acc = 0, lo = 0, hi = 255;
            for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= cnt * .03) { lo = v; break; } }
            acc = 0;
            for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc >= cnt * .01) { hi = v; break; } }
            lo /= 255; hi = Math.max(lo + .05, hi / 255);

            /* black & white sparkle: bright areas dense, dark areas mostly empty */
            let out = [];
            for (let i = 0; i < pts.length; i += 4) {
                const l = Math.min(1, Math.max(0, (pts[i + 2] - lo) / (hi - lo)));
                const chance = (.04 + .96 * Math.pow(l, CFG.contrast)) * pts[i + 3];
                if (Math.random() > chance) continue;
                out.push([pts[i], pts[i + 1], l]);
            }
            if (out.length > maxN) {
                for (let i = out.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [out[i], out[j]] = [out[j], out[i]]; }
                out = out.slice(0, maxN);
            }
            return out;
        }

        function build(keepFormed) {
            W = hero.clientWidth; H = hero.clientHeight;
            canvas.width = W; canvas.height = H;
            imgData = ctx.createImageData(W, H);
            img32 = new Uint32Array(imgData.data.buffer);

            const pts = photo ? sample(photo) : [];
            const stars = Math.round(W * H / (W < 700 ? 2600 : 1700));
            n = pts.length + stars;
            const F = () => new Float32Array(n);
            x = F(); y = F(); vx = F(); vy = F(); tx = F(); ty = F(); sx = F(); sy = F();
            dl = F(); pa = F(); sa = F(); ph = F(); scx = F(); scy = F();
            cr = new Uint8Array(n); cg = new Uint8Array(n); cb = new Uint8Array(n); isStar = new Uint8Array(n);

            for (let i = 0; i < n; i++) {
                sx[i] = Math.random() * W;
                sy[i] = Math.random() * H;
                ph[i] = Math.random() * Math.PI * 2;
                sa[i] = rand(.06, .42);
                const a = Math.random() * Math.PI * 2;
                scx[i] = Math.cos(a) * rand(.3, 1.2);
                scy[i] = -Math.abs(Math.sin(a)) * rand(.5, 1.4) - .2;
                if (i < pts.length) {
                    const [px, py, l] = pts[i];
                    tx[i] = px; ty[i] = py;
                    pa[i] = Math.min(1, (.3 + .75 * l) * rand(.85, 1.1));
                    /* dim particles lean blue, bright ones go white (like the reference) */
                    const w = Math.min(1, l * 1.15 + rand(-.12, .12));
                    cr[i] = 95 + 150 * w; cg[i] = 120 + 130 * w; cb[i] = 200 + 55 * w;
                    dl[i] = .25 + (py / H) * .95 + rand(0, .75);
                } else {
                    isStar[i] = 1;
                    tx[i] = sx[i]; ty[i] = sy[i];
                    cr[i] = 220; cg[i] = 226; cb[i] = 240;
                    dl[i] = 1e9;
                }
                if (keepFormed || reduce) { x[i] = tx[i]; y[i] = ty[i]; dl[i] = 0; if (isStar[i]) dl[i] = 1e9; }
                else { x[i] = sx[i]; y[i] = sy[i]; }
            }
        }

        function frame(now) {
            if (!running) return;
            requestAnimationFrame(frame);
            if (!visible || !img32) return;
            const t = (now - t0) / 1000;
            img32.fill(0);
            const fadeIn = reduce ? 1 : Math.min(1, t / .7);
            const fadeAll = (1 - scrollP * .9) * fadeIn;
            const scat = scrollP * scrollP * H * .9;
            const R = 90, R2 = R * R;
            const mouseOn = !reduce && mx > -1e4;

            for (let i = 0; i < n; i++) {
                const star = isStar[i] === 1;
                const formed = !star && t >= dl[i];
                let hx, hy, K;
                if (formed) {
                    hx = tx[i] + scx[i] * scat; hy = ty[i] + scy[i] * scat; K = .055;
                } else {
                    hx = sx[i] + Math.sin(t * .3 + ph[i]) * 6;
                    hy = sy[i] + Math.cos(t * .25 + ph[i]) * 6 + (star ? scy[i] * scat * .4 : 0);
                    K = .02;
                }
                let ax = (hx - x[i]) * K, ay = (hy - y[i]) * K;
                if (mouseOn) {
                    const dx = x[i] - mx, dy = y[i] - my, d2 = dx * dx + dy * dy;
                    if (d2 < R2) {
                        const dd = Math.sqrt(d2) + .01, f = (1 - d2 / R2) * 2.4;
                        ax += dx / dd * f; ay += dy / dd * f;
                    }
                }
                vx[i] = (vx[i] + ax) * .82; vy[i] = (vy[i] + ay) * .82;
                x[i] += vx[i]; y[i] += vy[i];

                const tw = reduce ? 1 : .72 + .28 * Math.sin(t * (1.3 + (i % 7) * .25) + ph[i] * 7);
                let a;
                if (star) a = sa[i] * tw;
                else {
                    let settle = 0;
                    if (formed) {
                        const ddx = tx[i] - x[i], ddy = ty[i] - y[i];
                        settle = Math.max(0, 1 - Math.sqrt(ddx * ddx + ddy * ddy) / 70);
                    }
                    a = (sa[i] * (1 - settle) * tw + pa[i] * settle * (.86 + .14 * tw));
                }
                a *= fadeAll;
                if (a <= .01) continue;
                const px = x[i] | 0, py = y[i] | 0;
                if (px < 0 || py < 0 || px >= W - 1 || py >= H - 1) continue;
                const c = ((Math.min(255, a * 255) << 24) | (cb[i] << 16) | (cg[i] << 8) | cr[i]) >>> 0;
                const o = py * W + px;
                img32[o] = c;
                if (SZ > 1 && !star) { img32[o + 1] = c; img32[o + W] = c; img32[o + W + 1] = c; }
            }
            ctx.putImageData(imgData, 0, 0);
        }

        async function start(kind) {
            await ready;
            build(false);
            if (kind === 'quick') for (let i = 0; i < n; i++) if (!isStar[i]) dl[i] *= .45;
            mode = 'on';
            t0 = performance.now();
            if (!running) { running = true; requestAnimationFrame(frame); }
        }

        function rebuild() {
            if (mode !== 'on') return;
            const t = (performance.now() - t0) / 1000;
            build(t > 3);
        }

        hero.addEventListener('pointermove', e => {
            const r = hero.getBoundingClientRect();
            mx = e.clientX - r.left; my = e.clientY - r.top;
        });
        hero.addEventListener('pointerleave', () => { mx = my = -1e5; });
        window.addEventListener('scroll', () => {
            scrollP = Math.min(1, Math.max(0, window.scrollY / (hero.offsetHeight * .9)));
        }, { passive: true });
        new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(hero);

        return { start, rebuild };
    })();

    /* ---------------- boot ---------------- */
    async function boot() {
        try { await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]); } catch (e) { /* ignore */ }
        layout();

        if (reduce || seen) { finishNow(); return; }

        const safety = setTimeout(skip, 15000);
        try {
            await playIntro();
        } catch (e) {
            finishNow();
        }
        clearTimeout(safety);
    }

    skipBtn.addEventListener('click', skip);
    window.addEventListener('keydown', e => { if (['Escape', 'Enter', ' '].includes(e.key) && root.classList.contains('hx-intro')) skip(); });
    window.addEventListener('wheel', () => { if (root.classList.contains('hx-intro')) skip(); }, { passive: true });
    hero.addEventListener('touchstart', () => { if (root.classList.contains('hx-intro')) skip(); }, { passive: true });

    let lastW = window.innerWidth, rT;
    window.addEventListener('resize', () => {
        clearTimeout(rT);
        rT = setTimeout(() => {
            const widthChanged = window.innerWidth !== lastW;
            lastW = window.innerWidth;
            if (root.classList.contains('hx-intro')) { if (widthChanged) skip(); return; }
            layout();
            wrap.style.transform = pose.final;
            Particles.rebuild();
        }, 150);
    });

    boot();
})();
