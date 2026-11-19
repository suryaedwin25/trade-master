/* C:\Users\surya\.gemini\antigravity\scratch\trademaster\src\js\contrarian.js */
/* Contrarian Reversal, Harmonic PRZ Scanner (ALL 150+ Live Crypto Assets) & Asymmetric RRR (1:10+) Engine (Arist MD Style) */

window.TradeMasterContrarian = (function () {
  'use strict';

  const MAJOR_SET = new Set(['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'AVAX', 'DOT', 'LINK', 'TRX', 'TON', 'SUI', 'LTC', 'BCH', 'PAXG', 'XAUT']);
  const MEME_AI_SET = new Set(['DOGE', 'SHIB', 'PEPE', 'WIF', 'BONK', 'FLOKI', 'PENGU', 'TRUMP', 'FARTCOIN', 'POPCAT', 'NEIRO', 'FET', 'RENDER', 'TAO', 'WLD', 'NEAR', 'VIRTUAL', 'AI16Z', 'VVV']);

  let allSetups = [];
  let filteredSetups = [];
  let currentFilter = 'ALL';
  let currentSearch = '';
  let displayLimit = 40;

  let calcState = {
    symbol: 'BTC',
    direction: 'LONG',
    capital: 10000,
    riskPercent: 1.0,
    entry: 60000,
    stopLoss: 58800,
    rrrTarget: 10
  };

  function formatPrice(val) {
    if (!isFinite(val) || val <= 0) return '0';
    if (val >= 1000) return val.toLocaleString('en-US', { maximumFractionDigits: 0 });
    if (val >= 10) return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (val >= 0.1) return val.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    return val.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 7 });
  }

  function formatVol(volUsd) {
    if (!volUsd || volUsd <= 0) return '-';
    if (volUsd >= 1e9) return `$${(volUsd / 1e9).toFixed(2)}B`;
    if (volUsd >= 1e6) return `$${(volUsd / 1e6).toFixed(1)}M`;
    if (volUsd >= 1e3) return `$${(volUsd / 1e3).toFixed(0)}K`;
    return `$${volUsd.toFixed(0)}`;
  }

  // Dynamically compute Harmonic PRZ & Contrarian Crowd Signal from live 24h change & range
  function buildDynamicSetup(ticker) {
    const live = ticker.price;
    const chg = ticker.change || 0;
    const rangePct = ticker.high && ticker.low && live > 0
      ? Math.max(0.025, Math.min(0.14, (ticker.high - ticker.low) / live))
      : 0.045;

    let direction = 'LONG';
    let pattern = 'Bullish Gartley (0.786 Fib)';
    let crowdState = 'Konsolidasi / Ritel Ragu';
    let contrarianAction = 'Sabar Mancing di PRZ 0.786 (Umpan Kecil)';
    let confluence = '0.786 XA + Demand Retest';
    let entryMult = 1 - Math.max(0.032, rangePct * 0.75);
    let slMult = entryMult * (1 - Math.max(0.018, rangePct * 0.35));
    let rrr = 10;

    if (chg >= 7.0) {
      // Parabolic pump -> Contrarian SHORT Top Reversal
      direction = 'SHORT';
      pattern = 'Bearish Crab (1.618 Fib)';
      crowdState = `🔥 FOMO Ekstrem (+${chg.toFixed(1)}%) — Potensi Exit Liquidity`;
      contrarianAction = 'Anti-Konsensus: Tunggu Exhaustion / Short di PRZ Atas';
      confluence = '1.618 XA Extension + Overbought Blow-off';
      entryMult = 1 + Math.max(0.045, rangePct * 0.65);
      slMult = entryMult * (1 + Math.max(0.022, rangePct * 0.32));
      rrr = 10;
    } else if (chg >= 3.0) {
      // Strong green -> Bearish Butterfly watch
      direction = 'SHORT';
      pattern = 'Bearish Butterfly (1.272 Fib)';
      crowdState = `Euforia Ritel (+${chg.toFixed(1)}%) — Jangan Kejar Pucuk`;
      contrarianAction = 'Siapkan Jaring Top Reversal di PRZ 1.272';
      confluence = '1.272 XA + Supply Rejection Zone';
      entryMult = 1 + Math.max(0.04, rangePct * 0.7);
      slMult = entryMult * (1 + Math.max(0.02, rangePct * 0.32));
      rrr = 10;
    } else if (chg <= -5.0) {
      // Heavy dump / panic -> Deep Crab Bottom Fishing
      direction = 'LONG';
      pattern = 'Bullish Deep Crab (1.618 Fib)';
      crowdState = `🩸 Panic Sell (${chg.toFixed(1)}%) — Kapitulasi Ritel`;
      contrarianAction = 'ZONA MANCING BOTTOM EKSTREM (High Asymmetric 1:12)';
      confluence = '1.618 Deep Extension + Likuidasi Long Sweep';
      entryMult = 1 - Math.max(0.025, rangePct * 0.45);
      slMult = entryMult * (1 - Math.max(0.02, rangePct * 0.32));
      rrr = 12;
    } else if (chg <= -1.5) {
      // Pullback / Fear -> Bullish Bat 0.886
      direction = 'LONG';
      pattern = 'Bullish Bat (0.886 Fib)';
      crowdState = `Ketakutan / Shakeout (${chg.toFixed(1)}%)`;
      contrarianAction = 'Pasang Umpan Kecil di PRZ 0.886 (Bottom Fishing)';
      confluence = 'D-Leg 0.886 XA + Stop Hunt Cluster';
      entryMult = 1 - Math.max(0.03, rangePct * 0.6);
      slMult = entryMult * (1 - Math.max(0.018, rangePct * 0.32));
      rrr = 12;
    }

    const entry = live * entryMult;
    const sl = live * slMult;
    const riskDist = Math.abs(entry - sl);
    const tp = direction === 'LONG'
      ? entry + (riskDist * rrr)
      : Math.max(entry - (riskDist * rrr), entry * 0.15);
    const distToPrzPct = ((entry - live) / live) * 100;
    const slPct = (riskDist / entry) * 100;

    return {
      symbol: ticker.symbol,
      live,
      change: chg,
      volumeUsd: ticker.volumeUsd || 0,
      source: ticker.source || 'Live',
      direction,
      pattern,
      crowdState,
      contrarianAction,
      confluence,
      entry,
      sl,
      tp,
      rrr,
      distToPrzPct,
      slPct,
      isMajor: MAJOR_SET.has(ticker.symbol),
      isMemeAi: MEME_AI_SET.has(ticker.symbol)
    };
  }

  function applyFiltersAndRender() {
    const q = currentSearch.trim().toUpperCase();
    filteredSetups = allSetups.filter(s => {
      if (q && !s.symbol.includes(q)) return false;
      if (currentFilter === 'LONG') return s.direction === 'LONG';
      if (currentFilter === 'SHORT') return s.direction === 'SHORT';
      if (currentFilter === 'MAJOR') return s.isMajor;
      if (currentFilter === 'MEME') return s.isMemeAi;
      return true;
    });

    const countEl = document.getElementById('contrarian-asset-count');
    if (countEl) {
      countEl.textContent = `${filteredSetups.length} dari ${allSetups.length} Aset Live`;
    }

    renderScannerTable();
  }

  function setFilter(filterKey, btnEl) {
    currentFilter = filterKey;
    displayLimit = 40;
    document.querySelectorAll('.contrarian-filter-btn').forEach(b => {
      b.style.background = '#f1f5f9';
      b.style.color = '#475569';
      b.style.borderColor = '#e2e8f0';
    });
    if (btnEl) {
      btnEl.style.background = 'var(--primary)';
      btnEl.style.color = '#ffffff';
      btnEl.style.borderColor = 'var(--primary)';
    }
    applyFiltersAndRender();
  }

  function setSearch(val) {
    currentSearch = val || '';
    displayLimit = 50;
    applyFiltersAndRender();
  }

  function showMore() {
    displayLimit += 50;
    renderScannerTable();
  }

  function renderScannerTable() {
    const tbody = document.getElementById('contrarian-scanner-body');
    if (!tbody) return;

    if (filteredSetups.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="padding: 24px; text-align: center; color: var(--text-muted);">Tidak ada aset yang cocok dengan pencarian "<b>${currentSearch}</b>".</td></tr>`;
      return;
    }

    const visible = filteredSetups.slice(0, displayLimit);
    let rowsHtml = visible.map((s) => {
      const origIdx = allSetups.indexOf(s);
      const isLong = s.direction === 'LONG';
      const dirBadge = isLong
        ? `<span style="background: #ecfdf5; color: #047857; border: 1px solid #6ee7b7; padding: 3px 8px; border-radius: 6px; font-size: 0.7rem; font-weight: 800;">🟢 LONG</span>`
        : `<span style="background: #fef2f2; color: #b91c1c; border: 1px solid #fca5a5; padding: 3px 8px; border-radius: 6px; font-size: 0.7rem; font-weight: 800;">🔴 SHORT</span>`;

      const chgColor = s.change >= 0 ? 'var(--success)' : 'var(--danger)';
      const chgSign = s.change >= 0 ? '+' : '';
      const distColor = Math.abs(s.distToPrzPct) <= 4 ? '#059669' : '#b45309';
      const distSign = s.distToPrzPct > 0 ? '+' : '';

      return `
        <tr style="border-bottom: 1px solid var(--card-border);">
          <td style="padding: 10px 12px;">
            <div style="font-weight: 800; color: var(--text-main); font-size: 0.88rem; display: flex; align-items: center; gap: 6px;">
              <span>${s.symbol}</span>
              <span style="font-size: 0.7rem; font-weight: 700; color: ${chgColor};">${chgSign}${s.change.toFixed(2)}%</span>
            </div>
            <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 2px;">
              Spot: <b style="color: var(--text-main);">$${formatPrice(s.live)}</b> • Vol: ${formatVol(s.volumeUsd)}
            </div>
          </td>
          <td style="padding: 10px 12px;">
            <div style="font-weight: 700; color: var(--primary); font-size: 0.78rem;">${s.pattern}</div>
            <div style="font-size: 0.68rem; color: var(--text-muted); margin-top: 2px;">${s.confluence}</div>
          </td>
          <td style="padding: 10px 12px; text-align: center;">
            ${dirBadge}
          </td>
          <td style="padding: 10px 12px; text-align: right; font-family: monospace;">
            <div style="font-weight: 800; color: var(--text-main); font-size: 0.85rem;">$${formatPrice(s.entry)}</div>
            <div style="font-size: 0.68rem; color: ${distColor}; font-weight: 600;">${distSign}${s.distToPrzPct.toFixed(1)}% dari spot</div>
          </td>
          <td style="padding: 10px 12px; text-align: right; font-family: monospace;">
            <div style="font-weight: 700; color: var(--danger); font-size: 0.78rem;">SL: $${formatPrice(s.sl)}</div>
            <div style="font-size: 0.72rem; color: var(--success); font-weight: 700;">TP (1:${s.rrr}): $${formatPrice(s.tp)}</div>
          </td>
          <td style="padding: 10px 12px;">
            <div style="font-size: 0.72rem; font-weight: 700; color: #b45309;">${s.crowdState}</div>
            <div style="font-size: 0.68rem; color: var(--text-muted); margin-top: 2px;">${s.contrarianAction}</div>
          </td>
          <td style="padding: 10px 12px; text-align: center;">
            <div style="display: flex; gap: 5px; justify-content: center;">
              <button type="button" onclick="TradeMasterContrarian.loadToCalculator(${origIdx})" style="padding: 5px 9px; font-size: 0.7rem; font-weight: 700; border-radius: 6px; background: #eef2ff; border: 1px solid var(--primary); color: var(--primary); cursor: pointer;">
                📐 RRR
              </button>
              <button type="button" onclick="TradeMasterContrarian.sendSetupToTelegram(${origIdx})" style="padding: 5px 8px; font-size: 0.7rem; font-weight: 700; border-radius: 6px; background: #f0f9ff; border: 1px solid #0284c7; color: #0369a1; cursor: pointer;" title="Kirim Setup ke Telegram">
                ✈️
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    if (filteredSetups.length > displayLimit) {
      rowsHtml += `
        <tr>
          <td colspan="7" style="padding: 14px; text-align: center;">
            <button type="button" onclick="TradeMasterContrarian.showMore()" style="padding: 8px 18px; border-radius: 8px; background: #f1f5f9; border: 1px solid #cbd5e1; color: var(--text-main); font-weight: 700; font-size: 0.78rem; cursor: pointer;">
              ⬇️ Tampilkan Lebih Banyak (${filteredSetups.length - displayLimit} aset tersisa)
            </button>
          </td>
        </tr>
      `;
    }

    tbody.innerHTML = rowsHtml;
  }

  function loadToCalculator(index) {
    const setup = allSetups[index];
    if (!setup) return;

    const dec = setup.entry >= 100 ? 0 : setup.entry >= 1 ? 3 : 6;
    calcState.symbol = setup.symbol;
    calcState.direction = setup.direction;
    calcState.entry = Number(setup.entry.toFixed(dec));
    calcState.stopLoss = Number(setup.sl.toFixed(dec));
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
    setTxt('res-pos-size', `$${positionValueUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })} (${units >= 1 ? units.toFixed(2) : units.toFixed(5)} ${calcState.symbol})`);
    setTxt('res-bep-wr', `${breakevenWinRate}%`);
    setTxt('res-bep-note', `Cukup 1x profit untuk menutup ${maxConsecutiveLossesCovered}x stop loss beruntun!`);

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
    const s = allSetups[index];
    if (!s) return;

    let cfg = null;
    try {
      const raw = localStorage.getItem('trademaster_telegram_config');
      cfg = raw ? JSON.parse(raw) : null;
    } catch (e) { }

    if (!cfg || !cfg.botToken || !cfg.chatId) {
      alert('Bot Telegram belum dikonfigurasi. Silakan buka menu Telegram Alerts di sidebar kiri terlebih dahulu.');
      if (typeof window.navigateTo === 'function') window.navigateTo('telegram');
      return;
    }

    const msg = `🎯 <b>CONTRARIAN HARMONIC PRZ SETUP (ALA ARIST MD)</b>\n` +
      `----------------------------------------\n` +
      `💎 <b>Aset:</b> ${s.symbol}/USDT\n` +
      `📐 <b>Pola:</b> ${s.pattern}\n` +
      `⚡ <b>Arah:</b> ${s.direction === 'LONG' ? '🟢 LONG (Bottom Fishing)' : '🔴 SHORT (Top Reversal)'}\n` +
      `💵 <b>Harga Live:</b> $${formatPrice(s.live)} (${s.change >= 0 ? '+' : ''}${s.change.toFixed(2)}%)\n` +
      `🎯 <b>Zona PRZ (Entry):</b> $${formatPrice(s.entry)}\n` +
      `🛑 <b>Stop Loss Ketat:</b> $${formatPrice(s.sl)} (${s.slPct.toFixed(2)}%)\n` +
      `🏆 <b>Target TP (RRR 1:${s.rrr}):</b> $${formatPrice(s.tp)}\n` +
      `🧠 <b>Psikologi Crowd:</b> ${s.crowdState}\n` +
      `----------------------------------------\n` +
      `<i>Filosofi Mancing: Umpan kecil, target asimetris 1:${s.rrr}.</i>`;

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
    let tickers = [];
    try {
      if (window.TradeMasterAPI && typeof window.TradeMasterAPI.getAllCryptoTickers === 'function') {
        tickers = await window.TradeMasterAPI.getAllCryptoTickers(150);
      } else if (window.TradeMasterAPI && typeof window.TradeMasterAPI.getCryptoTickers === 'function') {
        tickers = await window.TradeMasterAPI.getCryptoTickers(true);
      }
    } catch (e) { }

    allSetups = (tickers || []).map(buildDynamicSetup);
    applyFiltersAndRender();

    // Initialize calculator with BTC (or first asset)
    const btcIdx = allSetups.findIndex(s => s.symbol === 'BTC');
    const first = allSetups[btcIdx >= 0 ? btcIdx : 0];
    if (first) {
      calcState.symbol = first.symbol;
      calcState.direction = first.direction;
      calcState.entry = Number(first.entry.toFixed(first.entry >= 100 ? 0 : 4));
      calcState.stopLoss = Number(first.sl.toFixed(first.sl >= 100 ? 0 : 4));
      calcState.rrrTarget = first.rrr;
      syncCalculatorInputs();
      calculateRRR();
    }
  }

  return {
    refresh,
    setFilter,
    setSearch,
    showMore,
    loadToCalculator,
    setRRRPreset,
    calculateRRR,
    sendSetupToTelegram
  };
})();
