/* C:\Users\surya\.gemini\antigravity\scratch\trademaster\src\js\astronacci.js */
/* Gema Astronacci Style: Financial Astrology (Lunar & Mercury Cycles) + Fibonacci Time Cycles + Price Forecast */

window.TradeMasterAstronacci = (function() {
  'use strict';

  const SYNODIC_MONTH = 29.53058867;
  // Known New Moon reference epoch: Jan 6, 2000 18:14 UTC
  const KNOWN_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14, 0);

  // Real Astronomical Mercury Retrograde Windows (2026-2027)
  const MERCURY_RETROGRADE_WINDOWS = [
    { start: '2026-02-26', end: '2026-03-20', sign: 'Pisces' },
    { start: '2026-06-29', end: '2026-07-23', sign: 'Cancer' },
    { start: '2026-10-24', end: '2026-11-13', sign: 'Scorpio' },
    { start: '2027-02-09', end: '2027-03-03', sign: 'Pisces / Aquarius' },
    { start: '2027-06-10', end: '2027-07-04', sign: 'Cancer / Gemini' },
    { start: '2027-10-07', end: '2027-10-28', sign: 'Scorpio / Libra' }
  ];

  // Real BTC Major Structural Pivots for Fibonacci Time Counting
  const BTC_PIVOTS = [
    { name: 'BTC Cycle ATH ($126,200)', date: '2025-10-05', type: 'HIGH' },
    { name: 'BTC 2026 Low ($57,809)', date: '2026-06-28', type: 'LOW' }
  ];

  let latestForecasts = [];
  let filteredForecasts = [];
  let astroFilter = 'ALL';
  let astroSearch = '';
  let astroDisplayLimit = 40;
  const ASTRO_MAJOR_SET = new Set(['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'AVAX', 'DOT', 'LINK', 'SUI', 'TON', 'PAXG', 'XAUT']);

  function formatPrice(val) {
    if (!isFinite(val) || val <= 0) return '0';
    if (val >= 1000) return val.toLocaleString('en-US', { maximumFractionDigits: 0 });
    if (val >= 10) return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (val >= 0.1) return val.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    return val.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 7 });
  }

  function formatDateID(dateObj) {
    return dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function getLunarInfo(now = new Date()) {
    const diffDays = (now.getTime() - KNOWN_NEW_MOON_MS) / 86400000;
    const cycleAge = ((diffDays % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH;
    const phaseRatio = cycleAge / SYNODIC_MONTH; // 0 = New Moon, 0.5 = Full Moon
    const illumination = Math.round(((1 - Math.cos(2 * Math.PI * phaseRatio)) / 2) * 100);

    let phaseName = 'Waxing Crescent';
    let emoji = '🌒';
    let tradingBias = 'Fase Awal Tren — Pantau Konfirmasi Struktur';

    if (cycleAge < 1.85 || cycleAge > 27.68) {
      phaseName = 'New Moon (Bulan Baru)';
      emoji = '🌑';
      tradingBias = '🔥 HIGH REVERSAL WINDOW (+/- 2 Hari): Potensi Swing Bottom / Awal Tren Baru';
    } else if (cycleAge < 7.38) {
      phaseName = 'Waxing Crescent';
      emoji = '🌒';
      tradingBias = 'Momentum Bertumbuh — Ikuti Arah Breakout Pasca New Moon';
    } else if (cycleAge < 11.07) {
      phaseName = 'First Quarter';
      emoji = '🌓';
      tradingBias = 'Zona Uji Tren (Mid-Cycle Pullback / Continuation)';
    } else if (cycleAge < 13.5) {
      phaseName = 'Waxing Gibbous';
      emoji = '🌔';
      tradingBias = 'Mendekati Full Moon — Waspada Volatilitas & Profit Taking';
    } else if (cycleAge < 16.2) {
      phaseName = 'Full Moon (Bulan Purnama)';
      emoji = '🌕';
      tradingBias = '🔥 HIGH REVERSAL WINDOW (+/- 2 Hari): Puncak Emosi Pasar / Potensi Swing Top atau Exhaustion';
    } else if (cycleAge < 22.15) {
      phaseName = 'Waning Gibbous';
      emoji = '🌖';
      tradingBias = 'Fase Distribusi / Koreksi Sehat Pasca Full Moon';
    } else if (cycleAge < 25.8) {
      phaseName = 'Last Quarter';
      emoji = '🌗';
      tradingBias = 'Zona Konsolidasi — Persiapan Menuju Siklus New Moon Berikutnya';
    } else {
      phaseName = 'Waning Crescent';
      emoji = '🌘';
      tradingBias = 'Fase Akhir Siklus — Siapkan Jaring Menjelang New Moon Window';
    }

    const daysToNewMoon = cycleAge < 0.5 ? 0 : (SYNODIC_MONTH - cycleAge);
    const daysToFullMoon = cycleAge <= (SYNODIC_MONTH / 2)
      ? (SYNODIC_MONTH / 2) - cycleAge
      : (SYNODIC_MONTH * 1.5) - cycleAge;

    const nextNewMoonDate = new Date(now.getTime() + daysToNewMoon * 86400000);
    const nextFullMoonDate = new Date(now.getTime() + daysToFullMoon * 86400000);

    return {
      cycleAge: cycleAge.toFixed(1),
      illumination,
      phaseName,
      emoji,
      tradingBias,
      daysToNewMoon: Math.round(daysToNewMoon),
      daysToFullMoon: Math.round(daysToFullMoon),
      nextNewMoonDate,
      nextFullMoonDate
    };
  }

  function getMercuryStatus(now = new Date()) {
    const todayMs = now.getTime();
    for (const w of MERCURY_RETROGRADE_WINDOWS) {
      const s = new Date(w.start + 'T00:00:00Z').getTime();
      const e = new Date(w.end + 'T23:59:59Z').getTime();
      if (todayMs >= s && todayMs <= e) {
        const daysLeft = Math.ceil((e - todayMs) / 86400000);
        return {
          isRetrograde: true,
          label: `⚠️ RETROGRADE AKTIF (${w.sign})`,
          detail: `Berakhir ${formatDateID(new Date(e))} (${daysLeft} hari lagi). Waspada false breakout & whipsaw!`,
          color: '#dc2626',
          bg: '#fef2f2',
          border: '#fca5a5'
        };
      }
      if (s > todayMs) {
        const daysUntil = Math.ceil((s - todayMs) / 86400000);
        return {
          isRetrograde: false,
          label: `🟢 MERCURY DIRECT (Tren Bersih)`,
          detail: `Retrograde berikutnya: ${formatDateID(new Date(s))} (${daysUntil} hari lagi di ${w.sign}).`,
          color: '#059669',
          bg: '#ecfdf5',
          border: '#6ee7b7'
        };
      }
    }
    return {
      isRetrograde: false,
      label: '🟢 MERCURY DIRECT',
      detail: 'Kondisi siklus planet kondusif untuk tren bersih.',
      color: '#059669',
      bg: '#ecfdf5',
      border: '#6ee7b7'
    };
  }

  function getUpcomingFibTimeClusters(now = new Date()) {
    const fibDays = [55, 89, 144, 161, 233, 377, 418, 466, 610];
    const results = [];
    const todayMs = now.getTime();

    BTC_PIVOTS.forEach(pivot => {
      const pivotMs = new Date(pivot.date + 'T00:00:00Z').getTime();
      const elapsedDays = Math.floor((todayMs - pivotMs) / 86400000);

      fibDays.forEach(fd => {
        const targetMs = pivotMs + fd * 86400000;
        const deltaDays = Math.round((targetMs - todayMs) / 86400000);
        if (deltaDays >= -5 && deltaDays <= 90) {
          results.push({
            pivotName: pivot.name,
            fibNumber: fd,
            targetDate: new Date(targetMs),
            deltaDays,
            elapsedDays
          });
        }
      });
    });

    results.sort((a, b) => a.deltaDays - b.deltaDays);
    return results.slice(0, 4);
  }

  function renderAstroHeader(lunar, mercury, fibClusters) {
    const elLunar = document.getElementById('astro-lunar-card');
    if (elLunar) {
      elLunar.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.72rem; font-weight: 800; color: var(--primary); text-transform: uppercase;">Lunar Cycle (Fase Bulan)</span>
          <span style="font-size: 1.5rem;">${lunar.emoji}</span>
        </div>
        <div style="font-size: 1.05rem; font-weight: 800; color: var(--text-main); margin-top: 4px;">${lunar.phaseName} (${lunar.illumination}%)</div>
        <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 4px; line-height: 1.4;">${lunar.tradingBias}</div>
        <div style="display: flex; gap: 8px; margin-top: 8px; font-size: 0.7rem; flex-wrap: wrap;">
          <span style="background: #f1f5f9; padding: 3px 8px; border-radius: 6px; color: var(--text-main);">🌑 New Moon: <b>${formatDateID(lunar.nextNewMoonDate)}</b> (${lunar.daysToNewMoon}h)</span>
          <span style="background: #fffbeb; padding: 3px 8px; border-radius: 6px; color: #b45309;">🌕 Full Moon: <b>${formatDateID(lunar.nextFullMoonDate)}</b> (${lunar.daysToFullMoon}h)</span>
        </div>
      `;
    }

    const elMercury = document.getElementById('astro-mercury-card');
    if (elMercury) {
      elMercury.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.72rem; font-weight: 800; color: ${mercury.color}; text-transform: uppercase;">Mercury Retrograde Radar</span>
          <span style="font-size: 1.3rem;">☿️</span>
        </div>
        <div style="font-size: 1rem; font-weight: 800; color: ${mercury.color}; margin-top: 6px;">${mercury.label}</div>
        <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 6px; line-height: 1.45;">${mercury.detail}</div>
        <div style="margin-top: 8px; font-size: 0.68rem; color: var(--text-muted); background: ${mercury.bg}; border: 1px solid ${mercury.border}; padding: 6px 8px; border-radius: 6px;">
          <b>Aturan Astronacci:</b> Saat Mercury Retrograde, hindari mengejar breakout; fokus pada <i>reversal</i> & <i>take profit</i> cepat.
        </div>
      `;
    }

    const elFibTime = document.getElementById('astro-fibtime-card');
    if (elFibTime) {
      const itemsHtml = fibClusters.length > 0
        ? fibClusters.map(c => {
            const isNow = Math.abs(c.deltaDays) <= 3;
            const badgeColor = isNow ? '#dc2626' : '#4f46e5';
            const badgeBg = isNow ? '#fef2f2' : '#eef2ff';
            const timeTag = c.deltaDays === 0 ? 'HARI INI 🔥' : c.deltaDays > 0 ? `+${c.deltaDays} hari lagi` : `${Math.abs(c.deltaDays)} hari lalu`;
            return `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; border-radius: 6px; background: ${badgeBg}; margin-top: 6px; font-size: 0.72rem;">
                <div>
                  <b style="color: ${badgeColor};">Fib ${c.fibNumber} Hari</b> dari ${c.pivotName}
                </div>
                <div style="text-align: right; font-weight: 800; color: ${badgeColor};">
                  ${formatDateID(c.targetDate)} <span style="font-weight: 600;">(${timeTag})</span>
                </div>
              </div>
            `;
          }).join('')
        : `<div style="font-size: 0.76rem; color: var(--text-muted); margin-top: 6px;">Menghitung siklus Fibonacci Time berikutnya...</div>`;

      elFibTime.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.72rem; font-weight: 800; color: #b45309; text-transform: uppercase;">Eye of Future — Fibonacci Time Cluster</span>
          <span style="font-size: 1.3rem;">⏳</span>
        </div>
        <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 4px;">Jendela tanggal pembalikan tren (<i>Time Forecast</i>) dihitung dari puncak/dasar utama BTC:</div>
        ${itemsHtml}
      `;
    }
  }

  function buildDynamicAstroForecast(ticker, lunar, fibClusters) {
    const live = ticker.price;
    const chg = ticker.change || 0;
    const nextWindowDate = lunar.daysToNewMoon <= lunar.daysToFullMoon
      ? `🌑 ${formatDateID(lunar.nextNewMoonDate)} (±2h)`
      : `🌕 ${formatDateID(lunar.nextFullMoonDate)} (±2h)`;
    const nearestFib = fibClusters[0]
      ? `Fib ${fibClusters[0].fibNumber}d (${formatDateID(fibClusters[0].targetDate)})`
      : nextWindowDate;

    let wave = 'Wave 2 / 4 Retracement (0.618–0.786)';
    let bias = 'BUY ON REVERSAL WINDOW';
    let biasType = 'BUY';
    let buyLow = 0.92;
    let buyHigh = 0.96;
    let tp1Mult = 1.20;
    let tp2Mult = 1.45;
    let slMult = 0.88;

    if (chg >= 6.0) {
      wave = 'Wave 5 Blow-Off / Overextended';
      bias = 'TAKE PROFIT / SELL WINDOW';
      biasType = 'SELL';
      buyLow = 1.03;
      buyHigh = 1.07;
      tp1Mult = 0.88;
      tp2Mult = 0.76;
      slMult = 1.11;
    } else if (chg >= 2.5) {
      wave = 'Wave 3 Impulse Momentum';
      bias = 'HOLD / WAIT PULLBACK';
      biasType = 'BUY';
      buyLow = 0.94;
      buyHigh = 0.97;
      tp1Mult = 1.18;
      tp2Mult = 1.38;
      slMult = 0.90;
    } else if (chg <= -4.5) {
      wave = 'Wave C Ending Diagonal (Kapitulasi)';
      bias = 'STRONG BUY AT TIME CLUSTER';
      biasType = 'BUY';
      buyLow = 0.94;
      buyHigh = 0.98;
      tp1Mult = 1.28;
      tp2Mult = 1.60;
      slMult = 0.89;
    }

    const timeWindow = ticker.symbol === 'BTC' ? `${nearestFib} & ${nextWindowDate}` : nextWindowDate;

    return {
      symbol: ticker.symbol,
      name: ticker.pair || `${ticker.symbol}USDT`,
      live,
      change: chg,
      wave,
      bias,
      biasType,
      timeWindow,
      zoneLow: live * buyLow,
      zoneHigh: live * buyHigh,
      tp1: live * tp1Mult,
      tp2: live * tp2Mult,
      sl: live * slMult,
      isMajor: ASTRO_MAJOR_SET.has(ticker.symbol)
    };
  }

  function applyAstroFiltersAndRender() {
    const q = astroSearch.trim().toUpperCase();
    filteredForecasts = latestForecasts.filter(f => {
      if (q && !f.symbol.includes(q)) return false;
      if (astroFilter === 'BUY') return f.biasType === 'BUY';
      if (astroFilter === 'SELL') return f.biasType === 'SELL';
      if (astroFilter === 'MAJOR') return f.isMajor;
      return true;
    });

    const countEl = document.getElementById('astro-asset-count');
    if (countEl) {
      countEl.textContent = `${filteredForecasts.length} dari ${latestForecasts.length} Aset Live`;
    }

    const tbody = document.getElementById('astro-forecast-body');
    if (!tbody) return;

    if (filteredForecasts.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="padding: 24px; text-align: center; color: var(--text-muted);">Tidak ada aset yang cocok dengan pencarian "<b>${astroSearch}</b>".</td></tr>`;
      return;
    }

    const visible = filteredForecasts.slice(0, astroDisplayLimit);
    let html = visible.map((f) => {
      const origIdx = latestForecasts.indexOf(f);
      const isSell = f.biasType === 'SELL';
      const badgeStyle = isSell
        ? 'background: #fef2f2; border: 1px solid #fca5a5; color: #b91c1c;'
        : 'background: #ecfdf5; border: 1px solid #6ee7b7; color: #047857;';
      const chgColor = f.change >= 0 ? 'var(--success)' : 'var(--danger)';
      const chgSign = f.change >= 0 ? '+' : '';

      return `
        <tr style="border-bottom: 1px solid var(--card-border);">
          <td style="padding: 10px 12px;">
            <div style="font-weight: 800; color: var(--text-main); font-size: 0.88rem; display: flex; align-items: center; gap: 6px;">
              <span>${f.symbol}</span>
              <span style="font-size: 0.7rem; font-weight: 700; color: ${chgColor};">${chgSign}${f.change.toFixed(2)}%</span>
            </div>
            <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 2px;">Live: <b style="color: var(--text-main);">$${formatPrice(f.live)}</b></div>
          </td>
          <td style="padding: 10px 12px;">
            <div style="font-weight: 700; color: var(--primary); font-size: 0.76rem;">${f.wave}</div>
            <span style="display: inline-block; margin-top: 3px; ${badgeStyle} padding: 2px 7px; border-radius: 5px; font-size: 0.65rem; font-weight: 800;">${f.bias}</span>
          </td>
          <td style="padding: 10px 12px;">
            <div style="font-weight: 700; color: #b45309; font-size: 0.76rem;">${f.timeWindow}</div>
            <div style="font-size: 0.66rem; color: var(--text-muted); margin-top: 2px;">Jendela Time Reversal (±2 Hari)</div>
          </td>
          <td style="padding: 10px 12px; text-align: right; font-family: monospace;">
            <div style="font-weight: 800; color: var(--text-main); font-size: 0.82rem;">$${formatPrice(f.zoneLow)} – $${formatPrice(f.zoneHigh)}</div>
            <div style="font-size: 0.68rem; color: var(--danger); font-weight: 700;">SL: $${formatPrice(f.sl)}</div>
          </td>
          <td style="padding: 10px 12px; text-align: right; font-family: monospace;">
            <div style="font-weight: 700; color: var(--success); font-size: 0.8rem;">TP1: $${formatPrice(f.tp1)}</div>
            <div style="font-size: 0.7rem; color: #047857; font-weight: 800;">TP2: $${formatPrice(f.tp2)}</div>
          </td>
          <td style="padding: 10px 12px; text-align: center;">
            <button type="button" onclick="TradeMasterAstronacci.sendToTelegram(${origIdx})" style="padding: 5px 10px; font-size: 0.7rem; font-weight: 700; border-radius: 6px; background: #f0f9ff; border: 1px solid #0284c7; color: #0369a1; cursor: pointer;">
              ✈️ Alert
            </button>
          </td>
        </tr>
      `;
    }).join('');

    if (filteredForecasts.length > astroDisplayLimit) {
      html += `
        <tr>
          <td colspan="6" style="padding: 14px; text-align: center;">
            <button type="button" onclick="TradeMasterAstronacci.showMore()" style="padding: 8px 18px; border-radius: 8px; background: #f1f5f9; border: 1px solid #cbd5e1; color: var(--text-main); font-weight: 700; font-size: 0.78rem; cursor: pointer;">
              ⬇️ Tampilkan Lebih Banyak (${filteredForecasts.length - astroDisplayLimit} aset tersisa)
            </button>
          </td>
        </tr>
      `;
    }

    tbody.innerHTML = html;
  }

  function setFilter(key, btnEl) {
    astroFilter = key;
    astroDisplayLimit = 40;
    document.querySelectorAll('.astro-filter-btn').forEach(b => {
      b.style.background = '#f1f5f9';
      b.style.color = '#475569';
      b.style.borderColor = '#e2e8f0';
    });
    if (btnEl) {
      btnEl.style.background = 'var(--primary)';
      btnEl.style.color = '#ffffff';
      btnEl.style.borderColor = 'var(--primary)';
    }
    applyAstroFiltersAndRender();
  }

  function setSearch(val) {
    astroSearch = val || '';
    astroDisplayLimit = 50;
    applyAstroFiltersAndRender();
  }

  function showMore() {
    astroDisplayLimit += 50;
    applyAstroFiltersAndRender();
  }

  function renderForecastTable(tickers, lunar, fibClusters) {
    latestForecasts = (tickers || []).map(t => buildDynamicAstroForecast(t, lunar, fibClusters));
    applyAstroFiltersAndRender();
  }

  async function sendToTelegram(index) {
    const f = latestForecasts[index];
    if (!f) return;

    let cfg = null;
    try {
      const raw = localStorage.getItem('trademaster_telegram_config');
      cfg = raw ? JSON.parse(raw) : null;
    } catch (e) {}

    if (!cfg || !cfg.botToken || !cfg.chatId) {
      alert('Bot Telegram belum dikonfigurasi. Silakan buka menu Telegram Alerts di sidebar kiri terlebih dahulu.');
      if (typeof window.navigateTo === 'function') window.navigateTo('telegram');
      return;
    }

    const msg = `🌙 <b>ASTRONACCI TIME & PRICE FORECAST</b>\n` +
      `----------------------------------------\n` +
      `💎 <b>Aset:</b> ${f.symbol} (${f.name})\n` +
      `💵 <b>Harga Live:</b> $${formatPrice(f.live)}\n` +
      `🌊 <b>Struktur Elliott Wave:</b> ${f.wave}\n` +
      `⏳ <b>Time Reversal Window:</b> ${f.timeWindow}\n` +
      `🎯 <b>Price Buy Zone:</b> $${formatPrice(f.zoneLow)} – $${formatPrice(f.zoneHigh)}\n` +
      `🛑 <b>Invalidasi (SL):</b> $${formatPrice(f.sl)}\n` +
      `🏆 <b>Target TP1 / TP2:</b> $${formatPrice(f.tp1)} / $${formatPrice(f.tp2)}\n` +
      `----------------------------------------\n` +
      `<i>Price + Time = Precision Reversal (Astronacci Method)</i>`;

    try {
      const res = await window.TradeMasterAPI.sendTelegramMessage(cfg.botToken, cfg.chatId, msg);
      if (res && res.success) {
        alert(`🎉 Forecast Astronacci ${f.symbol} berhasil dikirim ke Telegram Anda!`);
      }
    } catch (err) {
      alert(`Gagal mengirim ke Telegram: ${err.message}`);
    }
  }

  async function refresh() {
    const now = new Date();
    const lunar = getLunarInfo(now);
    const mercury = getMercuryStatus(now);
    const fibClusters = getUpcomingFibTimeClusters(now);

    // Render astronomical & time-cycle cards immediately (0ms!)
    renderAstroHeader(lunar, mercury, fibClusters);

    // Fetch ALL 150+ live non-Binance crypto prices (~160ms via OKX / Hyperliquid)
    let tickers = [];
    try {
      if (window.TradeMasterAPI && typeof window.TradeMasterAPI.getAllCryptoTickers === 'function') {
        tickers = await window.TradeMasterAPI.getAllCryptoTickers(150);
      } else if (window.TradeMasterAPI && typeof window.TradeMasterAPI.getCryptoTickers === 'function') {
        tickers = await window.TradeMasterAPI.getCryptoTickers(true);
      }
    } catch (e) {}

    renderForecastTable(tickers, lunar, fibClusters);
  }

  return {
    refresh,
    setFilter,
    setSearch,
    showMore,
    sendToTelegram
  };
})();
