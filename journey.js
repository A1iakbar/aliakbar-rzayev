/* ==========================================================
   Journey: Gantt-style timeline of work + education.
   Content lives in .jr-items <article>s inside index.html.
   ========================================================== */
(() => {
    const root = document.querySelector('.jr');
    if (!root) return;
    const chart = root.querySelector('.jr-chart');
    const axis = root.querySelector('.jr-axis');
    const detail = root.querySelector('.jr-detail');
    const stats = root.querySelector('.jr-stats');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const nowIdx = now.getFullYear() * 12 + now.getMonth();
    const toIdx = s => { const [y, m] = s.split('-').map(Number); return y * 12 + (m - 1); };
    const label = i => `${MONTHS[i % 12]} ${Math.floor(i / 12)}`;
    const duration = (a, b) => {
        const m = b - a + 1;
        const y = Math.floor(m / 12), r = m % 12;
        const parts = [];
        if (y) parts.push(`${y} yr${y > 1 ? 's' : ''}`);
        if (r) parts.push(`${r} mo${r > 1 ? 's' : ''}`);
        return parts.join(' ');
    };

    /* "Mar – Jun 2025" when in the same year, otherwise "Jul 2021 – Dec 2022" */
    const shortRange = it => {
        if (it.present) return `${label(it.start)} – Present`;
        const sameYear = Math.floor(it.start / 12) === Math.floor(it.end / 12);
        return sameYear ? `${MONTHS[it.start % 12]} – ${label(it.end)}` : `${label(it.start)} – ${label(it.end)}`;
    };

    /* ---------- read items ---------- */
    const items = [...root.querySelectorAll('.jr-items > article')].map(el => {
        const start = toIdx(el.dataset.start);
        const present = !el.dataset.end;
        const end = present ? nowIdx : toIdx(el.dataset.end);
        return {
            el, start, end, present,
            kind: el.dataset.kind === 'edu' ? 'edu' : 'work',
            title: el.dataset.title,
            org: el.dataset.org,
            short: el.dataset.short || el.dataset.org,
            badge: el.dataset.badge || ''
        };
    });
    if (!items.length) return;

    const groups = [
        { kind: 'work', name: 'Work' },
        { kind: 'edu', name: 'Education' }
    ].map(g => ({ ...g, list: items.filter(i => i.kind === g.kind).sort((a, b) => b.start - a.start) }))
     .filter(g => g.list.length);
    const ordered = groups.flatMap(g => g.list);

    /* axis: from January of the first year to the end of the current/last year */
    const firstYear = Math.floor(Math.min(...items.map(i => i.start)) / 12);
    const lastYear = Math.floor(Math.max(nowIdx, ...items.map(i => i.end)) / 12);
    const A0 = firstYear * 12, A1 = (lastYear + 1) * 12;
    const pct = i => ((i - A0) / (A1 - A0)) * 100;

    /* ---------- stats ---------- */
    const workMonths = new Set();
    items.filter(i => i.kind === 'work').forEach(i => { for (let m = i.start; m <= i.end; m++) workMonths.add(m); });
    const yrs = Math.floor(workMonths.size / 12);
    stats.innerHTML =
        `<span><b>${items.filter(i => i.kind === 'work').length}</b> roles</span>` +
        `<span><b>${yrs}+</b> yrs experience</span>` +
        `<span><b>${items.filter(i => i.kind === 'edu').length}</b> programmes</span>`;

    /* ---------- axis ---------- */
    for (let y = firstYear; y <= lastYear; y++) {
        const t = document.createElement('span');
        t.className = 'jr-tick';
        t.style.left = pct(y * 12) + '%';
        t.innerHTML = `<em>${y}</em><em class="jr-tick-short">’${String(y).slice(2)}</em>`;
        axis.appendChild(t);
    }
    if (nowIdx >= A0 && nowIdx < A1) {
        const n = document.createElement('span');
        n.className = 'jr-now';
        n.style.left = pct(nowIdx + now.getDate() / 31) + '%';
        n.innerHTML = '<em>Now</em>';
        axis.appendChild(n);
    }

    /* ---------- rows ---------- */
    const rows = [];
    groups.forEach(g => {
        const h = document.createElement('div');
        h.className = 'jr-group';
        h.textContent = g.name;
        chart.appendChild(h);
        g.list.forEach(it => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = `jr-row is-${it.kind}`;
            b.setAttribute('role', 'tab');
            b.setAttribute('aria-selected', 'false');
            const dates = `${label(it.start)} – ${it.present ? 'Present' : label(it.end)}`;
            b.innerHTML =
                `<span class="jr-label"><b>${it.title}</b><small>${it.short} · ${shortRange(it)}</small></span>` +
                `<span class="jr-track"><span class="jr-bar" style="left:${pct(it.start)}%;width:${Math.max(.8, pct(it.end + 1) - pct(it.start))}%"></span></span>`;
            b.title = `${it.title} — ${dates} (${duration(it.start, it.end)})`;
            b.addEventListener('click', () => select(ordered.indexOf(it), true));
            chart.appendChild(b);
            rows.push(b);
            it.row = b;
        });
    });
    /* bars grow in order of time, not order of rows */
    [...ordered].sort((a, b) => a.start - b.start).forEach((it, k) => {
        it.row.querySelector('.jr-bar').style.transitionDelay = (k * 90) + 'ms';
    });

    /* ---------- detail panel ---------- */
    let current = -1;
    function render(it) {
        const dates = `${label(it.start)} — ${it.present ? 'Present' : label(it.end)}`;
        return `
            <div class="jr-d-head">
                <span class="jr-chip jr-chip--${it.kind}">${it.kind === 'edu' ? 'Education' : 'Work'}</span>
                <span class="jr-d-dates">${dates}<i>·</i>${duration(it.start, it.end)}</span>
                <span class="jr-d-nav">
                    <button type="button" class="jr-nav-btn" data-step="-1" aria-label="Previous">‹</button>
                    <button type="button" class="jr-nav-btn" data-step="1" aria-label="Next">›</button>
                </span>
            </div>
            <h3 class="jr-d-title">${it.title}${it.badge ? `<span class="jr-badge">${it.badge}</span>` : ''}</h3>
            <p class="jr-d-org">${it.org}</p>
            <div class="jr-d-body">${it.el.innerHTML}</div>`;
    }

    function select(i, user) {
        i = (i + ordered.length) % ordered.length;
        if (i === current) return;
        const prev = current;
        current = i;
        const it = ordered[i];
        rows.forEach(r => { r.classList.remove('is-active'); r.setAttribute('aria-selected', 'false'); r.tabIndex = -1; });
        it.row.classList.add('is-active');
        it.row.setAttribute('aria-selected', 'true');
        it.row.tabIndex = 0;
        chart.classList.add('has-active');

        const swap = () => {
            detail.innerHTML = render(it);
            detail.dataset.kind = it.kind;
            detail.querySelectorAll('.jr-nav-btn').forEach(btn =>
                btn.addEventListener('click', () => { select(current + Number(btn.dataset.step), true); ordered[current].row.focus({ preventScroll: true }); }));
            if (!reduce && prev !== -1) {
                const dir = i > prev ? 1 : -1;
                detail.querySelector('.jr-d-head').parentElement.animate(
                    [{ opacity: 0, transform: `translateY(${dir * 10}px)` }, { opacity: 1, transform: 'none' }],
                    { duration: 380, easing: 'cubic-bezier(.2,.8,.2,1)' });
            }
        };
        /* on phones the card is below the list — bring it into view after a tap */
        if (user && window.innerWidth <= 760) {
            const r = detail.getBoundingClientRect();
            if (r.top > window.innerHeight * .6) detail.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
        }
        if (!reduce && prev !== -1) {
            detail.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, easing: 'ease-in' }).finished.then(swap, swap);
        } else swap();
    }

    /* keyboard: arrows move between rows */
    chart.addEventListener('keydown', e => {
        if (!['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
        e.preventDefault();
        let i = current;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') i++;
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') i--;
        if (e.key === 'Home') i = 0;
        if (e.key === 'End') i = ordered.length - 1;
        select(i, true);
        ordered[current].row.focus();
    });

    select(0, false);

    /* bars grow when the chart scrolls into view */
    if (reduce || !('IntersectionObserver' in window)) {
        chart.classList.add('is-in');
    } else {
        const io = new IntersectionObserver(es => {
            if (es.some(e => e.isIntersecting)) { chart.classList.add('is-in'); io.disconnect(); }
        }, { threshold: .25 });
        io.observe(chart);
    }

    /* ======================================================
       PHONES: simple vertical timeline with Work / Education
       tabs and tap-to-expand items (shown only ≤ 760px)
       ====================================================== */
    const m = document.createElement('div');
    m.className = 'jr-m';
    const tabs = document.createElement('div');
    tabs.className = 'jr-m-tabs';
    tabs.setAttribute('role', 'tablist');
    const lists = {};
    groups.forEach((g, gi) => {
        const t = document.createElement('button');
        t.type = 'button';
        t.className = 'jr-m-tab' + (gi === 0 ? ' is-on' : '');
        t.setAttribute('role', 'tab');
        t.innerHTML = `${g.name}<span>${g.list.length}</span>`;
        t.addEventListener('click', () => {
            tabs.querySelectorAll('.jr-m-tab').forEach(x => x.classList.toggle('is-on', x === t));
            Object.entries(lists).forEach(([k, ul]) => { ul.hidden = k !== g.kind; });
        });
        tabs.appendChild(t);

        const ul = document.createElement('ol');
        ul.className = `jr-m-list is-${g.kind}`;
        ul.hidden = gi !== 0;
        g.list.forEach((it, k) => {
            const li = document.createElement('li');
            li.className = 'jr-m-item' + (k === 0 ? ' is-open' : '');
            const dates = `${label(it.start)} – ${it.present ? 'Present' : label(it.end)}`;
            li.innerHTML = `
                <button type="button" class="jr-m-head" aria-expanded="${k === 0}">
                    <span class="jr-m-date">${dates}<i>${duration(it.start, it.end)}</i></span>
                    <span class="jr-m-title">${it.title}${it.badge ? `<em>${it.badge}</em>` : ''}</span>
                    <span class="jr-m-org">${it.org}</span>
                    <span class="jr-m-plus" aria-hidden="true"></span>
                </button>
                <div class="jr-m-body"><div class="jr-m-inner">${it.el.innerHTML}</div></div>`;
            li.querySelector('.jr-m-head').addEventListener('click', () => {
                const open = !li.classList.contains('is-open');
                ul.querySelectorAll('.jr-m-item').forEach(x => {
                    x.classList.toggle('is-open', x === li && open);
                    x.querySelector('.jr-m-head').setAttribute('aria-expanded', String(x === li && open));
                });
            });
            ul.appendChild(li);
        });
        lists[g.kind] = ul;
    });
    m.appendChild(tabs);
    Object.values(lists).forEach(ul => m.appendChild(ul));
    root.insertBefore(m, chart);
})();
