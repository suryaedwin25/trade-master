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

  function formatPrice(val) {
    if (!isFinite(val)) return '0';
    if (val >= 1000) return val.toLocaleString('en-US', { maximumFractionDigits: 0 });
    if (val >= 10) return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return val.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
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

  function renderForecastTable(tickers, lunar, fibClusters) {
    const tbody = document.getElementById('astro-forecast-body');
    if (!tbody) return;

    const priceOf = (sym, fallback) => {
      const f = (tickers || []).find(t => t.symbol === sym);
      return f && f.price > 0 ? f.price : fallback;
    };

    const nextWindowDate = lunar.daysToNewMoon <= lunar.daysToFullMoon
      ? `🌑 ${formatDateID(lunar.nextNewMoonDate)} (±2h)`
      : `🌕 ${formatDateID(lunar.nextFullMoonDate)} (±2h)`;

    const nearestFib = fibClusters[0]
      ? `Fib ${fibClusters[0].fibNumber}d (${formatDateID(fibClusters[0].targetDate)})`
      : nextWindowDate;

    const assets = [
      {
        symbol: 'BTC',
        name: 'Bitcoin',
        live: priceOf('BTC', 63000),
        wave: 'Wave C / Ending Diagonal (Akhir Koreksi)',
        buyLow: 0.91,
        buyHigh: 0.95,
        tp1Mult: 1.18,
        tp2Mult: 1.42,
        slMult: 0.87,
        timeWindow: `${nearestFib} & ${nextWindowDate}`,
        bias: 'BUY ON REVERSAL WINDOW'
      },
      {
        symbol: 'ETH',
        name: 'Ethereum',
        live: priceOf('ETH', 1785),
        wave: 'Wave 2 Deep Retracement (0.786 Fib)',
        buyLow: 0.92,
        buyHigh: 0.96,
        tp1Mult: 1.22,
        tp2Mult: 1.50,
        slMult: 0.88,
        timeWindow: nextWindowDate,
        bias: 'ACCUMULATE AT TIME CLUSTER'
      },
      {
        symbol: 'SOL',
        name: 'Solana',
        live: priceOf('SOL', 142),
        wave: 'Wave 4 Triangle / Retest Support',
        buyLow: 0.90,
        buyHigh: 0.95,
        tp1Mult: 1.25,
        tp2Mult: 1.55,
        slMult: 0.86,
        timeWindow: nextWindowDate,
        bias: 'WAIT FOR LUNAR REVERSAL'
      },
      {
        symbol: 'SUI',
        name: 'Sui Network',
        live: priceOf('SUI', 2.1),
        wave: 'Wave B–C Flush (Oversold Zone)',
        buyLow: 0.89,
        buyHigh: 0.94,
        tp1Mult: 1.28,
        tp2Mult: 1.65,
        slMult: 0.84,
        timeWindow: nextWindowDate,
        bias: 'SWING REVERSAL WATCH'
      },
      {
        symbol: 'PAXG',
        name: 'Gold (XAU)',
        live: priceOf('PAXG', 2685),
        wave: 'Primary Wave 5 Impulse (Safe Haven)',
        buyLow: 0.965,
        buyHigh: 0.985,
        tp1Mult: 1.08,
        tp2Mult: 1.16,
        slMult: 0.945,
        timeWindow: nextWindowDate,
        bias: 'BUY ON DIP (GOLD CYCLE)'
      }
    ];

    latestForecasts = assets.map(a => ({
      ...a,
      zoneLow: a.live * a.buyLow,
      zoneHigh: a.live * a.buyHigh,
      tp1: a.live * a.tp1Mult,
      tp2: a.live * a.tp2Mult,
      sl: a.live * a.slMult
    }));

    tbody.innerHTML = latestForecasts.map((f, idx) => `
      <tr style="border-bottom: 1px solid var(--card-border);">
        <td style="padding: 12px 14px;">
          <div style="font-weight: 800; color: var(--text-main); font-size: 0.9rem;">${f.symbol} <span style="font-weight: 500; color: var(--text-muted); font-size: 0.74rem;">${f.name}</span></div>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">Live: <b style="color: var(--text-main);">$${formatPrice(f.live)}</b></div>
        </td>
        <td style="padding: 12px 14px;">
          <div style="font-weight: 700; color: var(--primary); font-size: 0.78rem;">${f.wave}</div>
          <span style="display: inline-block; margin-top: 3px; background: #ecfdf5; border: 1px solid #6ee7b7; color: #047857; padding: 2px 7px; border-radius: 5px; font-size: 0.66rem; font-weight: 800;">${f.bias}</span>
        </td>
        <td style="padding: 12px 14px;">
          <div style="font-weight: 700; color: #b45309; font-size: 0.78rem;">${f.timeWindow}</div>
          <div style="font-size: 0.68rem; color: var(--text-muted); margin-top: 2px;">Jendela Time Reversal (±2 Hari)</div>
        </td>
        <td style="padding: 12px 14px; text-align: right; font-family: monospace;">
          <div style="font-weight: 800; color: var(--text-main); font-size: 0.84rem;">$${formatPrice(f.zoneLow)} – $${formatPrice(f.zoneHigh)}</div>
          <div style="font-size: 0.68rem; color: var(--danger); font-weight: 700;">Invalidasi SL: $${formatPrice(f.sl)}</div>
        </td>
        <td style="padding: 12px 14px; text-align: right; font-family: monospace;">
          <div style="font-weight: 700; color: var(--success); font-size: 0.82rem;">TP1: $${formatPrice(f.tp1)}</div>
          <div style="font-size: 0.72rem; color: #047857; font-weight: 800;">TP2: $${formatPrice(f.tp2)}</div>
        </td>
        <td style="padding: 12px 14px; text-align: center;">
          <button type="button" onclick="TradeMasterAstronacci.sendToTelegram(${idx})" style="padding: 5px 10px; font-size: 0.72rem; font-weight: 700; border-radius: 6px; background: #f0f9ff; border: 1px solid #0284c7; color: #0369a1; cursor: pointer;">
            ✈️ Kirim Alert
          </button>
        </td>
      </tr>
    `).join('');
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

    // Fetch live non-Binance prices in parallel (~160ms via OKX / Hyperliquid / CoinGecko)
    let tickers = [];
    try {
      if (window.TradeMasterAPI && typeof window.TradeMasterAPI.getCryptoTickers === 'function') {
        tickers = await window.TradeMasterAPI.getCryptoTickers(true);
      }
    } catch (e) {}

    renderForecastTable(tickers, lunar, fibClusters);
  }

  return {
    refresh,
    sendToTelegram
  };
})();
