/* C:\Users\surya\.gemini\antigravity\scratch\trademaster\src\js\contrarian.js */
/* Contrarian Reversal, Harmonic PRZ Scanner & Asymmetric RRR (1:10+) Engine (Arist MD Style) */

window.TradeMasterContrarian = (function() {
  'use strict';

  const FALLBACK_PRICES = {
    BTC: 91250,
    ETH: 3180,
    SOL: 218.5,
    SUI: 3.42,
    DOGE: 0.365,
    PAXG: 2685
  };

  let currentSetups = [];
  let calcState = {
    symbol: 'BTC',
    direction: 'LONG',
    capital: 10000,
    riskPercent: 1.0,
    entry: 86450,
    stopLoss: 84720,
    rrrTarget: 10
  };

  function formatPrice(val) {
    if (!isFinite(val)) return '0';
    if (val >= 1000) return val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    if (val >= 10) return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return val.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  }

  function buildHarmonicSetups(priceMap) {
    const p = (sym) => (priceMap && priceMap[sym] ? priceMap[sym] : FALLBACK_PRICES[sym]);

    const rawConfigs = [
      {
        symbol: 'BTC',
        name: 'Bitcoin',
        pattern: 'Bullish Bat (0.886 Fib)',
        direction: 'LONG',
        entryMult: 0.948,      // PRZ ~5.2% below spot (deep pullback fishing)
        slMult: 0.930,         // Tight SL ~1.9% below PRZ
        rrr: 10,
        crowdState: 'Retail FOMO / Over-Leveraged Long',
        contrarianAction: 'Sabar "Mancing" di PRZ 0.886 (Jangan Kejar Pucuk)',
        confluence: 'D-Leg 0.886 XA + Liquidasi Long Cluster'
      },
      {
        symbol: 'ETH',
        name: 'Ethereum',
        pattern: 'Bullish Gartley (0.786 Fib)',
        direction: 'LONG',
        entryMult: 0.955,
        slMult: 0.936,
        rrr: 12,
        crowdState: 'Retail Apatis & Mulai Menyerah',
        contrarianAction: 'Area Akumulasi Kontrarian (Umpan Kecil)',
        confluence: 'PRZ 0.786 XA + 1.272 BC Extension'
      },
      {
        symbol: 'SOL',
        name: 'Solana',
        pattern: 'Bearish Butterfly (1.272 Fib)',
        direction: 'SHORT',
        entryMult: 1.065,      // PRZ ~6.5% above spot (top reversal fishing)
        slMult: 1.086,         // Tight SL ~2% above PRZ
        rrr: 10,
        crowdState: 'Euforia Ekstrem (Potensi Exit Liquidity)',
        contrarianAction: 'Waspada Top Reversal — Siapkan Jaring Short di PRZ',
        confluence: '1.272 XA Extension + Exhaustion Zone'
      },
      {
        symbol: 'SUI',
        name: 'Sui Network',
        pattern: 'Bullish Deep Crab (1.618 Fib)',
        direction: 'LONG',
        entryMult: 0.925,
        slMult: 0.905,
        rrr: 12,
        crowdState: 'Panic Dip / Shakeout Ritel',
        contrarianAction: 'Zona Mancing Bottom Ekstrem (High Asymmetric)',
        confluence: '1.618 XA Deep Extension + Demand Imbalance'
      },
      {
        symbol: 'DOGE',
        name: 'Dogecoin',
        pattern: 'Bearish Crab (1.618 Fib)',
        direction: 'SHORT',
        entryMult: 1.085,
        slMult: 1.110,
        rrr: 10,
        crowdState: 'Hype Media Sosial & FOMO Ritel',
        contrarianAction: 'Anti-Konsensus: Tunggu Rejection di PRZ Atas',
        confluence: '1.618 XA + Parabolic Exhaustion'
      },
      {
        symbol: 'PAXG',
        name: 'Gold (XAU)',
        pattern: 'Bullish Cypher (0.786 XC)',
        direction: 'LONG',
        entryMult: 0.972,
        slMult: 0.962,
        rrr: 10,
        crowdState: 'Koreksi Sehat / Profit Taking',
        contrarianAction: 'Mancing Swing Jangka Menengah (Hold Multi-Minggu)',
        confluence: '0.786 XC Reversal + Struktur Makro Naik'
      }
    ];

    return rawConfigs.map(cfg => {
      const live = p(cfg.symbol);
      const entry = live * cfg.entryMult;
      const sl = live * cfg.slMult;
      const riskDist = Math.abs(entry - sl);
      const tp = cfg.direction === 'LONG'
        ? entry + (riskDist * cfg.rrr)
        : Math.max(entry - (riskDist * cfg.rrr), entry * 0.15);
      const distToPrzPct = ((entry - live) / live) * 100;
      const slPct = (riskDist / entry) * 100;

      return {
        ...cfg,
        live,
        entry,
        sl,
        tp,
        distToPrzPct,
        slPct
      };
    });
  }

  async function fetchLivePrices() {
    const map = { ...FALLBACK_PRICES };
    try {
      if (window.TradeMasterAPI && typeof window.TradeMasterAPI.getCryptoPrices === 'function') {
        const res = await window.TradeMasterAPI.getCryptoPrices(['BTC', 'ETH', 'SOL', 'SUI', 'DOGE', 'PAXG']);
        if (Array.isArray(res)) {
          res.forEach(item => {
            if (item && item.symbol && item.price > 0) {
              map[item.symbol.toUpperCase()] = parseFloat(item.price);
            }
          });
        }
      }
    } catch (e) {
      console.warn('Contrarian live price fetch fallback used:', e);
    }
    return map;
  }

  function renderScannerTable() {
    const tbody = document.getElementById('contrarian-scanner-body');
    if (!tbody) return;

    tbody.innerHTML = currentSetups.map((s, idx) => {
      const isLong = s.direction === 'LONG';
      const dirBadge = isLong
        ? `<span style="background: #ecfdf5; color: #047857; border: 1px solid #6ee7b7; padding: 3px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 800;">🟢 LONG (Bottom)</span>`
        : `<span style="background: #fef2f2; color: #b91c1c; border: 1px solid #fca5a5; padding: 3px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 800;">🔴 SHORT (Top)</span>`;

      const distColor = Math.abs(s.distToPrzPct) <= 4 ? '#059669' : '#b45309';
      const distSign = s.distToPrzPct > 0 ? '+' : '';

      return `
        <tr style="border-bottom: 1px solid var(--card-border);">
          <td style="padding: 12px 14px;">
            <div style="font-weight: 800; color: var(--text-main); font-size: 0.9rem;">${s.symbol} <span style="font-weight: 500; color: var(--text-muted); font-size: 0.75rem;">${s.name}</span></div>
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">Live: <b style="color: var(--text-main);">$${formatPrice(s.live)}</b></div>
          </td>
          <td style="padding: 12px 14px;">
            <div style="font-weight: 700; color: var(--primary); font-size: 0.8rem;">${s.pattern}</div>
            <div style="font-size: 0.68rem; color: var(--text-muted); margin-top: 2px;">${s.confluence}</div>
          </td>
          <td style="padding: 12px 14px; text-align: center;">
            ${dirBadge}
          </td>
          <td style="padding: 12px 14px; text-align: right; font-family: monospace;">
            <div style="font-weight: 800; color: var(--text-main); font-size: 0.88rem;">$${formatPrice(s.entry)}</div>
            <div style="font-size: 0.68rem; color: ${distColor}; font-weight: 600;">${distSign}${s.distToPrzPct.toFixed(1)}% dari spot</div>
          </td>
          <td style="padding: 12px 14px; text-align: right; font-family: monospace;">
            <div style="font-weight: 700; color: var(--danger); font-size: 0.82rem;">SL: $${formatPrice(s.sl)}</div>
            <div style="font-size: 0.72rem; color: var(--success); font-weight: 700;">TP (1:${s.rrr}): $${formatPrice(s.tp)}</div>
          </td>
          <td style="padding: 12px 14px;">
            <div style="font-size: 0.74rem; font-weight: 700; color: #b45309;">${s.crowdState}</div>
            <div style="font-size: 0.68rem; color: var(--text-muted); margin-top: 2px;">${s.contrarianAction}</div>
          </td>
          <td style="padding: 12px 14px; text-align: center;">
            <div style="display: flex; gap: 6px; justify-content: center; flex-wrap: wrap;">
              <button type="button" onclick="TradeMasterContrarian.loadToCalculator(${idx})" style="padding: 5px 10px; font-size: 0.72rem; font-weight: 700; border-radius: 6px; background: #eef2ff; border: 1px solid var(--primary); color: var(--primary); cursor: pointer;">
                📐 Hitung RRR
              </button>
              <button type="button" onclick="TradeMasterContrarian.sendSetupToTelegram(${idx})" style="padding: 5px 8px; font-size: 0.72rem; font-weight: 700; border-radius: 6px; background: #f0f9ff; border: 1px solid #0284c7; color: #0369a1; cursor: pointer;" title="Kirim Setup PRZ ini ke Telegram">
                ✈️
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function loadToCalculator(index) {
    const setup = currentSetups[index];
    if (!setup) return;

    calcState.symbol = setup.symbol;
    calcState.direction = setup.direction;
    calcState.entry = Number(setup.entry.toFixed(setup.entry >= 100 ? 0 : 4));
    calcState.stopLoss = Number(setup.sl.toFixed(setup.sl >= 100 ? 0 : 4));
    calcState.rrrTarget = setup.rrr;

    syncCalculatorInputs();
    calculateRRR();

    const calcCard = document.getElementById('contrarian-rrr-calculator');
    if (calcCard) {
      calcCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function syncCalculatorInputs() {
    const elAsset = document.getElementById('rrr-asset-label');
    const elDir = document.getElementById('rrr-direction');
    const elCap = document.getElementById('rrr-capital');
    const elRisk = document.getElementById('rrr-risk-pct');
    const elEntry = document.getElementById('rrr-entry');
    const elSl = document.getElementById('rrr-sl');
    const elTarget = document.getElementById('rrr-ratio');

    if (elAsset) elAsset.textContent = calcState.symbol;
    if (elDir) elDir.value = calcState.direction;
    if (elCap) elCap.value = calcState.capital;
    if (elRisk) elRisk.value = calcState.riskPercent;
    if (elEntry) elEntry.value = calcState.entry;
    if (elSl) elSl.value = calcState.stopLoss;
    if (elTarget) elTarget.value = calcState.rrrTarget;

    // Highlight active preset pill
    document.querySelectorAll('.rrr-preset-btn').forEach(btn => {
      const val = parseFloat(btn.getAttribute('data-rrr'));
      if (val === Number(calcState.rrrTarget)) {
        btn.style.background = 'var(--primary)';
        btn.style.color = '#ffffff';
        btn.style.borderColor = 'var(--primary)';
      } else {
        btn.style.background = '#f1f5f9';
        btn.style.color = '#475569';
        btn.style.borderColor = '#e2e8f0';
      }
    });
  }

  function setRRRPreset(ratio) {
    calcState.rrrTarget = ratio;
    const elTarget = document.getElementById('rrr-ratio');
    if (elTarget) elTarget.value = ratio;
    syncCalculatorInputs();
    calculateRRR();
  }

  function calculateRRR() {
    const dir = (document.getElementById('rrr-direction')?.value || 'LONG').toUpperCase();
    const capital = parseFloat(document.getElementById('rrr-capital')?.value) || 0;
    const riskPct = parseFloat(document.getElementById('rrr-risk-pct')?.value) || 1;
    const entry = parseFloat(document.getElementById('rrr-entry')?.value) || 0;
    const sl = parseFloat(document.getElementById('rrr-sl')?.value) || 0;
    const rrr = parseFloat(document.getElementById('rrr-ratio')?.value) || 10;

    calcState = { ...calcState, direction: dir, capital, riskPercent: riskPct, entry, stopLoss: sl, rrrTarget: rrr };

    const errBox = document.getElementById('rrr-calc-error');
    const riskUsd = capital * (riskPct / 100);
    const priceRiskDist = dir === 'LONG' ? (entry - sl) : (sl - entry);

    if (entry <= 0 || sl <= 0 || priceRiskDist <= 0) {
      if (errBox) {
        errBox.style.display = 'block';
        errBox.innerHTML = dir === 'LONG'
          ? '⚠️ Untuk posisi <b>LONG</b>, harga Stop Loss harus lebih rendah daripada Harga Entry.'
          : '⚠️ Untuk posisi <b>SHORT</b>, harga Stop Loss harus lebih tinggi daripada Harga Entry.';
      }
      return;
    }

    if (errBox) errBox.style.display = 'none';

    const slDistPct = (priceRiskDist / entry) * 100;
    const units = riskUsd / priceRiskDist;
    const positionValueUsd = units * entry;
    const tpPrice = dir === 'LONG'
      ? entry + (priceRiskDist * rrr)
      : Math.max(0, entry - (priceRiskDist * rrr));
    const rewardUsd = riskUsd * rrr;
    const rewardEquityPct = riskPct * rrr;
    const breakevenWinRate = (100 / (1 + rrr)).toFixed(1);
    const maxConsecutiveLossesCovered = Math.floor(rrr);

    const setTxt = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };

    setTxt('res-risk-usd', `-$${riskUsd.toLocaleString('en-US', { maximumFractionDigits: 2 })}`);
    setTxt('res-risk-sub', `${riskPct}% modal | Jarak SL: ${slDistPct.toFixed(2)}%`);

    setTxt('res-reward-usd', `+$${rewardUsd.toLocaleString('en-US', { maximumFractionDigits: 2 })}`);
    setTxt('res-reward-sub', `+${rewardEquityPct.toFixed(1)}% pertumbuhan modal (1:${rrr})`);

    setTxt('res-tp-price', `$${formatPrice(tpPrice)}`);
    setTxt('res-pos-size', `$${positionValueUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })} (${units >= 1 ? units.toFixed(3) : units.toFixed(5)} ${calcState.symbol})`);

    setTxt('res-bep-wr', `${breakevenWinRate}%`);
    setTxt('res-bep-note', `Cukup 1x profit untuk menutup ${maxConsecutiveLossesCovered}x stop loss beruntun!`);

    // Update visual Risk vs Reward bar
    const riskBar = document.getElementById('rrr-bar-risk');
    const rewardBar = document.getElementById('rrr-bar-reward');
    if (riskBar && rewardBar) {
      const riskWidth = Math.max(6, Math.min(35, (1 / (1 + rrr)) * 100));
      riskBar.style.width = `${riskWidth}%`;
      rewardBar.style.width = `${100 - riskWidth}%`;
      riskBar.textContent = `1R`;
      rewardBar.textContent = `${rrr}R (Ikan Besar 🐋)`;
    }
  }

  async function sendSetupToTelegram(index) {
    const s = currentSetups[index];
    if (!s) return;

    let cfg = null;
    try {
      const raw = localStorage.getItem('trademaster_telegram_config');
      cfg = raw ? JSON.parse(raw) : null;
    } catch (e) {}

    if (!cfg || !cfg.botToken || !cfg.chatId) {
      alert('Bot Telegram belum dikonfigurasi. Silakan buka menu Telegram Alerts di sidebar kiri untuk menghubungkan bot Anda terlebih dahulu.');
      if (typeof window.navigateTo === 'function') window.navigateTo('telegram');
      return;
    }

    const msg = `🎯 <b>CONTRARIAN HARMONIC PRZ SETUP (ALA ARIST MD)</b>\n` +
      `----------------------------------------\n` +
      `💎 <b>Aset:</b> ${s.symbol} (${s.name})\n` +
      `📐 <b>Pola:</b> ${s.pattern}\n` +
      `⚡ <b>Arah:</b> ${s.direction === 'LONG' ? '🟢 LONG (Bottom Fishing)' : '🔴 SHORT (Top Reversal)'}\n` +
      `💵 <b>Harga Live:</b> $${formatPrice(s.live)}\n` +
      `🎯 <b>Zona PRZ (Entry):</b> $${formatPrice(s.entry)}\n` +
      `🛑 <b>Stop Loss Ketat:</b> $${formatPrice(s.sl)} (${s.slPct.toFixed(2)}%)\n` +
      `🏆 <b>Target TP (RRR 1:${s.rrr}):</b> $${formatPrice(s.tp)}\n` +
      `🧠 <b>Psikologi Crowd:</b> ${s.crowdState}\n` +
      `📝 <b>Aksi Kontrarian:</b> ${s.contrarianAction}\n` +
      `----------------------------------------\n` +
      `<i>Filosofi Mancing: Umpan kecil (risk ketat), target asimetris 1:${s.rrr}.</i>`;

    try {
      const res = await window.TradeMasterAPI.sendTelegramMessage(cfg.botToken, cfg.chatId, msg);
      if (res && res.success) {
        alert(`🎉 Setup Contrarian ${s.symbol} (${s.pattern}) berhasil dikirim ke Telegram Anda!`);
      }
    } catch (err) {
      alert(`Gagal mengirim ke Telegram: ${err.message}`);
    }
  }

  async function refresh() {
    const prices = await fetchLivePrices();
    currentSetups = buildHarmonicSetups(prices);
    renderScannerTable();

    // Initialize calculator with first setup (BTC) if not yet customized
    if (currentSetups.length > 0) {
      const btc = currentSetups[0];
      calcState.symbol = btc.symbol;
      calcState.direction = btc.direction;
      calcState.entry = Number(btc.entry.toFixed(0));
      calcState.stopLoss = Number(btc.sl.toFixed(0));
      calcState.rrrTarget = btc.rrr;
      syncCalculatorInputs();
      calculateRRR();
    }
  }

  return {
    refresh,
    loadToCalculator,
    setRRRPreset,
    calculateRRR,
    sendSetupToTelegram
  };
})();
