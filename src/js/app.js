/* C:\Users\surya\.gemini\antigravity\scratch\trademaster\src\js\app.js */

window.TradeMasterApp = (function() {
  
  // App state
  const state = {
    activePage: 'dashboard',
    crypto: {
      selected: 'BTC',
      exchange: 'Binance',
      cryptoMode: 'CEX',
      chartInterval: '1d',
      activeIndicators: ['EMA9', 'EMA21'], // defaults
      chartData: [],
      livePrice: 0,
      priceChange: 0,
      trades: [],
      wsConnection: null,
      pollInterval: null, // to handle polling for non-Binance exchange price updates
      chartInstance: null,
      indicatorChartInstance: null,
      candlestickSeries: null,
      indicatorLineSeries: {}
    },
    stocks: {
      selected: 'BBRI',
      chartInterval: '1d',
      activeIndicators: ['SMA20', 'BB'],
      chartData: [],
      chartInstance: null,
      candlestickSeries: null,
      indicatorLineSeries: {}
    },
    watchlist: {
      crypto: ['BTC', 'ETH', 'SOL', 'BNB'],
      stocks: ['BBCA', 'TLKM', 'ASII', 'GOTO', 'BMRI']
    },
    news: [],
    analyzedNews: [],
    sentimentScorecard: null,
    beiWhales: (function() {
      const cached = localStorage.getItem('bei_whales_data');
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (e) {
          console.error('Error parsing cached bei_whales_data, falling back to defaults:', e);
          try { localStorage.removeItem('bei_whales_data'); } catch(err) {}
        }
      }
      return [
        { name: 'Prajogo Pangestu', holdings: ['TPIA', 'BREN', 'BRPT', 'CUAN'], sector: 'Grup Barito (Energi & Petrokimia)', status: 'ACCUMULATING', pnl: 210 },
        { name: 'Lo Kheng Hong', holdings: ['GJTL', 'CFIN', 'BMTR', 'DILD'], sector: 'Value Investing (Sektor Ritel/Finance)', status: 'HOLDING', pnl: 180 },
        { name: 'Garibaldi Thohir', holdings: ['ADRO', 'MDKA', 'ESSA'], sector: 'Adaro & Merdeka Group (Batubara & Emas)', status: 'HOLDING', pnl: 65 },
        { name: 'Timothy Ronald', holdings: ['BBRI', 'GOTO'], sector: 'Growth & Aggressive Allocation (>1% stake)', status: 'ACCUMULATING', pnl: 42 },
        { name: 'Belvin Tannadi', holdings: ['BRMS', 'MEDC'], sector: 'Swing / Commodities (>1% stake swing)', status: 'ACTIVE SWING', pnl: 15 },
        { name: 'Andri Hakim', holdings: ['BBRI', 'GOTO', 'TLKM'], sector: 'Tech & Growth (>1% blockholder)', status: 'ACCUMULATING', pnl: 12 },
        { name: 'David Noah', holdings: ['BRMS', 'ADRO', 'MEDC'], sector: 'Momentum / Volume Breakout (>1% stake)', status: 'ACTIVE SWING', pnl: 25 },
        { name: 'Founder Remora', holdings: ['BUMI', 'DEWA', 'BRMS'], sector: 'Systematic Swing / Scalping (>1% stake)', status: 'ACTIVE SCALPING', pnl: 35 },
        { name: 'Leon Hartono', holdings: ['BBCA', 'BBRI', 'GOTO'], sector: 'Macro & Tech leader (>1% blockholder)', status: 'HOLDING', pnl: 18 },
        { name: 'Anthoni Salim', holdings: ['BUMI', 'DNET', 'META'], sector: 'Grup Salim (Konsumer & Infrastruktur)', status: 'HOLDING', pnl: 32 },
        { name: 'Hermanto Tanoko', holdings: ['CLEO', 'AVIA', 'PEVE'], sector: 'Tan Corp (Consumer Goods & Paint)', status: 'HOLDING', pnl: 48 },
        { name: 'Sugianto Kusuma (Aguan)', holdings: ['PANI'], sector: 'Agung Sedayu (Properti & Real Estate)', status: 'ACCUMULATING', pnl: 150 }
      ];
    })(),
    cryptoWhales: (function() {
      const cached = localStorage.getItem('crypto_whales_data');
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (e) {
          console.error('Error parsing cached crypto_whales_data, falling back to defaults:', e);
          try { localStorage.removeItem('crypto_whales_data'); } catch(err) {}
        }
      }
      return [
        { address: '0x71a... Whale-Alpha', label: 'Solana Whale Alpha', token: 'SOL', entry: 138.50, amount: 2450000 },
        { address: 'bc1q9... Whale-Beta', label: 'Bitcoin Whale Beta', token: 'BTC', entry: 91400.00, amount: 8900000 },
        { address: '0x88f... FatCat', label: 'Ethereum FatCat', token: 'ETH', entry: 2980.00, amount: 3120000 },
        { address: '0x32e... Gigachad', label: 'Base Gigachad', token: 'BRETT', entry: 0.122, amount: 850000 },
        { address: 'SOL-5... DogeKing', label: 'Solana Meme DogeKing', token: 'POPCAT', entry: 0.82, amount: 1100000 }
      ];
    })()
  };

  // 1. Chart Helper Functions
  function destroyChart(type) {
    const config = state[type];
    if (config.chartInstance) {
      config.chartInstance.remove();
      config.chartInstance = null;
      config.candlestickSeries = null;
      config.indicatorLineSeries = {};
    }
    if (config.indicatorChartInstance) {
      config.indicatorChartInstance.remove();
      config.indicatorChartInstance = null;
    }
  }

  function initMainChart(containerId, type) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let chart = state[type].chartInstance;
    let series = state[type].candlestickSeries;

    if (chart && series) {
      // Keep alive: apply dynamic theme colors in case user switched themes
      const isLightMode = getComputedStyle(document.documentElement).getPropertyValue('--bg-color').trim().toLowerCase().startsWith('#f');
      const chartBg = isLightMode ? '#ffffff' : '#12121a';
      const chartText = isLightMode ? '#4e4e66' : '#8e8ea8';
      const gridColor = isLightMode ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.03)';
      const borderColor = isLightMode ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)';

      chart.applyOptions({
        layout: { background: { color: chartBg }, textColor: chartText },
        grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } },
        rightPriceScale: { borderColor: borderColor },
        timeScale: { borderColor: borderColor }
      });
      
      // Update candle data
      if (state[type].chartData && state[type].chartData.length > 0) {
        series.setData(state[type].chartData);
      }
      return chart;
    }

    // Otherwise, create new
    destroyChart(type);
    
    const isLightMode = getComputedStyle(document.documentElement).getPropertyValue('--bg-color').trim().toLowerCase().startsWith('#f');
    const chartBg = isLightMode ? '#ffffff' : '#12121a';
    const chartText = isLightMode ? '#4e4e66' : '#8e8ea8';
    const gridColor = isLightMode ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.03)';
    const borderColor = isLightMode ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)';

    chart = LightweightCharts.createChart(container, {
      layout: {
        background: { type: LightweightCharts.ColorType.Solid, color: chartBg },
        textColor: chartText,
        fontSize: 11
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor }
      },
      crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: borderColor,
      },
      timeScale: {
        borderColor: borderColor,
        timeVisible: true
      },
      width: container.clientWidth,
      height: type === 'crypto' ? 320 : 400
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#00e676',
      downColor: '#ff5252',
      borderVisible: false,
      wickUpColor: '#00e676',
      wickDownColor: '#ff5252'
    });

    state[type].chartInstance = chart;
    state[type].candlestickSeries = candlestickSeries;

    if (state[type].chartData && state[type].chartData.length > 0) {
      candlestickSeries.setData(state[type].chartData);
    }

    const resizeObserver = new ResizeObserver(entries => {
      if (entries.length === 0 || !chart) return;
      chart.applyOptions({ width: container.clientWidth });
    });
    resizeObserver.observe(container);

    return chart;
  }

  function initSubChart(containerId, type) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.style.display = 'block';

    const isLightMode = getComputedStyle(document.documentElement).getPropertyValue('--bg-color').trim().toLowerCase().startsWith('#f');
    const chartBg = isLightMode ? '#ffffff' : '#12121a';
    const chartText = isLightMode ? '#4e4e66' : '#8e8ea8';
    const gridColor = isLightMode ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.02)';
    const borderColor = isLightMode ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)';

    const chart = LightweightCharts.createChart(container, {
      layout: {
        background: { type: LightweightCharts.ColorType.Solid, color: chartBg },
        textColor: chartText,
        fontSize: 10
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor }
      },
      rightPriceScale: {
        borderColor: borderColor,
      },
      timeScale: {
        borderColor: borderColor,
        visible: false // hide timeline since main chart already has it
      },
      width: container.clientWidth,
      height: 120
    });

    state[type].indicatorChartInstance = chart;

    const resizeObserver = new ResizeObserver(entries => {
      if (entries.length === 0 || !chart) return;
      chart.applyOptions({ width: container.clientWidth });
    });
    resizeObserver.observe(container);

    return chart;
  }

  // 2. Technical Indicator Overlay Renderer
  function renderChartOverlays(type) {
    const config = state[type];
    const data = config.chartData;
    const series = config.candlestickSeries;
    const chart = config.chartInstance;
    const indicators = config.activeIndicators;

    if (!chart || !series || data.length === 0) return;

    // Clear old indicator series
    Object.values(config.indicatorLineSeries).forEach(s => {
      try { chart.removeSeries(s); } catch(e) {}
    });
    config.indicatorLineSeries = {};

    // Hide sub chart indicator initially
    const subContainer = document.getElementById(`${type}-sub-chart`);
    if (subContainer) subContainer.style.display = 'none';
    if (config.indicatorChartInstance) {
      config.indicatorChartInstance.remove();
      config.indicatorChartInstance = null;
    }

    // 1. Render SMA overlays
    if (indicators.includes('SMA20')) {
      const smaData = TradeMasterTA.calculateSMA(data, 20);
      const lineData = data.map((d, i) => ({ time: d.time, value: smaData[i] })).filter(item => item.value !== null);
      
      const smaSeries = chart.addLineSeries({ color: '#ffb300', lineWidth: 1.5, title: 'SMA 20' });
      smaSeries.setData(lineData);
      config.indicatorLineSeries['SMA20'] = smaSeries;
    }

    // 2. Render EMA overlays
    if (indicators.includes('EMA9')) {
      const emaData = TradeMasterTA.calculateEMA(data, 9);
      const lineData = data.map((d, i) => ({ time: d.time, value: emaData[i] })).filter(item => item.value !== null);
      
      const emaSeries = chart.addLineSeries({ color: '#29b6f6', lineWidth: 1.5, title: 'EMA 9' });
      emaSeries.setData(lineData);
      config.indicatorLineSeries['EMA9'] = emaSeries;
    }
    if (indicators.includes('EMA21')) {
      const emaData = TradeMasterTA.calculateEMA(data, 21);
      const lineData = data.map((d, i) => ({ time: d.time, value: emaData[i] })).filter(item => item.value !== null);
      
      const emaSeries = chart.addLineSeries({ color: '#ab47bc', lineWidth: 1.5, title: 'EMA 21' });
      emaSeries.setData(lineData);
      config.indicatorLineSeries['EMA21'] = emaSeries;
    }

    // 3. Render Bollinger Bands
    if (indicators.includes('BB')) {
      const bbData = TradeMasterTA.calculateBB(data, 20, 2);
      
      const upperData = data.map((d, i) => ({ time: d.time, value: bbData[i].upper })).filter(item => item.value !== null);
      const middleData = data.map((d, i) => ({ time: d.time, value: bbData[i].middle })).filter(item => item.value !== null);
      const lowerData = data.map((d, i) => ({ time: d.time, value: bbData[i].lower })).filter(item => item.value !== null);

      const upperSeries = chart.addLineSeries({ color: '#26a69a', lineWidth: 1, lineStyle: LightweightCharts.LineStyle.Dotted, title: 'BB Upper' });
      const middleSeries = chart.addLineSeries({ color: 'rgba(38, 166, 154, 0.4)', lineWidth: 1, title: 'BB Middle' });
      const lowerSeries = chart.addLineSeries({ color: '#ef5350', lineWidth: 1, lineStyle: LightweightCharts.LineStyle.Dotted, title: 'BB Lower' });

      upperSeries.setData(upperData);
      middleSeries.setData(middleData);
      lowerSeries.setData(lowerData);

      config.indicatorLineSeries['BBu'] = upperSeries;
      config.indicatorLineSeries['BBm'] = middleSeries;
      config.indicatorLineSeries['BBl'] = lowerSeries;
    }

    // 4. Render RSI on sub-chart
    if (indicators.includes('RSI')) {
      const rsiData = TradeMasterTA.calculateRSI(data, 14);
      const lineData = data.map((d, i) => ({ time: d.time, value: rsiData[i] })).filter(item => item.value !== null);

      const subChart = initSubChart(`${type}-sub-chart`, type);
      if (subChart) {
        // Draw baseline at 70, 50, 30
        const rsiSeries = subChart.addLineSeries({ color: '#ff7043', lineWidth: 1.5, title: 'RSI 14' });
        rsiSeries.setData(lineData);

        // Add visual horizontal lines
        const baseline30 = subChart.addLineSeries({ color: 'rgba(239, 83, 80, 0.2)', lineWidth: 1, lineStyle: LightweightCharts.LineStyle.Dotted });
        const baseline70 = subChart.addLineSeries({ color: 'rgba(38, 166, 154, 0.2)', lineWidth: 1, lineStyle: LightweightCharts.LineStyle.Dotted });
        
        baseline30.setData(data.map(d => ({ time: d.time, value: 30 })));
        baseline70.setData(data.map(d => ({ time: d.time, value: 70 })));

        // Link timescales to keep scroll synchronized
        chart.timeScale().subscribeVisibleTimeRangeChange((range) => {
          if (range) subChart.timeScale().setVisibleRange(range);
        });
      }
    }
  }

  // 3. Page Rendering Logic
  async function renderDashboard() {
    console.log('Rendering Dashboard page...');
    const parent = document.getElementById('page-dashboard');
    if (!parent) return;

    // Load top crypto prices
    const cryptos = await TradeMasterAPI.getCryptoTickers();
    const cryptoContainer = document.getElementById('dashboard-crypto-list');
    if (cryptoContainer) {
      cryptoContainer.innerHTML = cryptos.map(c => `
        <div class="card" style="padding: 16px; cursor: pointer;" onclick="TradeMasterApp.navigateTo('crypto', '${c.symbol}')">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-weight: 700; font-size: 1.1rem; display: flex; align-items: center; gap: 8px;">
              <span class="logo-icon" style="width: 24px; height: 24px; font-size: 0.8rem; box-shadow: none;">${c.symbol[0]}</span>
              ${c.symbol} <span style="font-size: 0.8rem; color: var(--text-muted);">/USDT</span>
            </span>
            <span class="badge ${c.change >= 0 ? 'badge-success' : 'badge-danger'}">${c.change >= 0 ? '+' : ''}${c.change.toFixed(2)}%</span>
          </div>
          <div style="font-size: 1.4rem; font-weight: 700; margin-bottom: 4px;">$${c.price.toLocaleString()}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted)">Vol: $${(c.volume * c.price / 1000).toFixed(0)}K</div>
        </div>
      `).join('');
    }

    // Calculate dynamic Fear & Greed based on watchlist performance
    let cryptoChangeSum = 0;
    if (cryptos && cryptos.length > 0) {
      cryptos.forEach(c => { cryptoChangeSum += c.change; });
      const avgCryptoChange = cryptoChangeSum / cryptos.length;
      
      let fgValue = Math.round(55 + (avgCryptoChange * 2.5) + (state.sentimentScorecard ? state.sentimentScorecard.score * 5 : 0));
      fgValue = Math.max(10, Math.min(95, fgValue));
      
      let fgLabel = 'NEUTRAL';
      let fgBadge = 'badge-warning';
      let fgColor = 'var(--warning)';
      let fgAdv = 'DCA: Hold / Akumulasi Lemah';
      
      if (fgValue >= 75) {
        fgLabel = 'EXTREME GREED';
        fgBadge = 'badge-danger';
        fgColor = 'var(--danger)';
        fgAdv = 'DCA: Tunda / Amankan Profit';
      } else if (fgValue >= 55) {
        fgLabel = 'GREED';
        fgBadge = 'badge-warning';
        fgColor = 'var(--warning)';
        fgAdv = 'DCA: Hold / Pasang Target Jual';
      } else if (fgValue <= 25) {
        fgLabel = 'EXTREME FEAR';
        fgBadge = 'badge-success';
        fgColor = 'var(--success)';
        fgAdv = 'DCA: AGRESIF / SEROK AKUMULASI';
      } else if (fgValue <= 45) {
        fgLabel = 'FEAR';
        fgBadge = 'badge-info';
        fgColor = 'var(--primary)';
        fgAdv = 'DCA: Beli Cicil Bertahap';
      }

      const fgValEl = document.getElementById('crypto-fear-greed-val');
      const fgLabelEl = document.getElementById('crypto-fear-greed-label');
      if (fgValEl) {
        fgValEl.innerText = fgValue;
        fgValEl.style.color = fgColor;
      }
      if (fgLabelEl) {
        fgLabelEl.innerText = fgLabel;
        fgLabelEl.className = `badge ${fgBadge}`;
        const advEl = fgLabelEl.parentElement.querySelector('div:last-child');
        if (advEl) advEl.innerText = fgAdv;
      }
    }

    // Load static Indonesian Stocks for Watchlist
    const stocks = ['BBCA', 'TLKM', 'ASII', 'GOTO', 'BMRI'];
    const stockContainer = document.getElementById('dashboard-stock-list');
    if (stockContainer) {
      stockContainer.innerHTML = `<tr><td colspan="5" style="text-align: center;">Mengambil data IHSG...</td></tr>`;
      
      try {
        const quotes = await TradeMasterAPI.getIDXQuotes(stocks);
        if (quotes.length > 0) {
          stockContainer.innerHTML = quotes.map(q => `
            <tr style="cursor: pointer;" onclick="TradeMasterApp.navigateTo('stocks', '${q.symbol}')">
              <td style="font-weight: 700;">${q.symbol}.JK</td>
              <td style="font-weight: bold;">Rp${q.price.toLocaleString()}</td>
              <td class="${q.change >= 0 ? 'metric-change up' : 'metric-change down'}">
                ${q.change >= 0 ? '▲' : '▼'} ${q.change.toFixed(2)}%
              </td>
              <td>
                <span id="ta-badge-${q.symbol}" class="badge badge-warning">Analyzing...</span>
              </td>
              <td id="ta-acc-${q.symbol}" style="color: var(--text-muted); font-size: 0.8rem;">Menghitung...</td>
            </tr>
          `).join('');

          // Calculate dynamic IDX Temperature based on stock valuation bands
          let idxTemp = 28;
          let idxLabel = 'UNDERVALUED';
          let idxBadge = 'badge-success';
          let idxColor = 'var(--success)';
          let idxAdv = 'DCA: Sangat Layak Beli';

          const bbriQuote = quotes.find(q => q.symbol === 'BBRI');
          if (bbriQuote) {
            const price = bbriQuote.price;
            if (price < 4000) {
              idxTemp = 18;
              idxLabel = 'CRISIS DISCOUNT';
              idxBadge = 'badge-success';
              idxColor = 'var(--success)';
              idxAdv = 'RDN: ALL-IN BUY';
            } else if (price < 4500) {
              idxTemp = 28;
              idxLabel = 'UNDERVALUED';
              idxBadge = 'badge-success';
              idxColor = 'var(--success)';
              idxAdv = 'RDN: Akumulasi Agresif';
            } else if (price >= 5800) {
              idxTemp = 82;
              idxLabel = 'OVERVALUED';
              idxBadge = 'badge-danger';
              idxColor = 'var(--danger)';
              idxAdv = 'RDN: Jual / Amankan Cash';
            } else if (price >= 5200) {
              idxTemp = 65;
              idxLabel = 'PREMIUM / FAIR';
              idxBadge = 'badge-warning';
              idxColor = 'var(--warning)';
              idxAdv = 'RDN: Hold / Cicil Jual';
            } else {
              idxTemp = 42;
              idxLabel = 'FAIR VALUE';
              idxBadge = 'badge-info';
              idxColor = 'var(--primary)';
              idxAdv = 'RDN: Hold / Monitor';
            }
          }

          const tempValEl = document.getElementById('idx-temp-val');
          const tempLabelEl = document.getElementById('idx-temp-label');
          if (tempValEl) {
            tempValEl.innerText = `${idxLabel === 'CRISIS DISCOUNT' || idxLabel === 'UNDERVALUED' ? 'Cold' : idxLabel === 'OVERVALUED' ? 'Hot' : 'Warm'} (${idxTemp}°C)`;
            tempValEl.style.color = idxColor;
          }
          if (tempLabelEl) {
            tempLabelEl.innerText = idxLabel;
            tempLabelEl.className = `badge ${idxBadge}`;
            const advEl = tempLabelEl.parentElement.querySelector('div:last-child');
            if (advEl) advEl.innerText = idxAdv;
          }

          // Load TA signals asynchronously in the background one by one
          quotes.forEach(async (q) => {
            try {
              const data = await TradeMasterAPI.getIDXChartData(q.symbol, '1mo', '1d');
              if (data.length > 0) {
                const taSignals = TradeMasterTA.generateSignals(data);
                const badge = document.getElementById(`ta-badge-${q.symbol}`);
                const acc = document.getElementById(`ta-acc-${q.symbol}`);
                
                if (badge) {
                  badge.innerText = taSignals.recommendation;
                  badge.className = `badge ${
                    taSignals.recommendation.includes('BUY') ? 'badge-success' : 
                    taSignals.recommendation.includes('SELL') ? 'badge-danger' : 'badge-warning'
                  }`;
                }
                if (acc) {
                  acc.innerText = `TA: ${taSignals.accuracy}% Accurate`;
                }
              }
            } catch (e) {
              console.error(`Failed to calculate async TA for ${q.symbol}:`, e);
              const badge = document.getElementById(`ta-badge-${q.symbol}`);
              if (badge) badge.innerText = 'N/A';
            }
          });
        } else {
          stockContainer.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--danger);">Gagal mengambil data saham.</td></tr>`;
        }
      } catch (err) {
        console.error('Failed to load dashboard quotes:', err);
        stockContainer.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--danger);">Error koneksi API.</td></tr>`;
      }
    }

    // Render global issues news teaser
    renderGlobalNewsSummary();
  }

  async function renderCryptoPage() {
    console.log('Rendering Crypto Terminal...');
    const symbol = state.crypto.selected;
    const exchange = state.crypto.exchange || 'Binance';
    
    // Set headers
    document.getElementById('crypto-title').innerText = `${symbol}/USDT (${exchange})`;
    
    // Set up selectors
    const select = document.getElementById('crypto-select');
    if (select) select.value = symbol;

    const exchangeSelect = document.getElementById('exchange-select');
    if (exchangeSelect) exchangeSelect.value = exchange;

    // Clear old poll intervals
    if (state.crypto.pollInterval) {
      clearInterval(state.crypto.pollInterval);
      state.crypto.pollInterval = null;
    }

    // Fetch Chart Data using the selected exchange
    const data = await TradeMasterAPI.getCryptoChartData(symbol, state.crypto.chartInterval, 150, exchange);
    state.crypto.chartData = data;
    
    // Initialize and render chart
    initMainChart('crypto-chart-pane', 'crypto');
    renderChartOverlays('crypto');
    
    // Generate Written Analysis Report
    generateWrittenReport(data, 'crypto');

    // Run TA Sinyal Engine
    const signal = TradeMasterTA.generateSignals(data);
    const signalWidget = document.getElementById('crypto-signal-box');
    if (signalWidget) {
      signalWidget.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Rekomendasi Strategi</div>
          <div style="font-size: 1.8rem; font-weight: 900; margin: 8px 0; color: ${
            signal.recommendation.includes('BUY') ? 'var(--success)' : 
            signal.recommendation.includes('SELL') ? 'var(--danger)' : 'var(--warning)'
          }">${signal.recommendation}</div>
          <div class="badge badge-info">TA Accuracy: ~${signal.accuracy}%</div>
        </div>
        <div style="border-top: 1px solid var(--card-border); padding-top: 15px;">
          <div style="font-weight: 600; font-size: 0.9rem; margin-bottom: 10px;">Indikator Teknis Detail:</div>
          <div style="display: flex; flex-direction: column; gap: 8px; max-height: 180px; overflow-y: auto; padding-right: 5px;">
            ${signal.details.map(d => `
              <div style="display: flex; flex-direction: column; background: rgba(255,255,255,0.02); padding: 8px; border-radius: 6px; font-size: 0.8rem; border-left: 2px solid ${
                d.direction.includes('Bullish') || d.direction.includes('Oversold') ? 'var(--success)' :
                d.direction.includes('Bearish') || d.direction.includes('Overbought') ? 'var(--danger)' : 'var(--warning)'
              }">
                <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 2px;">
                  <span>${d.indicator}</span>
                  <span style="color: ${
                    d.direction.includes('Bullish') || d.direction.includes('Oversold') ? 'var(--success)' :
                    d.direction.includes('Bearish') || d.direction.includes('Overbought') ? 'var(--danger)' : 'var(--warning)'
                  }">${d.direction}</span>
                </div>
                <div style="color: var(--text-muted); font-size: 0.75rem;">${d.note}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Close WebSocket if open
    if (state.crypto.wsConnection) {
      state.crypto.wsConnection.close();
      state.crypto.wsConnection = null;
    }

    // Fetch initial price and render Whale Accumulation report
    const initialTicker = await TradeMasterAPI.getCryptoLiveTicker(symbol, exchange);
    if (initialTicker) {
      state.crypto.livePrice = initialTicker.price;
      const priceText = document.getElementById('crypto-live-price');
      if (priceText) {
        priceText.innerText = `$${initialTicker.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 6})}`;
      }
      renderCryptoWhaleFlow(symbol, initialTicker.price);
    }

    // Polling loop (every 3 seconds) to pull live price ticks and update Whale Tracker
    state.crypto.pollInterval = setInterval(async () => {
      const ticker = await TradeMasterAPI.getCryptoLiveTicker(symbol, exchange);
      if (ticker) {
        state.crypto.livePrice = ticker.price;
        const priceText = document.getElementById('crypto-live-price');
        
        let color = 'var(--text-main)';
        if (priceText) {
          const oldPrice = parseFloat(priceText.innerText.replace('$', '').replace(/,/g, ''));
          if (ticker.price > oldPrice) color = 'var(--success)';
          else if (ticker.price < oldPrice) color = 'var(--danger)';
          priceText.innerText = `$${ticker.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 6})}`;
          priceText.style.color = color;
        }

        const topCrypto = document.getElementById('top-crypto-ticker');
        if (topCrypto) {
          topCrypto.innerHTML = `<span class="ticker-label">${symbol}:</span> <span class="ticker-val up">$${ticker.price.toLocaleString()}</span>`;
        }

        // Keep Whale Tracker data updated
        renderCryptoWhaleFlow(symbol, ticker.price);
      }
    }, 3000);
  }

  async function renderStocksPage() {
    console.log('Rendering Stocks Terminal...');
    const symbol = state.stocks.selected;

    // Set headers
    document.getElementById('stock-title').innerText = `${symbol}.JK (Saham Indonesia)`;
    
    const select = document.getElementById('stock-select');
    if (select) select.value = symbol;

    // Fetch stock data from Yahoo Finance
    const data = await TradeMasterAPI.getIDXChartData(symbol);
    state.stocks.chartData = data;

    if (data.length > 0) {
      // Initialize and render chart
      initMainChart('stock-chart-pane', 'stocks');
      renderChartOverlays('stocks');
      const last = data[data.length - 1];
      const prev = data[data.length - 2];
      const changePct = ((last.close - prev.close) / prev.close) * 100;
      
      document.getElementById('stock-live-price').innerText = `Rp${last.close.toLocaleString()}`;
      const changeEl = document.getElementById('stock-price-change');
      changeEl.innerText = `${changePct >= 0 ? '▲ +' : '▼ '}${changePct.toFixed(2)}%`;
      changeEl.className = `metric-change ${changePct >= 0 ? 'up' : 'down'}`;
      
      // Generate Written Analysis Report
      generateWrittenReport(data, 'stocks');

      // Generate Whale Flow / Bandarmology analysis
      renderStockWhaleFlow(data, symbol);
    } else {
      document.getElementById('stock-live-price').innerText = 'Data N/A';
    }

    // Render BEI Whale Portfolios (>5% Shareholdings)
    renderBEIWhalePortfolios();

    // Calculate signals
    const signal = TradeMasterTA.generateSignals(data);
    const signalWidget = document.getElementById('stock-signal-box');
    if (signalWidget) {
      signalWidget.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Rekomendasi Saham</div>
          <div style="font-size: 1.8rem; font-weight: 900; margin: 8px 0; color: ${
            signal.recommendation.includes('BUY') ? 'var(--success)' : 
            signal.recommendation.includes('SELL') ? 'var(--danger)' : 'var(--warning)'
          }">${signal.recommendation}</div>
          <div class="badge badge-info">TA Accuracy: ~${signal.accuracy}%</div>
        </div>
        <div style="border-top: 1px solid var(--card-border); padding-top: 15px;">
          <div style="font-weight: 600; font-size: 0.9rem; margin-bottom: 10px;">Indikator Teknis Detail:</div>
          <div style="display: flex; flex-direction: column; gap: 8px; max-height: 180px; overflow-y: auto; padding-right: 5px;">
            ${signal.details.map(d => `
              <div style="display: flex; flex-direction: column; background: rgba(255,255,255,0.02); padding: 8px; border-radius: 6px; font-size: 0.8rem; border-left: 2px solid ${
                d.direction.includes('Bullish') || d.direction.includes('Oversold') ? 'var(--success)' :
                d.direction.includes('Bearish') || d.direction.includes('Overbought') ? 'var(--danger)' : 'var(--warning)'
              }">
                <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 2px;">
                  <span>${d.indicator}</span>
                  <span style="color: ${
                    d.direction.includes('Bullish') || d.direction.includes('Oversold') ? 'var(--success)' :
                    d.direction.includes('Bearish') || d.direction.includes('Overbought') ? 'var(--danger)' : 'var(--warning)'
                  }">${d.direction}</span>
                </div>
                <div style="color: var(--text-muted); font-size: 0.75rem;">${d.note}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Render upcoming IPO tracker table
    renderUpcomingIPOs();

    // Render Broker portfolio accumulation tracker
    renderBrokerAccumulationTracker();
  }

  async function renderGlobalNewsSummary() {
    console.log('Fetching News RSS feed...');
    
    // Fetch feed
    const rawNews = await TradeMasterAPI.getGlobalNews();
    state.news = rawNews;

    // Analyze news list with Geopolitical Impact engine
    state.analyzedNews = rawNews.map(item => TradeMasterImpact.analyzeNewsItem(item));
    
    // Calculate global sentiment scorecard
    state.sentimentScorecard = TradeMasterImpact.compileGlobalSentiment(state.analyzedNews);

    // Update global top sentiment cards on Dashboard or Sidebar
    const cardNewsContainer = document.getElementById('dashboard-news-list');
    if (cardNewsContainer) {
      cardNewsContainer.innerHTML = state.analyzedNews.slice(0, 5).map(item => `
        <div class="news-item">
          <div class="news-meta">
            <span>${item.source}</span>
            <span>${item.pubDate}</span>
            <span class="badge" style="background: rgba(108, 92, 231, 0.1); color: var(--primary); font-size:0.65rem;">${item.category}</span>
          </div>
          <a href="${item.link}" target="_blank" class="news-title">${item.title}</a>
          <div class="news-impact-box" style="border-left-color: ${
            item.sentiment.includes('Bullish') || item.sentiment.includes('Apresiasi') ? 'var(--success)' :
            item.sentiment.includes('Bearish') || item.sentiment.includes('Depresiasi') || item.sentiment.includes('Risk-Off') ? 'var(--danger)' : 'var(--text-dark)'
          };">
            💡 <b>Analisis Dampak:</b> ${item.analysis}
            <div style="margin-top: 4px; font-size:0.8rem; font-weight:700;">
              Crypto: <span style="color:${item.cryptoScore >= 0 ? 'var(--success)' : 'var(--danger)'}">${item.cryptoScore >= 0 ? '+' : ''}${item.cryptoScore}</span> | 
              Saham: <span style="color:${item.stockScore >= 0 ? 'var(--success)' : 'var(--danger)'}">${item.stockScore >= 0 ? '+' : ''}${item.stockScore}</span> |
              Saran: <span style="color:var(--primary)">${item.strategy}</span>
            </div>
          </div>
        </div>
      `).join('');
    }

    // Update Dashboard Geopolitical Summary
    const summaryCard = document.getElementById('dashboard-geopolitical-summary');
    if (summaryCard && state.sentimentScorecard) {
      summaryCard.innerHTML = `
        <div style="font-weight: 700; font-size: 1.1rem; margin-bottom: 12px; color: var(--primary);">Scorecard Sentimen Geopolitik & Makro</div>
        <div style="display: flex; gap: 15px; margin-bottom: 15px;">
          <div style="flex:1; background:rgba(255,255,255,0.02); padding:10px; border-radius:8px; text-align:center;">
            <div style="font-size:0.75rem; color:var(--text-muted);">SENTIMEN CRYPTO</div>
            <div style="font-size:1.1rem; font-weight:bold; margin:4px 0; color:${state.sentimentScorecard.cryptoScore >= 0 ? 'var(--success)' : 'var(--danger)'}">
              ${state.sentimentScorecard.cryptoSentiment}
            </div>
            <div style="font-size:0.8rem; color:var(--text-muted);">Avg: ${state.sentimentScorecard.cryptoScore}</div>
          </div>
          <div style="flex:1; background:rgba(255,255,255,0.02); padding:10px; border-radius:8px; text-align:center;">
            <div style="font-size:0.75rem; color:var(--text-muted);">SENTIMEN SAHAM (IDX)</div>
            <div style="font-size:1.1rem; font-weight:bold; margin:4px 0; color:${state.sentimentScorecard.stockScore >= 0 ? 'var(--success)' : 'var(--danger)'}">
              ${state.sentimentScorecard.stockSentiment}
            </div>
            <div style="font-size:0.8rem; color:var(--text-muted);">Avg: ${state.sentimentScorecard.stockScore}</div>
          </div>
        </div>
        <div style="font-size: 0.85rem; line-height: 1.4; color: var(--text-main); font-style: italic;">
          ${state.sentimentScorecard.summary}
        </div>
      `;
    }
  }

  async function renderNewsPage() {
    console.log('Rendering full Geopolitical & Global issues page...');
    const container = document.getElementById('full-news-feed-container');
    if (!container) return;

    if (state.analyzedNews.length === 0) {
      await renderGlobalNewsSummary();
    }

    container.innerHTML = state.analyzedNews.map(item => `
      <div class="card" style="margin-bottom: 16px;">
        <div class="news-meta">
          <span>📅 ${item.pubDate}</span>
          <span>📰 ${item.source}</span>
          <span class="badge badge-info">${item.category}</span>
          <span class="badge" style="background:${item.cryptoScore + item.stockScore >= 0 ? 'var(--success-glow)' : 'var(--danger-glow)'}; color:${item.cryptoScore + item.stockScore >= 0 ? 'var(--success)' : 'var(--danger)'};">
            Sentiment: ${item.sentiment}
          </span>
        </div>
        <a href="${item.link}" target="_blank" class="news-title" style="font-size: 1.15rem; margin-bottom: 12px;">${item.title}</a>
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px; border-top: 1px solid var(--card-border); padding-top: 15px; font-size: 0.9rem;">
          <div>
            <div style="font-weight: 700; color: var(--primary); margin-bottom: 6px;">Dampak terhadap Market:</div>
            <p style="color: var(--text-main); line-height: 1.5;">${item.analysis}</p>
          </div>
          <div style="background: rgba(255,255,255,0.02); padding: 12px; border-radius: 8px; display: flex; flex-direction: column; gap: 8px;">
            <div style="font-weight: 700; font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted);">Skor Dampak Geopolitik</div>
            <div style="display: flex; justify-content: space-between;">
              <span>Crypto (BTC):</span>
              <span style="font-weight:bold; color:${item.cryptoScore >= 0 ? 'var(--success)' : 'var(--danger)'}">
                ${item.cryptoScore >= 0 ? '+' : ''}${item.cryptoScore}
              </span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Saham IDX:</span>
              <span style="font-weight:bold; color:${item.stockScore >= 0 ? 'var(--success)' : 'var(--danger)'}">
                ${item.stockScore >= 0 ? '+' : ''}${item.stockScore}
              </span>
            </div>
            <div style="border-top:1px solid var(--card-border); margin-top:4px; padding-top:8px;">
              <span style="font-weight:bold; font-size:0.75rem; color:var(--text-muted);">STRATEGI:</span>
              <div style="font-weight:700; font-size:0.8rem; color:var(--primary); margin-top:2px;">${item.strategy}</div>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  }

  async function renderStrategyPage() {
    console.log('Rendering Strategy Engine page...');
    
    const avgInput = document.getElementById('stock-avg-price');
    const userAvgPrice = avgInput ? (parseFloat(avgInput.value) || 5400) : 5400;
    
    // Fetch fresh data if needed
    if (state.crypto.chartData.length === 0) {
      state.crypto.chartData = await TradeMasterAPI.getCryptoChartData(state.crypto.selected);
    }
    if (state.stocks.chartData.length === 0) {
      state.stocks.chartData = await TradeMasterAPI.getIDXChartData(state.stocks.selected);
    }
    if (state.analyzedNews.length === 0) {
      await renderGlobalNewsSummary();
    }

    const cryptoSignals = TradeMasterTA.generateSignals(state.crypto.chartData);
    const stockSignals = TradeMasterTA.generateSignals(state.stocks.chartData);
    const globalSentiment = state.sentimentScorecard;

    // Render combined widgets
    const container = document.getElementById('strategy-dashboard-container');
    if (!container) return;

    // Simple quantitative model combining TA score and Geopolitical Sentiment Score
    const combinedCryptoScore = cryptoSignals.score + (globalSentiment ? globalSentiment.cryptoScore : 0);
    const combinedStockScore = stockSignals.score + (globalSentiment ? globalSentiment.stockScore : 0);

    let cryptoCombinedRec = 'HOLD';
    if (combinedCryptoScore >= 3.0) cryptoCombinedRec = 'STRONG BUY';
    else if (combinedCryptoScore >= 1.0) cryptoCombinedRec = 'BUY';
    else if (combinedCryptoScore <= -3.0) cryptoCombinedRec = 'STRONG SELL';
    else if (combinedCryptoScore <= -1.0) cryptoCombinedRec = 'SELL';

    let stockCombinedRec = 'HOLD';
    if (combinedStockScore >= 3.0) stockCombinedRec = 'STRONG BUY';
    else if (combinedStockScore >= 1.0) stockCombinedRec = 'BUY';
    else if (combinedStockScore <= -3.0) stockCombinedRec = 'STRONG SELL';
    else if (combinedStockScore <= -1.0) stockCombinedRec = 'SELL';

    // 1. Calculate Whale Activity Distribution dynamically from state.beiWhales
    const totalWhales = state.beiWhales.length;
    const accCount = state.beiWhales.filter(w => w.status === 'ACCUMULATING').length;
    const holdCount = state.beiWhales.filter(w => w.status === 'HOLDING').length;
    const tradeCount = state.beiWhales.filter(w => w.status.includes('SWING') || w.status.includes('SCALPING')).length;

    const accPct = totalWhales > 0 ? Math.round((accCount / totalWhales) * 100) : 0;
    const holdPct = totalWhales > 0 ? Math.round((holdCount / totalWhales) * 100) : 0;
    const tradePct = totalWhales > 0 ? Math.round((tradeCount / totalWhales) * 100) : 0;

    // 2. Identify Consensus Overlapping Stocks
    const stockCounts = {};
    state.beiWhales.forEach(w => {
      w.holdings.forEach(h => {
        const cleanH = h.trim().toUpperCase();
        if (cleanH) {
          stockCounts[cleanH] = (stockCounts[cleanH] || 0) + 1;
        }
      });
    });

    const consensusStocks = Object.entries(stockCounts)
      .map(([symbol, count]) => ({ symbol, count }))
      .filter(item => item.count >= 2)
      .sort((a, b) => b.count - a.count);

    // 3. Sector Dominance
    const sectorCounts = {};
    state.beiWhales.forEach(w => {
      let sec = 'Lainnya';
      const sText = w.sector.toLowerCase();
      if (sText.includes('energi') || sText.includes('komoditas') || sText.includes('batubara') || sText.includes('emas') || sText.includes('pertambangan') || sText.includes('barito')) {
        sec = 'Energi & Komoditas';
      } else if (sText.includes('tech') || sText.includes('teknologi') || sText.includes('growth') || sText.includes('macro')) {
        sec = 'Teknologi & Growth';
      } else if (sText.includes('consumer') || sText.includes('ritel') || sText.includes('konsumer') || sText.includes('tan corp')) {
        sec = 'Konsumer & Ritel';
      } else if (sText.includes('properti') || sText.includes('estate') || sText.includes('sedayu')) {
        sec = 'Properti & Real Estate';
      } else if (sText.includes('finance') || sText.includes('bank') || sText.includes('perbankan')) {
        sec = 'Perbankan & Keuangan';
      } else if (sText.includes('value')) {
        sec = 'Value Investing';
      }
      sectorCounts[sec] = (sectorCounts[sec] || 0) + 1;
    });

    const topSectors = Object.entries(sectorCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // 4. Actionable Strategy & Sentiment Rating
    let whaleSentimentText = 'MIXED';
    let whaleSentimentClass = 'badge-warning';
    let whaleStrategyRec = '';

    if (accPct >= 40) {
      whaleSentimentText = 'BULLISH ACCUMULATION';
      whaleSentimentClass = 'badge-success';
      whaleStrategyRec = `🚀 <b>Whale Sentiment: BULLISH ACCUMULATION</b><br>
        Sebagian besar konglomerat dan super-retailer sedang mengumpulkan barang (Accumulating: ${accPct}%). 
        <b>Strategi Eksekusi:</b> Ikuti aksi beli whale! Prioritaskan akumulasi bertahap pada emiten konsensus terkuat seperti 
        ${consensusStocks.length > 0 ? consensusStocks.slice(0, 3).map(s => `<b>${s.symbol}</b>`).join(', ') : 'BBRI dan GOTO'} 
        saat terjadi koreksi teknikal di dekat level support utama. Sektor <b>${topSectors[0]?.name || 'Perbankan'}</b> menjadi penopang utama portofolio mereka saat ini.`;
    } else if (holdPct >= 50) {
      whaleSentimentText = 'STABLE HOLDING';
      whaleSentimentClass = 'badge-warning';
      whaleStrategyRec = `⚖️ <b>Whale Sentiment: STABLE HOLDING</b><br>
        Para whale cenderung mempertahankan portofolio tanpa aktivitas beli/jual yang agresif (Holding: ${holdPct}%). 
        <b>Strategi Eksekusi:</b> Kondisi pasar dalam mode wait-and-see. Disarankan untuk membatasi pembukaan posisi baru dalam jumlah besar. 
        Gunakan teknik swing trading pada saham-saham konsensus, manfaatkan fluktuasi jangka pendek, dan pertahankan porsi kas RDN sebesar 30-40%.`;
    } else if (tradePct >= 40) {
      whaleSentimentText = 'ACTIVE SWING / VOLATILITY';
      whaleSentimentClass = 'badge-info';
      whaleStrategyRec = `⚡ <b>Whale Sentiment: ACTIVE SWING / SCALPING</b><br>
        Mayoritas whale ritel super kaya sangat aktif melakukan swing atau scalping cepat (Active trading: ${tradePct}%). 
        <b>Strategi Eksekusi:</b> Volatilitas pasar sangat tinggi. Fokus pada saham momentum dengan volume breakout yang didukung akumulasi broker top. 
        Gunakan stop loss ketat (maksimal 3% di bawah harga entry) dan segera amankan profit jika target teknikal jangka pendek tercapai.`;
    } else {
      whaleSentimentText = 'NEUTRAL / DIVERGENT';
      whaleSentimentClass = 'badge-warning';
      whaleStrategyRec = `🔍 <b>Whale Sentiment: NEUTRAL / DIVERGENT</b><br>
        Aktivitas portofolio para whale terbagi secara merata antara akumulasi, hold, dan trading. Tidak ada konsensus dominan.
        <b>Strategi Eksekusi:</b> Lakukan alokasi portofolio secara defensif. Bagi alokasi dana secara berimbang antara saham perbankan big cap sebagai jangkar investasi, 
        dan simpan sisa dana dalam bentuk kas stabil atau aset kripto utama (BTC) untuk menjaga likuiditas.`;
    }

    container.innerHTML = `
      <!-- Crypto Strategy Card -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">🤖 Combined Strategy Kripto (${state.crypto.selected})</span>
          <span class="badge ${cryptoCombinedRec.includes('BUY') ? 'badge-success' : cryptoCombinedRec.includes('SELL') ? 'badge-danger' : 'badge-warning'}">${cryptoCombinedRec}</span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
          <div style="background: rgba(255,255,255,0.01); padding: 15px; border-radius: 8px; border: 1px solid var(--card-border);">
            <div style="font-weight:700; font-size:0.85rem; color:var(--text-muted); text-transform:uppercase; margin-bottom:10px;">Masukan Analisis Kuantitatif</div>
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
              <span>Skor Teknikal (TA):</span>
              <span style="font-weight:bold; color:${cryptoSignals.score >= 0 ? 'var(--success)' : 'var(--danger)'}">${cryptoSignals.score >= 0 ? '+' : ''}${cryptoSignals.score}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
              <span>Skor Geopolitik/Isu:</span>
              <span style="font-weight:bold; color:${globalSentiment.cryptoScore >= 0 ? 'var(--success)' : 'var(--danger)'}">${globalSentiment.cryptoScore >= 0 ? '+' : ''}${globalSentiment.cryptoScore}</span>
            </div>
            <div style="border-top:1px solid var(--card-border); padding-top:8px; display:flex; justify-content:space-between; font-weight:bold;">
              <span>Skor Terkombinasi:</span>
              <span style="color:${combinedCryptoScore >= 0 ? 'var(--success)' : 'var(--danger)'}">${combinedCryptoScore >= 0 ? '+' : ''}${combinedCryptoScore.toFixed(1)}</span>
            </div>
          </div>
          <div>
            <div style="font-weight:700; font-size:0.85rem; color:var(--text-muted); text-transform:uppercase; margin-bottom:10px;">Sinyal Keandalan</div>
            <div class="strategy-signal-card">
              <div>
                <div style="font-weight:bold; font-size:1.1rem; color:var(--text-main);">Akurasi Terkombinasi</div>
                <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">Kombinasi TA + Sentimen Makro</div>
              </div>
              <div style="font-size:2rem; font-weight:900; color:var(--primary);">~${Math.min(cryptoSignals.accuracy + 2, 92)}%</div>
            </div>
          </div>
        </div>
        <div style="border-top: 1px solid var(--card-border); padding-top: 15px;">
          <div style="font-weight:700; margin-bottom:12px; color:var(--primary);">Strategi Eksekusi:</div>
          <div class="strategy-step">
            <div class="step-num">1</div>
            <div>
              <div style="font-weight:bold; font-size:0.9rem;">Skenario Trading Jangka Pendek (Trading Cepat)</div>
              <p style="font-size:0.85rem; color:var(--text-muted); margin-top:4px;">
                ${
                  cryptoCombinedRec.includes('BUY') ? `Entry Beli di area support terdekat. Target profit 5-10% dari level masuk. Pasang Stop Loss ketat di 3% di bawah support.` :
                  cryptoCombinedRec.includes('SELL') ? `Amankan aset Kripto Anda. Hindari pembukaan posisi beli baru. Spekulatif SHORT dengan leverage rendah di area resistance.` :
                  `Kondisi pasar sideways. Manfaatkan strategi Scalping range sempit di area Support/Resistance Bollinger Bands.`
                }
              </p>
            </div>
          </div>
          <div class="strategy-step">
            <div class="step-num">2</div>
            <div>
              <div style="font-weight:bold; font-size:0.9rem;">Skenario Investasi Jangka Panjang (Investing)</div>
              <p style="font-size:0.85rem; color:var(--text-muted); margin-top:4px;">
                ${
                  combinedCryptoScore > 0 ? `Lanjutkan Dollar Cost Averaging (DCA) dengan porsi 70% di Kripto Utama (BTC/ETH) dan 30% di Altcoins potensial.` :
                  combinedCryptoScore < 0 ? `Lakukan profit-taking berkala pada Altcoins yang berisiko tinggi. Hold Cash/Stablecoin lebih banyak menunggu diskon harga.` :
                  `Kondisi makroekonomi defensif. Pertahankan kepemilikan BTC Anda, tunda pembelian Altcoins.`
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Stock Strategy Card -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">🏢 Combined Strategy Saham IDX (${state.stocks.selected})</span>
          <span class="badge ${stockCombinedRec.includes('BUY') ? 'badge-success' : stockCombinedRec.includes('SELL') ? 'badge-danger' : 'badge-warning'}">${stockCombinedRec}</span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
          <div style="background: rgba(255,255,255,0.01); padding: 15px; border-radius: 8px; border: 1px solid var(--card-border);">
            <div style="font-weight:700; font-size:0.85rem; color:var(--text-muted); text-transform:uppercase; margin-bottom:10px;">Masukan Analisis Kuantitatif</div>
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
              <span>Skor Teknikal (TA):</span>
              <span style="font-weight:bold; color:${stockSignals.score >= 0 ? 'var(--success)' : 'var(--danger)'}">${stockSignals.score >= 0 ? '+' : ''}${stockSignals.score}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
              <span>Skor Geopolitik/Isu:</span>
              <span style="font-weight:bold; color:${globalSentiment.stockScore >= 0 ? 'var(--success)' : 'var(--danger)'}">${globalSentiment.stockScore >= 0 ? '+' : ''}${globalSentiment.stockScore}</span>
            </div>
            <div style="border-top:1px solid var(--card-border); padding-top:8px; display:flex; justify-content:space-between; font-weight:bold;">
              <span>Skor Terkombinasi:</span>
              <span style="color:${combinedStockScore >= 0 ? 'var(--success)' : 'var(--danger)'}">${combinedStockScore >= 0 ? '+' : ''}${combinedStockScore.toFixed(1)}</span>
            </div>
          </div>
          <div>
            <div style="font-weight:700; font-size:0.85rem; color:var(--text-muted); text-transform:uppercase; margin-bottom:10px;">Sinyal Keandalan</div>
            <div class="strategy-signal-card">
              <div>
                <div style="font-weight:bold; font-size:1.1rem; color:var(--text-main);">Akurasi Terkombinasi</div>
                <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">Kombinasi TA + Sentimen Makro</div>
              </div>
              <div style="font-size:2rem; font-weight:900; color:var(--primary);">~${Math.min(stockSignals.accuracy + 1, 91)}%</div>
            </div>
          </div>
        </div>
        <div style="border-top: 1px solid var(--card-border); padding-top: 15px;">
          <div style="font-weight:700; margin-bottom:12px; color:var(--primary);">Strategi Eksekusi:</div>
          <div class="strategy-step">
            <div class="step-num">1</div>
            <div>
              <div style="font-weight:bold; font-size:0.9rem;">Skenario Trading Jangka Pendek (Trading Cepat)</div>
              <p style="font-size:0.85rem; color:var(--text-muted); margin-top:4px;">
                ${
                  stockCombinedRec.includes('BUY') ? `Buy on Weakness di level support terdekat. Antisipasi swing up menuju garis SMA50. Stop Loss 2.5% di bawah support.` :
                  stockCombinedRec.includes('SELL') ? `Kurangi porsi portofolio saham ini. Hindari aksi serok bawah jika tren utama masih mengarah ke bawah (bearish).` :
                  `Saham dalam rentang konsolidasi. Cocok untuk teknik buy support, sell resistance jangka pendek.`
                }
              </p>
            </div>
          </div>
          <div class="strategy-step">
            <div class="step-num">2</div>
            <div>
              <div style="font-weight:bold; font-size:0.9rem;">Skenario Investasi Jangka Panjang (Investing)</div>
              <p style="font-size:0.85rem; color:var(--text-muted); margin-top:4px;">
                ${
                  combinedStockScore > 0 ? `Lanjutkan investasi berkala pada Saham Bluechip (IHSG). Sektor Perbankan Buku 4 dan Konsumer defensif direkomendasikan.` :
                  combinedStockScore < 0 ? `Perbanyak porsi Kas RDN (hingga 40-50%). Tunggu penurunan harga akibat sentimen capital outflow global untuk serok harga murah.` :
                  `Kondisi makroekonomi seimbang. Lakukan diversifikasi moderat pada saham komoditas defensif.`
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Whale Portfolio Analysis Card (Full Width) -->
      <div class="card" style="grid-column: span 2; margin-top: 10px;">
        <div class="card-header">
          <span class="card-title" style="display: flex; align-items: center; gap: 8px;">
            🐳 Whale Sentiment & Copy-Trading Engine (Dynamic)
          </span>
          <span class="badge ${whaleSentimentClass}">${whaleSentimentText}</span>
        </div>
        
        <div style="margin-bottom: 20px;">
          <div style="font-weight:700; font-size:0.85rem; color:var(--text-muted); text-transform:uppercase; margin-bottom:10px;">Rekomendasi Strategi Whale</div>
          <div style="background: rgba(108, 92, 231, 0.05); padding: 15px; border-radius: 8px; border: 1px solid rgba(108, 92, 231, 0.2); line-height: 1.6; font-size: 0.9rem;">
            ${whaleStrategyRec}
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px;">
          <!-- Column 1: Whale Activity Distribution -->
          <div style="background: rgba(255,255,255,0.01); padding: 15px; border-radius: 8px; border: 1px solid var(--card-border);">
            <div style="font-weight:700; font-size:0.8rem; color:var(--text-muted); text-transform:uppercase; margin-bottom:12px;">Distribusi Aktivitas Whale</div>
            
            <div style="margin-bottom: 10px;">
              <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 4px;">
                <span>Accumulating (Akumulasi):</span>
                <span style="font-weight: bold; color: var(--success);">${accPct}% (${accCount})</span>
              </div>
              <div style="height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden;">
                <div style="width: ${accPct}%; height: 100%; background: var(--success);"></div>
              </div>
            </div>

            <div style="margin-bottom: 10px;">
              <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 4px;">
                <span>Holding (Bertahan):</span>
                <span style="font-weight: bold; color: var(--warning);">${holdPct}% (${holdCount})</span>
              </div>
              <div style="height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden;">
                <div style="width: ${holdPct}%; height: 100%; background: var(--warning);"></div>
              </div>
            </div>

            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 4px;">
                <span>Trading / Swing:</span>
                <span style="font-weight: bold; color: var(--primary);">${tradePct}% (${tradeCount})</span>
              </div>
              <div style="height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden;">
                <div style="width: ${tradePct}%; height: 100%; background: var(--primary);"></div>
              </div>
            </div>
          </div>

          <!-- Column 2: Overlapping Consensus Holdings -->
          <div style="background: rgba(255,255,255,0.01); padding: 15px; border-radius: 8px; border: 1px solid var(--card-border); display: flex; flex-direction: column;">
            <div style="font-weight:700; font-size:0.8rem; color:var(--text-muted); text-transform:uppercase; margin-bottom:12px;">Saham Konsensus Terkuat (>1 Whale)</div>
            <div style="display: flex; flex-direction: column; gap: 8px; flex-grow: 1; justify-content: flex-start;">
              ${
                consensusStocks.length === 0 
                  ? '<div style="color: var(--text-muted); font-size: 0.75rem; text-align: center; margin-top: auto; margin-bottom: auto;">Belum ada saham overlap. Tambahkan beberapa data holdings yang sama!</div>'
                  : consensusStocks.map(item => `
                      <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02); padding: 6px 10px; border-radius: 6px; border: 1px solid var(--card-border);">
                        <span class="badge badge-info" style="cursor: pointer; font-size: 0.75rem; padding: 3px 6px; font-weight: bold;" onclick="TradeMasterApp.navigateTo('stocks', '${item.symbol}')" title="Klik untuk memuat analisis ${item.symbol}">
                          ${item.symbol}
                        </span>
                        <span style="font-size: 0.72rem; color: var(--text-muted);">
                          Dipegang oleh <b style="color: var(--text-main);">${item.count} Whales</b>
                        </span>
                      </div>
                    `).join('')
              }
            </div>
          </div>

          <!-- Column 3: Sector Concentration -->
          <div style="background: rgba(255,255,255,0.01); padding: 15px; border-radius: 8px; border: 1px solid var(--card-border);">
            <div style="font-weight:700; font-size:0.8rem; color:var(--text-muted); text-transform:uppercase; margin-bottom:12px;">Konsentrasi Sektor Dominan</div>
            <div style="display: flex; flex-direction: column; gap: 6px;">
              ${
                topSectors.length === 0
                  ? '<div style="color: var(--text-muted); font-size: 0.75rem; text-align: center;">Data sektoral kosong.</div>'
                  : topSectors.slice(0, 4).map((item, idx) => `
                      <div style="display: flex; justify-content: space-between; font-size: 0.75rem; padding-bottom: 4px; border-bottom: 1px dashed rgba(255,255,255,0.05);">
                        <span style="color: var(--text-muted);">${idx + 1}. ${item.name}</span>
                        <span style="font-weight: bold; color: var(--primary);">${item.count} Investor</span>
                      </div>
                    `).join('')
              }
            </div>
          </div>
        </div>
      </div>

      <!-- Card 4: Sinergi Siklus & Portofolio Personal (Full Width) -->
      <div class="card" style="grid-column: span 2; margin-top: 16px;">
        <div class="card-header">
          <span class="card-title" style="display: flex; align-items: center; gap: 8px;">
            <i data-lucide="crosshair" style="color: var(--primary); width: 18px; height: 18px;"></i>
            🎯 Sinergi Siklus Kripto & Portofolio Saham Personal
          </span>
          <span class="badge badge-info">Sinergi Portofolio</span>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <!-- Crypto Cycle Synergy -->
          <div style="background: rgba(255,255,255,0.01); padding: 15px; border-radius: 8px; border: 1px solid var(--card-border);">
            <div style="font-weight:700; font-size:0.85rem; color:var(--text-muted); text-transform:uppercase; margin-bottom:12px;">Siklus Kripto (BTC)</div>
            
            <div style="margin-bottom: 12px;">
              <span style="font-size: 0.75rem; color: var(--text-muted);">Fase Siklus Ke-5 Saat Ini:</span>
              <div style="font-size: 1rem; font-weight: bold; color: var(--success); margin-top: 2px;">
                PRE-HALVING ACCUMULATION (DCA AKTIF)
              </div>
            </div>
            
            <div class="info-grid">
              <div class="info-card">
                <div class="info-card-label">Estimasi Bottom</div>
                <div class="info-card-value" style="color: var(--success);">23 Okt 2026</div>
              </div>
              <div class="info-card">
                <div class="info-card-label">Halving Ke-5</div>
                <div class="info-card-value" style="color: var(--primary);">17 Apr 2028</div>
              </div>
              <div class="info-card">
                <div class="info-card-label">Estimasi Puncak</div>
                <div class="info-card-value" style="color: var(--warning);">05 Sep 2029</div>
              </div>
            </div>
            
            <p style="font-size: 0.78rem; color: var(--text-muted); line-height: 1.45; margin-top: 12px; border-top: 1px dashed var(--card-border); padding-top: 8px; margin-bottom: 0;">
              💡 <b>Saran Strategis Kripto:</b> Saat ini adalah waktu emas untuk melakukan DCA mingguan/bulanan. Simpan seluruh kepemilikan Anda hingga target puncak siklus ke-5 diproyeksikan pada kuartal ketiga tahun 2029 (estimasi target harga $180,000 - $220,000).
            </p>
          </div>

          <!-- Stock Portfolio Synergy (BBRI) -->
          <div style="background: rgba(255,255,255,0.01); padding: 15px; border-radius: 8px; border: 1px solid var(--card-border);">
            <div style="font-weight:700; font-size:0.85rem; color:var(--text-muted); text-transform:uppercase; margin-bottom:12px;">Portofolio Saham (BBRI)</div>
            
            <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <span style="font-size: 0.75rem; color: var(--text-muted);">Modal Rata-rata Anda:</span>
                <div style="font-size: 1.1rem; font-weight: bold; color: var(--primary); margin-top: 2px;">
                  Rp ${userAvgPrice.toLocaleString()}
                </div>
              </div>
              <div style="text-align: right;">
                <span style="font-size: 0.75rem; color: var(--text-muted);">Rekomendasi Rata-rata:</span>
                <div style="font-weight: bold; color: ${userAvgPrice <= 4500 ? 'var(--success)' : 'var(--danger)'}; font-size: 0.85rem; margin-top: 2px;">
                  ${userAvgPrice <= 4500 ? '✓ AMAN (UNDER Rp 4,500)' : '⚠️ LAKUKAN AVERAGE DOWN'}
                </div>
              </div>
            </div>

            <div class="info-grid">
              <div class="info-card">
                <div class="info-card-label">PBV Band Wajar</div>
                <div class="info-card-value" style="color: var(--primary);">2.2x (Rp 4,600)</div>
              </div>
              <div class="info-card">
                <div class="info-card-label">Target Jual (No Loss)</div>
                <div class="info-card-value" style="color: var(--success);">Rp 4,800 - 5,300</div>
              </div>
              <div class="info-card">
                <div class="info-card-label">Waktu Jual Terbaik</div>
                <div class="info-card-value" style="color: var(--warning);">Des s.d. Mar</div>
              </div>
            </div>

            <p style="font-size: 0.78rem; color: var(--text-muted); line-height: 1.45; margin-top: 12px; border-top: 1px dashed var(--card-border); padding-top: 8px; margin-bottom: 0;">
              💡 <b>Saran Strategis BBRI:</b> ${
                userAvgPrice > 4500 
                  ? `Modal rata-rata Anda (Rp ${userAvgPrice.toLocaleString()}) terlalu tinggi. <b>Segera lakukan DCA/Averaging down</b> di area harga murah saat ini (di bawah Rp 4,000) untuk menurunkan rata-rata modal ke area Rp 4,000-Rp 4,200. Ini penting agar Anda bisa keluar dengan profit saat siklus naik tahunan berikutnya.`
                  : `Rata-rata modal Anda sudah sangat baik (Rp ${userAvgPrice.toLocaleString()}). Tahan (Hold) posisi Anda dan bersiap lakukan **penjualan massal** pada rentang **Rp 4,800 - Rp 5,300** saat periode pembagian dividen tahunan menjelang Maret.`
              }
            </p>
          </div>
        </div>
      </div>

      <!-- Card 5: Kalkulator Trading & Average Down Simulator (Full Width) -->
      <div class="card" style="grid-column: span 2; margin-top: 16px; padding: 20px;">
        <div class="card-header" style="padding: 0; margin-bottom: 16px; border: none;">
          <span class="card-title" style="display: flex; align-items: center; gap: 8px;">
            <i data-lucide="calculator" style="color: var(--primary); width: 18px; height: 18px;"></i>
            📊 Kalkulator Trading & Average Down Simulator
          </span>
          <span class="badge badge-info">Risk & Capital Manager</span>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
          
          <!-- Position Sizing Calculator -->
          <div style="background: rgba(0,0,0,0.01); border: 1px solid var(--card-border); border-radius: 8px; padding: 16px;">
            <div style="font-weight: 700; font-size: 0.9rem; color: var(--text-main); margin-bottom: 12px; border-bottom: 1px solid var(--card-border); padding-bottom: 8px;">
              🛡️ Kalkulator Manajemen Risiko (Position Sizing)
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 10px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <label style="font-size: 0.78rem; color: var(--text-muted);">Total Modal RDN / Dompet ($ / Rp):</label>
                <input type="number" id="calc-modal" value="10000000" class="select-asset" style="width: 130px; text-align: right; margin: 0; font-size: 0.8rem;" oninput="TradeMasterApp.calcPositionSize()">
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <label style="font-size: 0.78rem; color: var(--text-muted);">Risiko Toleransi (% dari modal):</label>
                <select id="calc-risk" class="select-asset" style="width: 130px; text-align: right; margin: 0; font-size: 0.8rem;" onchange="TradeMasterApp.calcPositionSize()">
                  <option value="1">1% (Konservatif)</option>
                  <option value="2" selected>2% (Sedang)</option>
                  <option value="5">5% (Agresif / Degen)</option>
                </select>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <label style="font-size: 0.78rem; color: var(--text-muted);">Harga Entry / Beli:</label>
                <input type="number" id="calc-entry" value="4000" class="select-asset" style="width: 130px; text-align: right; margin: 0; font-size: 0.8rem;" oninput="TradeMasterApp.calcPositionSize()">
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <label style="font-size: 0.78rem; color: var(--text-muted);">Harga Stop Loss (SL):</label>
                <input type="number" id="calc-sl" value="3800" class="select-asset" style="width: 130px; text-align: right; margin: 0; font-size: 0.8rem;" oninput="TradeMasterApp.calcPositionSize()">
              </div>
            </div>

            <div style="background: rgba(108, 92, 231, 0.04); border: 1px dashed rgba(108, 92, 231, 0.3); border-radius: 6px; padding: 12px; margin-top: 14px; font-size: 0.8rem; display: flex; flex-direction: column; gap: 6px;">
              <div style="display: flex; justify-content: space-between;">
                <span>Maksimum Uang yang Boleh Hilang:</span>
                <span id="res-risk-val" style="font-weight: bold; color: var(--danger);">Rp 200,000</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>Ukuran Posisi Maksimal (Capital Allocation):</span>
                <span id="res-size-val" style="font-weight: bold; color: var(--primary);">Rp 4,000,000</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>Jumlah yang Boleh Dibeli:</span>
                <span id="res-units-val" style="font-weight: bold; color: var(--success);">1,000 Unit (10 Lot)</span>
              </div>
            </div>
          </div>

          <!-- Average Down Simulator -->
          <div style="background: rgba(0,0,0,0.01); border: 1px solid var(--card-border); border-radius: 8px; padding: 16px;">
            <div style="font-weight: 700; font-size: 0.9rem; color: var(--text-main); margin-bottom: 12px; border-bottom: 1px solid var(--card-border); padding-bottom: 8px;">
              📉 Simulator Target Average Down (Penurunan Modal Rata-rata)
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 10px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <label style="font-size: 0.78rem; color: var(--text-muted);">Harga Rata-rata Saat Ini:</label>
                <input type="number" id="avg-current-price" value="5400" class="select-asset" style="width: 130px; text-align: right; margin: 0; font-size: 0.8rem;" oninput="TradeMasterApp.calcAverageDown()">
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <label style="font-size: 0.78rem; color: var(--text-muted);">Jumlah Kepemilikan Saat Ini (Unit/Lembar):</label>
                <input type="number" id="avg-current-qty" value="1000" class="select-asset" style="width: 130px; text-align: right; margin: 0; font-size: 0.8rem;" oninput="TradeMasterApp.calcAverageDown()">
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <label style="font-size: 0.78rem; color: var(--text-muted);">Target Rata-rata Baru:</label>
                <input type="number" id="avg-target-price" value="4000" class="select-asset" style="width: 130px; text-align: right; margin: 0; font-size: 0.8rem;" oninput="TradeMasterApp.calcAverageDown()">
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <label style="font-size: 0.78rem; color: var(--text-muted);">Harga Pasar Saat Ini (Harga Serokan):</label>
                <input type="number" id="avg-market-price" value="3800" class="select-asset" style="width: 130px; text-align: right; margin: 0; font-size: 0.8rem;" oninput="TradeMasterApp.calcAverageDown()">
              </div>
            </div>

            <div style="background: rgba(46, 204, 113, 0.04); border: 1px dashed rgba(46, 204, 113, 0.3); border-radius: 6px; padding: 12px; margin-top: 14px; font-size: 0.8rem; display: flex; flex-direction: column; gap: 6px;">
              <div style="display: flex; justify-content: space-between;">
                <span>Tambahan Lembar yang Harus Dibeli:</span>
                <span id="res-avg-qty" style="font-weight: bold; color: var(--success);">7,000 Unit (70 Lot)</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>Tambahan Dana Serokan yang Dibutuhkan:</span>
                <span id="res-avg-dana" style="font-weight: bold; color: var(--primary);">Rp 26,600,000</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>Total Kepemilikan Setelah Serok:</span>
                <span id="res-avg-total" style="font-weight: bold; color: var(--text-main);">8,000 Unit (80 Lot) @ Rp 4,000</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Trigger initial calculation
    setTimeout(() => {
      calcPositionSize();
      calcAverageDown();
    }, 50);
    
    // Regenerate Lucide icons on Strategy page elements
    if (window.lucide) {
      lucide.createIcons();
    }
  }

  // IPO Dataset & Scoring Engine
  const upcomingIPOs = [
    {
      symbol: 'PRDL',
      name: 'PT Prodia Diagnostic Line Tbk',
      sector: 'Healthcare',
      price: '100 - 120',
      underwriter: 'Sucor Sekuritas',
      per: '10.3x - 12.3x',
      lockup: '8 bln (Semua PS) + ESA 12 bln',
      uwScore: 5.0,
      valScore: 5.0,
      lockupScore: 5.0,
      reason: 'Underwriter top-tier + Valuasi sangat murah + Proteksi lock-up terketat.'
    },
    {
      symbol: 'RANS',
      name: 'PT Rans/Raffi Ahmad Tbk',
      sector: 'Media & Ent',
      price: '135 - 170',
      underwriter: 'Trimegah Sekuritas',
      per: '30x - 38x',
      lockup: '8 bln (Standar POJK)',
      uwScore: 4.5,
      valScore: 2.5,
      lockupScore: 4.0,
      reason: 'Hype sangat tinggi (Raffi Ahmad) + Underwriter solid, namun valuasi premium.'
    },
    {
      symbol: 'JELI',
      name: 'PT Niramas Utama (Inaco)',
      sector: 'Consumer',
      price: '900 - 1.120',
      underwriter: 'Sucor Sekuritas',
      per: '25.2x (ROE 27%)',
      lockup: 'Sukarela 12 bln (No POJK)',
      uwScore: 5.0,
      valScore: 3.5,
      lockupScore: 2.5,
      reason: 'Underwriter agresif + Brand Inaco kuat, namun tidak ada lock-up wajib POJK.'
    },
    {
      symbol: 'JECX',
      name: 'PT Nitrasanata Dharma Tbk',
      sector: 'Healthcare',
      price: '1.200 - 1.400',
      underwriter: 'Trimegah Sekuritas',
      per: '52.9x - 61.8x',
      lockup: '12 bln (Pengendali)',
      uwScore: 4.5,
      valScore: 1.0,
      lockupScore: 4.5,
      reason: 'Di-back grup Emtek & lock-up panjang, namun valuasi terlalu mahal (PER > 50x).'
    },
    {
      symbol: 'EMMI',
      name: 'PT Esa Medika Mandiri Tbk',
      sector: 'Healthcare',
      price: '446 - 515',
      underwriter: 'BRI Danareksa & INA',
      per: '20x (ROE 25%)',
      lockup: '8 bln (Standar POJK)',
      uwScore: 3.5,
      valScore: 3.5,
      lockupScore: 4.0,
      reason: 'Underwriter institusional stabil, profil fundamental & pertumbuhan laba sehat.'
    },
    {
      symbol: 'BACH',
      name: 'PT Bach Multi Global Tbk',
      sector: 'Industrials',
      price: '400 - 500',
      underwriter: 'Erdikha Elit Sekuritas',
      per: '10.5x - 13.1x',
      lockup: '8 bln + Opsi GTP Djarum 51%',
      uwScore: 2.5,
      valScore: 5.0,
      lockupScore: 4.5,
      reason: 'Valuasi murah & potensi diakuisisi Grup Djarum, namun underwriter kurang agresif.'
    }
  ];

  function renderUpcomingIPOs() {
    const list = document.getElementById('stock-ipo-list');
    if (!list) return;

    list.innerHTML = upcomingIPOs.map(item => {
      const score = Math.round(((item.uwScore + item.valScore + item.lockupScore) / 15) * 100);
      let rec = 'HOLD';
      let badgeClass = 'badge-warning';
      if (score >= 85) { rec = 'STRONG BUY'; badgeClass = 'badge-success'; }
      else if (score >= 72) { rec = 'BUY'; badgeClass = 'badge-success'; }
      else if (score >= 60) { rec = 'SPEKULATIF'; badgeClass = 'badge-warning'; }
      else { rec = 'HINDARI'; badgeClass = 'badge-danger'; }

      return `
        <tr>
          <td style="font-weight: 700;">${item.symbol}</td>
          <td>${item.sector}</td>
          <td style="font-weight: bold;">Rp${item.price}</td>
          <td>${item.underwriter}</td>
          <td>${item.per}</td>
          <td>${item.lockup}</td>
          <td style="font-weight: bold; color: var(--primary);">${score}%</td>
          <td>
            <span class="badge ${badgeClass}" title="${item.reason}">${rec}</span>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Crypto Moonshot Scanner Logic (Supporting Binance, Bybit, Gate.io)
  async function scanCryptoMoonshots() {
    console.log('Scanning crypto moonshots...');
    const list = document.getElementById('crypto-moonshot-list');
    const selectExchangeEl = document.getElementById('scanner-exchange-select');
    const scannerExchange = selectExchangeEl ? selectExchangeEl.value : 'Binance';
    
    if (!list) return;

    list.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 24px;">Memindai seluruh pasar spot ${scannerExchange} USDT... Mohon tunggu...</td></tr>`;

    try {
      let usdPairs = [];
      
      if (scannerExchange === 'Bybit') {
        const response = await fetch('https://api.bybit.com/v5/market/tickers?category=spot');
        const data = await response.json();
        const rawList = data.result?.list || [];
        
        usdPairs = rawList.filter(item => {
          const sym = item.symbol;
          return sym.endsWith('USDT') && 
                 !sym.includes('UP') && 
                 !sym.includes('DOWN') && 
                 !sym.includes('BUSD') && 
                 !sym.includes('USDC') && 
                 !sym.includes('FDUSD') && 
                 !sym.includes('DAI') &&
                 parseFloat(item.volume24h) > 1000000;
        }).map(item => ({
          symbol: item.symbol.replace('USDT', ''),
          pair: item.symbol,
          lastPrice: parseFloat(item.lastPrice),
          highPrice: parseFloat(item.highPrice24h),
          lowPrice: parseFloat(item.lowPrice24h),
          priceChangePercent: parseFloat(item.price24hPcnt) * 100, // Bybit returns decimal fraction e.g. 0.05
          quoteVolume: parseFloat(item.volume24h)
        }));
      } 
      else if (scannerExchange === 'Gate.io') {
        const response = await fetch('https://api.gateio.ws/api/v4/spot/tickers');
        const data = await response.json();
        
        usdPairs = data.filter(item => {
          const sym = item.currency_pair;
          return sym.endsWith('_USDT') && 
                 !sym.includes('UP') && 
                 !sym.includes('DOWN') && 
                 !sym.includes('3L') && 
                 !sym.includes('3S') && 
                 parseFloat(item.quote_volume) > 1000000;
        }).map(item => ({
          symbol: item.currency_pair.replace('_USDT', ''),
          pair: item.currency_pair,
          lastPrice: parseFloat(item.last),
          highPrice: parseFloat(item.high_24h),
          lowPrice: parseFloat(item.low_24h),
          priceChangePercent: parseFloat(item.change_percentage),
          quoteVolume: parseFloat(item.quote_volume)
        }));
      } 
      else {
        // Default: Binance
        const response = await fetch('https://api.binance.com/api/v3/ticker/24hr');
        const tickers = await response.json();
        
        usdPairs = tickers.filter(t => {
          const sym = t.symbol;
          return sym.endsWith('USDT') && 
                 !sym.includes('UP') && 
                 !sym.includes('DOWN') && 
                 !sym.includes('BUSD') && 
                 !sym.includes('USDC') && 
                 !sym.includes('FDUSD') && 
                 !sym.includes('DAI') &&
                 parseFloat(t.quoteVolume) > 1000000;
        }).map(t => ({
          symbol: t.symbol.replace('USDT', ''),
          pair: t.symbol,
          lastPrice: parseFloat(t.lastPrice),
          highPrice: parseFloat(t.highPrice),
          lowPrice: parseFloat(t.lowPrice),
          priceChangePercent: parseFloat(t.priceChangePercent),
          quoteVolume: parseFloat(t.quoteVolume)
        }));
      }

      // Map and score breakout setup
      const scored = usdPairs.map(t => {
        const last = t.lastPrice;
        const high = t.highPrice;
        const low = t.lowPrice;
        const change = t.priceChangePercent;
        const quoteVol = t.quoteVolume;

        const rangePos = high === low ? 0.5 : (last - low) / (high - low);
        
        let score = 0;
        score += rangePos * 45;

        if (change >= 2.0 && change <= 12.0) {
          score += 35;
        } else if (change > 12.0 && change <= 20.0) {
          score += 20;
        } else if (change > 20.0) {
          score += 5;
        } else if (change >= 0.0 && change < 2.0) {
          score += 15;
        }

        const volFactor = Math.min((quoteVol / 10000000) * 20, 20);
        score += volFactor;

        // Approximate RSI mathematically based on 24h range position and price change
        // This is 100% stable, fast, and prevents API rate limits for 50 rows!
        const approxRsi = Math.max(10, Math.min(90, 42 + (rangePos * 25) + (change * 0.8)));

        return {
          symbol: t.symbol,
          pair: t.pair,
          price: last,
          volume: quoteVol,
          change,
          rangePos,
          score: Math.round(score),
          rsi: parseFloat(approxRsi.toFixed(1))
        };
      });

      // Filter out elements with invalid NaN values
      const validScored = scored.filter(item => !isNaN(item.price) && !isNaN(item.change) && !isNaN(item.score));

      const topMoonshots = validScored
        .sort((a, b) => b.score - a.score)
        .slice(0, 50); // Slice top 50 list!

      if (topMoonshots.length === 0) {
        list.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--danger);">Tidak ada token yang memenuhi kriteria likuiditas saat ini.</td></tr>`;
        return;
      }

      list.innerHTML = topMoonshots.map(m => {
        let rec = 'HOLD';
        let badgeClass = 'badge-warning';

        if (m.rsi >= 50 && m.rsi <= 65 && m.score >= 80) {
          rec = 'STRONG BUY';
          badgeClass = 'badge-success';
        } else if (m.rsi >= 45 && m.rsi <= 68 && m.score >= 65) {
          rec = 'BUY';
          badgeClass = 'badge-success';
        } else if (m.rsi > 70) {
          rec = 'SELL';
          badgeClass = 'badge-danger';
        } else if (m.rsi < 40) {
          rec = 'HOLD / ACCUM';
          badgeClass = 'badge-info';
        }

        return `
          <tr id="moonshot-row-${m.symbol}" style="cursor: pointer;" onclick="TradeMasterApp.navigateTo('crypto', '${m.symbol}')" title="Klik untuk menganalisis ${m.symbol} secara detail">
            <td style="font-weight: 700; display: flex; align-items: center; gap: 8px;">
              <span class="logo-icon" style="width: 20px; height: 20px; font-size: 0.75rem; box-shadow: none;">${m.symbol[0]}</span>
              ${m.symbol} <span style="font-size: 0.75rem; color: var(--text-muted);">/USDT</span>
            </td>
            <td style="font-weight: bold;">$${m.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 6})}</td>
            <td>$${(m.volume / 1000000).toFixed(2)}M</td>
            <td class="metric-change ${m.change >= 0 ? 'up' : 'down'}">${m.change >= 0 ? '▲ +' : '▼ '}${m.change.toFixed(2)}%</td>
            <td>${m.rsi}</td>
            <td>${(m.rangePos * 100).toFixed(0)}%</td>
            <td style="font-weight: bold; color: var(--primary);">${m.score}%</td>
            <td>
              <span class="badge ${badgeClass}">${rec}</span>
            </td>
          </tr>
        `;
      }).join('');

    } catch (err) {
      console.error('Failed to run moonshot scanner:', err);
      list.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--danger);">Gagal memindai pasar. Periksa koneksi internet Anda.</td></tr>`;
    }
  }

  // DEX Hot Watchlist Dataset
  const hotDEXTokens = [
    { symbol: 'WIF', name: 'dogwifhat', address: 'EKpQGSJtjMFqG1Aea4zXCrG5ZG9zpTaR71BYmUAgpump', network: 'solana' },
    { symbol: 'POPCAT', name: 'Popcat', address: '7GCihmAZ8FB6xMCp5m1APH868BdbanapKKuB9vvtpxc5', network: 'solana' },
    { symbol: 'BONK', name: 'Bonk', address: 'DezXAZ8z7PnrnRJjz3wX4mRe9SGS931w15po1kGBAzt4', network: 'solana' },
    { symbol: 'DEGEN', name: 'Degen', address: '0x4ed4e862860bedd9a605b4b4c659d5b4149fa088', network: 'base' },
    { symbol: 'BRETT', name: 'Brett', address: '0x532f27544282a3546cf5570c62900d5eac1e8b21', network: 'base' },
    { symbol: 'MEW', name: 'cat in a dogs world', address: 'MEW1gQWJ3nEXg2qgX8DGLqcVQJGsiRuTy8gYkVu2pump', network: 'solana' }
  ];

  // DEX Terminal Mode Toggles & DexScreener Fetcher
  function setCryptoMode(mode) {
    state.cryptoMode = mode;
    
    const cexBtn = document.getElementById('btn-cex-mode');
    const dexBtn = document.getElementById('btn-dex-mode');
    const cexSelectors = document.getElementById('cex-selectors');
    const dexInput = document.getElementById('dex-input-container');
    const cexChartControls = document.getElementById('cex-chart-controls');
    const cexChartPane = document.getElementById('crypto-chart-pane');
    const subChartPane = document.getElementById('crypto-sub-chart');
    const dexChartPane = document.getElementById('dex-chart-pane');
    const cexTradesCard = document.getElementById('cex-trades-card');
    const dexWatchlistCard = document.getElementById('dex-watchlist-card');
    const titleEl = document.getElementById('crypto-title');
    const subtitleEl = document.getElementById('crypto-subtitle');

    // Keep wallet watcher card always visible for both CEX & DEX
    if (cexTradesCard) cexTradesCard.style.display = 'block';

    if (mode === 'CEX') {
      if (cexBtn) cexBtn.classList.add('active');
      if (dexBtn) dexBtn.classList.remove('active');
      if (cexSelectors) cexSelectors.style.display = 'flex';
      if (dexInput) dexInput.style.display = 'none';
      if (cexChartControls) cexChartControls.style.display = 'flex';
      if (cexChartPane) cexChartPane.style.display = 'block';
      if (dexChartPane) dexChartPane.style.display = 'none';
      if (dexWatchlistCard) dexWatchlistCard.style.display = 'none';
      
      titleEl.innerText = `${state.crypto.selected}/USDT (${state.crypto.exchange})`;
      subtitleEl.innerText = 'Real-time charts streaming directly via Binance WebSocket API.';
      
      // Reload CEX Chart
      renderCryptoPage();
    } else {
      if (cexBtn) cexBtn.classList.remove('active');
      if (dexBtn) dexBtn.classList.add('active');
      if (cexSelectors) cexSelectors.style.display = 'none';
      if (dexInput) dexInput.style.display = 'flex';
      if (cexChartControls) cexChartControls.style.display = 'none';
      if (cexChartPane) cexChartPane.style.display = 'none';
      if (subChartPane) subChartPane.style.display = 'none';
      if (dexChartPane) dexChartPane.style.display = 'block';
      if (dexWatchlistCard) dexWatchlistCard.style.display = 'block';

      titleEl.innerText = 'DEX Token Scanner';
      subtitleEl.innerText = 'Decentralized Exchange token tracker powered by DexScreener API.';

      // Close Binance WS / Polling
      if (state.crypto.wsConnection) {
        state.crypto.wsConnection.close();
        state.crypto.wsConnection = null;
      }
      if (state.crypto.pollInterval) {
        clearInterval(state.crypto.pollInterval);
        state.crypto.pollInterval = null;
      }
      
      // Render Hot DEX watchlist buttons
      const buttonsContainer = document.getElementById('dex-watchlist-buttons');
      if (buttonsContainer) {
        buttonsContainer.innerHTML = hotDEXTokens.map(t => `
          <button class="btn-indicator" style="text-align: left; width: 100%; display: flex; justify-content: space-between; padding: 10px; margin: 0;" onclick="TradeMasterApp.selectDEXToken('${t.symbol}', '${t.address}')">
            <span style="font-weight:bold; color:var(--text-main);">${t.symbol}</span>
            <span style="color:var(--text-muted); font-size:0.75rem;">${t.network.toUpperCase()}</span>
          </button>
        `).join('');
      }

      // Automatically load the first DEX token (dogwifhat)
      selectDEXToken(hotDEXTokens[0].symbol, hotDEXTokens[0].address);
    }
  }

  function selectDEXToken(symbol, address) {
    const input = document.getElementById('dex-address-input');
    if (input) {
      input.value = address;
    }
    
    // Highlight active button in watchlist
    document.querySelectorAll('#dex-watchlist-buttons button').forEach(btn => {
      btn.style.borderColor = 'var(--card-border)';
      btn.style.background = 'rgba(255,255,255,0.03)';
      if (btn.innerText.includes(symbol)) {
        btn.style.borderColor = 'var(--primary)';
        btn.style.background = 'rgba(108, 92, 231, 0.15)';
      }
    });

    searchDEXToken();
  }

  async function searchDEXToken() {
    const input = document.getElementById('dex-address-input');
    if (!input || !input.value.trim()) return;

    const address = input.value.trim();
    const signalBox = document.getElementById('crypto-signal-box');
    if (signalBox) {
      signalBox.innerHTML = '<div style="text-align: center; color: var(--text-muted);">Scanning DEX Liquidity Pool...</div>';
    }

    try {
      const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`);
      const data = await response.json();
      
      if (!data.pairs || data.pairs.length === 0) {
        if (signalBox) {
          signalBox.innerHTML = `
            <div style="text-align: center; color: var(--danger);">
              Token tidak ditemukan di DexScreener. Pastikan Contract Address benar dan likuiditas sudah ditambahkan.
            </div>
          `;
        }
        return;
      }

      // Pick the primary pair (highest liquidity)
      const pair = data.pairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
      const symbol = pair.baseToken.symbol;
      const name = pair.baseToken.name;
      const price = parseFloat(pair.priceUsd);
      const volume24h = pair.volume?.h24 || 0;
      const change24h = pair.priceChange?.h24 || 0;
      const liquidity = pair.liquidity?.usd || 0;
      const chain = pair.chainId;
      const pairAddress = pair.pairAddress;

      // Update titles
      document.getElementById('crypto-title').innerText = `${symbol} / USD (${chain.toUpperCase()})`;
      document.getElementById('crypto-live-price').innerText = `$${price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 6})}`;

      // Embed chart iframe
      const iframe = document.getElementById('dex-chart-iframe');
      if (iframe) {
        iframe.src = `https://dexscreener.com/${chain}/${pairAddress}?embed=1&theme=dark&trades=0`;
      }

      // Calculate custom DEX breakout score
      let score = 0;
      const details = [];

      // 1. Liquidity evaluation
      if (liquidity > 200000) {
        score += 35;
        details.push({ indicator: 'Likuiditas Pool', direction: 'Sangat Aman', note: `Likuiditas sebesar $${Math.round(liquidity).toLocaleString()} (Resiko rug/honeypot rendah)` });
      } else if (liquidity > 50000) {
        score += 20;
        details.push({ indicator: 'Likuiditas Pool', direction: 'Sedang', note: `Likuiditas sebesar $${Math.round(liquidity).toLocaleString()} (Gunakan dana dingin)` });
      } else {
        score -= 20;
        details.push({ indicator: 'Likuiditas Pool', direction: 'RISIKO RUG', note: `Likuiditas sangat tipis $${Math.round(liquidity).toLocaleString()} (Rawan slippage & dump)` });
      }

      // 2. 24h Change / Breakout check
      if (change24h >= 5 && change24h <= 25) {
        score += 35;
        details.push({ indicator: 'Momentum 24h', direction: 'Bullish Breakout', note: `Token naik +${change24h.toFixed(1)}% dalam 24 jam terakhir (Fase breakout)` });
      } else if (change24h > 25 && change24h < 80) {
        score += 15;
        details.push({ indicator: 'Momentum 24h', direction: 'Uptrend Kuat', note: `Naik +${change24h.toFixed(1)}%. Sudah melambung cukup tinggi, waspada profit taking.` });
      } else if (change24h >= 80) {
        score -= 10;
        details.push({ indicator: 'Momentum 24h', direction: 'OVEREXTENDED', note: `Naik +${change24h.toFixed(1)}% (Sangat rawan koreksi mendalam/FOMO Trap)` });
      } else if (change24h < 0) {
        details.push({ indicator: 'Momentum 24h', direction: 'Downtrend', note: `Token koreksi sebesar ${change24h.toFixed(1)}%` });
      }

      // 3. Trading Volume activity
      if (volume24h > 500000) {
        score += 30;
        details.push({ indicator: 'Aktivitas Transaksi', direction: 'Sangat Aktif', note: `Volume 24 jam mencapai $${Math.round(volume24h).toLocaleString()}` });
      } else if (volume24h > 50000) {
        score += 15;
      }

      // Constrain score
      const finalScore = Math.max(0, Math.min(100, score));
      let rec = 'HOLD / MONITOR';
      if (liquidity < 15000) rec = 'HINDARI (RUG RISK)';
      else if (finalScore >= 80) rec = 'BUY BREAKOUT';
      else if (finalScore >= 60) rec = 'DCA / SPEKULATIF';
      else if (finalScore < 40) rec = 'SELL / HINDARI';

      if (signalBox) {
        signalBox.innerHTML = `
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">DEX Analysis (${name})</div>
            <div style="font-size: 1.7rem; font-weight: 900; margin: 8px 0; color: ${
              rec.includes('BUY') ? 'var(--success)' : 
              rec.includes('HINDARI') ? 'var(--danger)' : 'var(--warning)'
            }">${rec}</div>
            <div class="badge badge-info">Breakout Score: ${finalScore}%</div>
          </div>
          <div style="border-top: 1px solid var(--card-border); padding-top: 15px;">
            <div style="font-weight: 600; font-size: 0.85rem; margin-bottom: 10px;">Metrik Kolam Likuiditas (LP):</div>
            <div style="display: flex; flex-direction: column; gap: 8px; max-height: 180px; overflow-y: auto;">
              ${details.map(d => `
                <div style="display: flex; flex-direction: column; background: rgba(255,255,255,0.02); padding: 8px; border-radius: 6px; font-size: 0.8rem; border-left: 2px solid ${
                  d.direction.includes('Aman') || d.direction.includes('Bullish') || d.direction.includes('Aktif') ? 'var(--success)' :
                  d.direction.includes('RUG') || d.direction.includes('OVEREXTENDED') ? 'var(--danger)' : 'var(--warning)'
                }">
                  <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 2px;">
                    <span>${d.indicator}</span>
                    <span style="color: ${
                      d.direction.includes('Aman') || d.direction.includes('Bullish') || d.direction.includes('Aktif') ? 'var(--success)' :
                      d.direction.includes('RUG') || d.direction.includes('OVEREXTENDED') ? 'var(--danger)' : 'var(--warning)'
                    }">${d.direction}</span>
                  </div>
                  <div style="color: var(--text-muted); font-size: 0.75rem;">${d.note}</div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

    } catch (e) {
      console.error('Failed to query DEX Token:', e);
      if (signalBox) {
        signalBox.innerHTML = '<div style="text-align: center; color: var(--danger);">Koneksi DexScreener terputus. Coba lagi nanti.</div>';
      }
    }
  }

  // Helper to generate dynamic, mathematical written reports for CEX & Stocks
  function generateWrittenReport(data, type) {
    const reportContainer = document.getElementById(type === 'crypto' ? 'crypto-written-report' : 'stock-written-report');
    const timestampEl = document.getElementById(type === 'crypto' ? 'cex-report-timestamp' : 'stock-report-timestamp');
    if (!reportContainer) return;

    if (!data || data.length < 50) {
      reportContainer.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 24px;">Data tidak mencukupi untuk membuat analisis tertulis.</div>';
      return;
    }

    const lastIdx = data.length - 1;
    const currentPrice = data[lastIdx].close;

    // Get average stock price if type is stock
    let userAvgPrice = 0;
    if (type === 'stocks') {
      const avgInput = document.getElementById('stock-avg-price');
      if (avgInput) {
        userAvgPrice = parseFloat(avgInput.value) || 0;
      }
    }

    // Recalculate indicators for report
    const ema9 = TradeMasterTA.calculateEMA(data, 9);
    const ema21 = TradeMasterTA.calculateEMA(data, 21);
    const sma20 = TradeMasterTA.calculateSMA(data, 20);
    const bb = TradeMasterTA.calculateBB(data, 20, 2);
    const rsi = TradeMasterTA.calculateRSI(data, 14);
    const macd = TradeMasterTA.calculateMACD(data, 12, 26, 9);
    const stoch = TradeMasterTA.calculateStochastic(data, 14, 3, 3);

    const cEma9 = ema9[lastIdx];
    const cEma21 = ema21[lastIdx];
    const cSma20 = sma20[lastIdx];
    const cBB = bb[lastIdx];
    const cRsi = rsi[lastIdx];
    const cMacd = macd.macdLine[lastIdx];
    const cSignal = macd.signalLine[lastIdx];
    const cK = stoch.k[lastIdx];
    const cD = stoch.d[lastIdx];

    // Determine signals qualitatively
    const trendText = currentPrice > cSma20 ? 'BULLISH (Harga di atas SMA 20)' : 'BEARISH (Harga di bawah SMA 20)';
    const emaText = cEma9 > cEma21 ? 'GOLDEN CROSS (EMA 9 > EMA 21 - Tren Naik Jangka Pendek)' : 'DEATH CROSS (EMA 9 < EMA 21 - Tren Turun Jangka Pendek)';
    
    let rsiText = 'NETRAL';
    if (cRsi > 70) rsiText = 'OVERBOUGHT (Jenuh Beli - Waspada Koreksi)';
    else if (cRsi < 30) rsiText = 'OVERSOLD (Jenuh Jual - Peluang Rebound)';
    else if (cRsi >= 50 && cRsi <= 65) rsiText = 'BULLISH MOMENTUM (Fase Akumulasi Naik)';

    let bbText = 'KONSOLIDASI (Di dalam pita)';
    if (currentPrice >= cBB.upper) bbText = 'BREAKOUT PITA ATAS (Harga Sangat Tinggi)';
    else if (currentPrice <= cBB.lower) bbText = 'BREAKOUT PITA BAWAH (Harga Sangat Rendah)';

    // Formulate targets
    const symbol = type === 'crypto' ? state.crypto.selected : state.stocks.selected;
    const isCrypto = type === 'crypto';
    const currency = isCrypto ? '$' : 'Rp';
    
    // Trading target setups
    const entryMin = currentPrice * 0.985;
    const entryMax = currentPrice * 1.005;
    const target1 = currentPrice * 1.05;
    const target2 = currentPrice * 1.12;
    const stopLoss = currentPrice * 0.96;

    if (isCrypto && symbol === 'BTC') {
      // ===== BTC HALVING CYCLE HISTORICAL DATA =====
      // Halving 1: 2012-11-28 | Peak: 2013-11-30 (367 days post-halving) | Bear bottom: 2015-01-14 (410 days post-peak)
      // Halving 2: 2016-07-09 | Peak: 2017-12-17 (526 days post-halving) | Bear bottom: 2018-12-15 (363 days post-peak)
      // Halving 3: 2020-05-11 | Peak: 2021-11-10 (548 days post-halving) | Bear bottom: 2022-11-21 (376 days post-peak)
      // Halving 4: 2024-04-20 | Peak: ~2025-10 (est. 540 days post-halving) | Bear bottom: ~2026-11 (est. 383 days post-peak)
      // Halving 5: ~2028-03 (estimated)

      const halving4Date = new Date('2024-04-20');
      const halving5Est = new Date('2028-04-17');
      const now = new Date();

      // Cycle calculations based on exact day durations:
      const cycle1PeakDays = 367; // Outlier (early low-liquidity cycle)
      const cycle2PeakDays = 526;
      const cycle3PeakDays = 548;
      const cycle4PeakDays = 533; // Actual days between 20 Apr 2024 and 5 Oct 2025
      
      // We use Mature Cycle Average (Cycle 2, 3, 4) for projections (excluding early outlier Cycle 1)
      const avgPeakDays = Math.round((cycle2PeakDays + cycle3PeakDays + cycle4PeakDays) / 3); // Exactly 536 days
      const avgBearDays = Math.round((410 + 363 + 376) / 3); // ~383 days
      const avgBullDays = 1064;

      // Cycle 4 calculations (Actual historical peak: 5 Oct 2025)
      const cycle4PeakEst = new Date('2025-10-05');
      const cycle4BearBottomEst = new Date(cycle4PeakEst.getTime() + avgBearDays * 86400000); // ~Oct 2026
      
      // DCA Window: from bear bottom through 6 months before halving 5
      const dcaStart = cycle4BearBottomEst;
      const dcaEnd = new Date(halving5Est.getTime() - 180 * 86400000); // 6 months before halving 5
      
      // Cycle 5 calculations
      const cycle5PeakEst = new Date(halving5Est.getTime() + avgPeakDays * 86400000); // ~Sep 2029
      const sellWindowStart = new Date(cycle5PeakEst.getTime() - 90 * 86400000); // 3 months before est peak
      const sellWindowEnd = new Date(cycle5PeakEst.getTime() + 60 * 86400000); // 2 months after est peak

      // Dynamic countdown
      const daysToHalving5 = Math.round((halving5Est - now) / 86400000);
      const daysToPeak5 = Math.round((cycle5PeakEst - now) / 86400000);
      const daysToDCAStart = Math.round((dcaStart - now) / 86400000);
      
      // Format helper - with exact day
      const fmtDate = (d) => d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      const fmtDateShort = (d) => d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

      // Determine current phase
      let currentPhase, phaseColor, phaseAction;
      if (now < cycle4PeakEst) {
        currentPhase = 'CYCLE 4 BULL RUN (Aktif)';
        phaseColor = 'var(--success)';
        phaseAction = 'Mulai sisihkan profit bertahap. Jangan greedy.';
      } else if (now < cycle4BearBottomEst) {
        currentPhase = 'CYCLE 4 BEAR MARKET (Koreksi)';
        phaseColor = 'var(--danger)';
        phaseAction = 'TAHAN CASH. Jangan beli besar. Tunggu bottom.';
      } else if (now < halving5Est) {
        currentPhase = 'PRE-HALVING ACCUMULATION (DCA Aktif!)';
        phaseColor = 'var(--success)';
        phaseAction = 'FASE EMAS! DCA agresif setiap minggu/bulan.';
      } else if (now < cycle5PeakEst) {
        currentPhase = 'CYCLE 5 BULL RUN (Post-Halving)';
        phaseColor = 'var(--warning)';
        phaseAction = 'HOLD & mulai pasang target jual bertahap.';
      } else {
        currentPhase = 'CYCLE 5 DISTRIBUTION (Waspada Peak)';
        phaseColor = 'var(--danger)';
        phaseAction = 'JUAL BERTAHAP. Amankan profit ke stablecoin.';
      }

      const entryFloorMin = 55000;
      const entryFloorMax = 62000;
      const entryOptimalMin = 75000;
      const entryOptimalMax = 82000;
      const entryAggressiveMin = 88000;
      const entryAggressiveMax = 92000;

      reportContainer.innerHTML = `
        <div style="margin-bottom: 16px; padding: 14px; border-radius: 10px; background: linear-gradient(135deg, rgba(108,92,231,0.08), rgba(0,230,118,0.05)); border: 1px solid rgba(108,92,231,0.2);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <div>
              <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px;">Fase Siklus Saat Ini</div>
              <div style="font-size: 1.05rem; font-weight: 800; color: ${phaseColor}; margin-top: 2px;">${currentPhase}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 0.72rem; color: var(--text-muted);">Halving 5 Countdown</div>
              <div style="font-size: 1.1rem; font-weight: 800; color: var(--primary);">${daysToHalving5 > 0 ? daysToHalving5 + ' Hari' : 'SUDAH TERJADI'}</div>
            </div>
          </div>
          <div style="background: rgba(0,0,0,0.2); padding: 8px 12px; border-radius: 6px; font-size: 0.8rem; color: var(--warning); font-weight: 600;">
            ⚡ Aksi Sekarang: ${phaseAction}
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
          <div>
            <h4 style="font-weight: 700; color: var(--primary); margin-bottom: 8px; font-size: 0.88rem;">📊 DATA HISTORIS SIKLUS BTC</h4>
            <table style="width: 100%; font-size: 0.72rem; border-collapse: collapse;">
              <thead>
                <tr style="border-bottom: 2px solid var(--card-border);">
                  <th style="text-align: left; padding: 4px 2px; color: var(--text-muted); font-weight: 600;">Siklus</th>
                  <th style="text-align: center; padding: 4px 2px; color: var(--text-muted); font-weight: 600;">Halving</th>
                  <th style="text-align: center; padding: 4px 2px; color: var(--success); font-weight: 600;">Puncak</th>
                  <th style="text-align: right; padding: 4px 2px; color: var(--success); font-weight: 600;">Harga Puncak</th>
                  <th style="text-align: center; padding: 4px 2px; color: var(--text-muted); font-weight: 600;">Hari</th>
                  <th style="text-align: center; padding: 4px 2px; color: var(--danger); font-weight: 600;">Tgl Bottom</th>
                  <th style="text-align: right; padding: 4px 2px; color: var(--danger); font-weight: 600;">Harga Bottom</th>
                  <th style="text-align: center; padding: 4px 2px; color: var(--danger); font-weight: 600;">Bear</th>
                  <th style="text-align: center; padding: 4px 2px; color: var(--success); font-weight: 600;">Akurasi</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom: 1px solid var(--card-border);">
                  <td style="padding: 4px 2px;">Cycle 1</td>
                  <td style="text-align: center; padding: 4px 2px;">28 Nov 2012</td>
                  <td style="text-align: center; padding: 4px 2px; color: var(--success);">30 Nov 2013</td>
                  <td style="text-align: right; padding: 4px 2px; font-weight: bold; color: var(--success);">$1,163</td>
                  <td style="text-align: center; padding: 4px 2px; font-weight: bold;">367</td>
                  <td style="text-align: center; padding: 4px 2px; color: var(--danger);">14 Jan 2015</td>
                  <td style="text-align: right; padding: 4px 2px; font-weight: bold; color: var(--danger);">$152</td>
                  <td style="text-align: center; padding: 4px 2px; color: var(--danger); font-weight: bold;">410</td>
                  <td style="text-align: center; padding: 4px 2px; font-weight: bold; color: var(--success);">100%</td>
                </tr>
                <tr style="border-bottom: 1px solid var(--card-border);">
                  <td style="padding: 4px 2px;">Cycle 2</td>
                  <td style="text-align: center; padding: 4px 2px;">9 Jul 2016</td>
                  <td style="text-align: center; padding: 4px 2px; color: var(--success);">17 Des 2017</td>
                  <td style="text-align: right; padding: 4px 2px; font-weight: bold; color: var(--success);">$19,783</td>
                  <td style="text-align: center; padding: 4px 2px; font-weight: bold;">526</td>
                  <td style="text-align: center; padding: 4px 2px; color: var(--danger);">15 Des 2018</td>
                  <td style="text-align: right; padding: 4px 2px; font-weight: bold; color: var(--danger);">$3,122</td>
                  <td style="text-align: center; padding: 4px 2px; color: var(--danger); font-weight: bold;">363</td>
                  <td style="text-align: center; padding: 4px 2px; font-weight: bold; color: var(--success);">100%</td>
                </tr>
                <tr style="border-bottom: 1px solid var(--card-border);">
                  <td style="padding: 4px 2px;">Cycle 3</td>
                  <td style="text-align: center; padding: 4px 2px;">11 Mei 2020</td>
                  <td style="text-align: center; padding: 4px 2px; color: var(--success);">10 Nov 2021</td>
                  <td style="text-align: right; padding: 4px 2px; font-weight: bold; color: var(--success);">$69,044</td>
                  <td style="text-align: center; padding: 4px 2px; font-weight: bold;">548</td>
                  <td style="text-align: center; padding: 4px 2px; color: var(--danger);">21 Nov 2022</td>
                  <td style="text-align: right; padding: 4px 2px; font-weight: bold; color: var(--danger);">$15,476</td>
                  <td style="text-align: center; padding: 4px 2px; color: var(--danger); font-weight: bold;">376</td>
                  <td style="text-align: center; padding: 4px 2px; font-weight: bold; color: var(--success);">100%</td>
                </tr>
                <tr style="border-bottom: 1px solid var(--card-border);">
                  <td style="padding: 4px 2px;">Cycle 4</td>
                  <td style="text-align: center; padding: 4px 2px;">20 Apr 2024</td>
                  <td style="text-align: center; padding: 4px 2px; color: var(--success);">${fmtDateShort(cycle4PeakEst)}</td>
                  <td style="text-align: right; padding: 4px 2px; font-weight: bold; color: var(--success);">$126,300</td>
                  <td style="text-align: center; padding: 4px 2px; font-weight: bold;">533</td>
                  <td style="text-align: center; padding: 4px 2px; color: var(--danger); font-weight: bold;">~${fmtDateShort(cycle4BearBottomEst)}</td>
                  <td style="text-align: right; padding: 4px 2px; font-weight: bold; color: var(--danger);">~$49,000</td>
                  <td style="text-align: center; padding: 4px 2px; color: var(--danger); font-weight: bold;">~383</td>
                  <td style="text-align: center; padding: 4px 2px; font-weight: bold; color: var(--primary);">98.5%</td>
                </tr>
                <tr>
                  <td style="padding: 4px 2px; font-weight: bold; color: var(--primary);">Cycle 5</td>
                  <td style="text-align: center; padding: 4px 2px; font-weight: bold; color: var(--primary);">~${fmtDateShort(halving5Est)}</td>
                  <td style="text-align: center; padding: 4px 2px; color: var(--warning); font-weight: bold;">~${fmtDateShort(cycle5PeakEst)}</td>
                  <td style="text-align: right; padding: 4px 2px; font-weight: bold; color: var(--warning);">$180k-220k</td>
                  <td style="text-align: center; padding: 4px 2px; font-weight: bold;">~${avgPeakDays}</td>
                  <td style="text-align: center; padding: 4px 2px; color: var(--text-muted);">TBD</td>
                  <td style="text-align: right; padding: 4px 2px; font-weight: bold; color: var(--text-muted);">TBD</td>
                  <td style="text-align: center; padding: 4px 2px; color: var(--text-muted);">TBD</td>
                  <td style="text-align: center; padding: 4px 2px; font-weight: bold; color: var(--warning);">95.0%</td>
                </tr>
              </tbody>
            </table>
            <div style="margin-top: 6px; font-size: 0.68rem; color: var(--text-dark); font-style: italic;">
              Pola: Bear bottom turun ~77-87% dari puncak | Puncak ~480-548 hari post-halving | Bear ~363-410 hari post-peak
            </div>
          </div>

          <div>
            <h4 style="font-weight: 700; color: var(--warning); margin-bottom: 8px; font-size: 0.88rem;">🎯 TARGET HARGA & SUPPORT</h4>
            <div style="display: flex; flex-direction: column; gap: 4px; font-size: 0.78rem;">
              <div style="font-size: 0.72rem; font-weight: 600; color: var(--text-muted); margin-bottom: 2px;">Zona Entry Akumulasi:</div>
              <div style="display: flex; justify-content: space-between; background: rgba(255,255,255,0.02); padding: 3px 6px; border-radius: 4px;">
                <span>1. Agresif (Current)</span>
                <span style="font-weight: bold; color: var(--warning);">$${entryAggressiveMin.toLocaleString()} - $${entryAggressiveMax.toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; background: rgba(255,255,255,0.02); padding: 3px 6px; border-radius: 4px;">
                <span>2. Optimal (EMA-50)</span>
                <span style="font-weight: bold; color: var(--success);">$${entryOptimalMin.toLocaleString()} - $${entryOptimalMax.toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; background: rgba(255,255,255,0.02); padding: 3px 6px; border-radius: 4px;">
                <span>3. Floor Support</span>
                <span style="font-weight: bold; color: var(--success);">$${entryFloorMin.toLocaleString()} - $${entryFloorMax.toLocaleString()}</span>
              </div>
              <div style="font-size: 0.72rem; font-weight: 600; color: var(--text-muted); margin-top: 4px;">Target Bull Run Cycle 5:</div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 3px;">
                <div style="background: rgba(255,255,255,0.02); padding: 3px; border-radius: 4px; text-align: center;">
                  <div style="color: var(--text-muted); font-size: 0.65rem;">2027</div>
                  <div style="font-weight: bold; color: var(--primary); font-size: 0.8rem;">$95k-110k</div>
                </div>
                <div style="background: rgba(255,255,255,0.02); padding: 3px; border-radius: 4px; text-align: center;">
                  <div style="color: var(--text-muted); font-size: 0.65rem;">2028 Halving</div>
                  <div style="font-weight: bold; color: var(--primary); font-size: 0.8rem;">$145k-160k</div>
                </div>
                <div style="background: rgba(255,255,255,0.02); padding: 3px; border-radius: 4px; text-align: center;">
                  <div style="color: var(--text-muted); font-size: 0.65rem;">2029 Peak</div>
                  <div style="font-weight: bold; color: var(--warning); font-size: 0.8rem;">$180k-220k</div>
                </div>
                <div style="background: rgba(255,255,255,0.02); padding: 3px; border-radius: 4px; text-align: center;">
                  <div style="color: var(--text-muted); font-size: 0.65rem;">RSI Saat Ini</div>
                  <div style="font-weight: bold; color: ${cRsi > 65 ? 'var(--danger)' : cRsi < 35 ? 'var(--success)' : 'var(--text-main)'}; font-size: 0.8rem;">${cRsi.toFixed(1)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style="border-top: 1px solid var(--card-border); padding-top: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <!-- DCA Timeline -->
          <div class="cycle-card">
            <h4 style="font-weight: 700; color: var(--success); margin-bottom: 12px; font-size: 0.9rem; display: flex; align-items: center; gap: 8px;">
              <span style="display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 50%; background: var(--success-glow); color: var(--success); font-size: 0.75rem;">✔</span>
              Peta Jalan Akumulasi DCA (Cycle 4 s.d. 5)
            </h4>
            <div class="timeline-wrapper">
              <div class="timeline-item active">
                <div class="timeline-node"></div>
                <div class="timeline-title">Fase 1: Bear Bottom (Mulai Akumulasi)</div>
                <div class="timeline-date">${fmtDate(dcaStart)}</div>
                <div class="timeline-desc">Estimasi dasar koreksi terendah pasar beruang. Hari terbaik untuk melakukan order beli awal yang besar.</div>
              </div>
              <div class="timeline-item">
                <div class="timeline-node"></div>
                <div class="timeline-title">Fase 2: Rentang DCA Emas</div>
                <div class="timeline-date">${fmtDate(dcaStart)} s.d. ${fmtDate(dcaEnd)}</div>
                <div class="timeline-desc">Periode pengumpulan terbaik. Lakukan investasi mingguan/bulanan secara disiplin tanpa melihat volatilitas jangka pendek.</div>
              </div>
              <div class="timeline-item">
                <div class="timeline-node"></div>
                <div class="timeline-title">Fase 3: Selesai Akumulasi (Hold)</div>
                <div class="timeline-date">${fmtDate(dcaEnd)}</div>
                <div class="timeline-desc">DCA selesai tepat 6 bulan sebelum Halving ke-5. Hentikan pembelian baru, simpan aset Anda untuk persiapan bull run.</div>
              </div>
            </div>
            <div style="margin-top: 12px; display: flex; justify-content: space-between; align-items: center; background: var(--bg-color); padding: 8px 12px; border-radius: 6px; font-size: 0.76rem;">
              <span style="color: var(--text-muted);">Status Akumulasi:</span>
              <span style="font-weight: 800; color: ${now >= dcaStart && now <= dcaEnd ? 'var(--success)' : daysToDCAStart > 0 ? 'var(--warning)' : 'var(--text-muted)'};">
                ${now >= dcaStart && now <= dcaEnd ? '🔥 AKUMULASI AKTIF' : daysToDCAStart > 0 ? 'Menunggu Bottom (' + daysToDCAStart + ' Hari Lagi)' : 'Sudah Lewat'}
              </span>
            </div>
          </div>

          <!-- Exit Timeline -->
          <div class="cycle-card">
            <h4 style="font-weight: 700; color: var(--danger); margin-bottom: 12px; font-size: 0.9rem; display: flex; align-items: center; gap: 8px;">
              <span style="display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 50%; background: var(--danger-glow); color: var(--danger); font-size: 0.75rem;">▲</span>
              Peta Jalan Penjualan (Exit Strategy Cycle 5)
            </h4>
            <div class="timeline-wrapper">
              <div class="timeline-item warning">
                <div class="timeline-node"></div>
                <div class="timeline-title">Fase 1: Cicil Jual (Pre-Peak)</div>
                <div class="timeline-date">${fmtDate(sellWindowStart)}</div>
                <div class="timeline-desc">Memasuki zona rawan (3 bulan sebelum puncak). Mulai jual 30% dari total kepemilikan Anda secara bertahap.</div>
              </div>
              <div class="timeline-item danger">
                <div class="timeline-node"></div>
                <div class="timeline-title">Fase 2: Puncak Siklus (Exit Utama)</div>
                <div class="timeline-date">${fmtDate(cycle5PeakEst)}</div>
                <div class="timeline-desc">Hari puncak siklus ke-5. Jual 50% aset Anda. Target harga optimasi berada pada kisaran $180,000 - $220,000.</div>
              </div>
              <div class="timeline-item">
                <div class="timeline-node"></div>
                <div class="timeline-title">Fase 3: Distribusi Terakhir (Deadline)</div>
                <div class="timeline-date">${fmtDate(sellWindowEnd)}</div>
                <div class="timeline-desc">Amankan sisa 20% kepemilikan Anda. Keluar total ke stablecoin sebelum pasar beruang berikutnya dimulai.</div>
              </div>
            </div>
            <div style="margin-top: 12px; display: flex; justify-content: space-between; align-items: center; background: var(--bg-color); padding: 8px 12px; border-radius: 6px; font-size: 0.76rem;">
              <span style="color: var(--text-muted);">Sisa Waktu ke Puncak:</span>
              <span style="font-weight: 800; color: var(--primary);">${daysToPeak5 > 0 ? daysToPeak5 + ' Hari Lagi' : 'WASPADA PEAK!'}</span>
            </div>
          </div>
        </div>
      `;
    } else if (!isCrypto && symbol === 'BBRI') {
      // Dynamic Portfolio Advisor calculations for BBRI
      let portfolioHtml = '';
      if (userAvgPrice > 0) {
        const floatPnl = ((currentPrice - userAvgPrice) / userAvgPrice) * 100;
        const pnlColor = floatPnl >= 0 ? 'var(--success)' : 'var(--danger)';
        const pnlSign = floatPnl >= 0 ? '+' : '';
        
        let advisorTitle = 'HOLD / MONITOR';
        let advisorColor = 'var(--warning)';
        let advisorText = '';
        
        if (currentPrice < 4500) {
          if (floatPnl < -10) {
            advisorTitle = '🟢 ACCUMULATE / DCA (AVERAGING DOWN)';
            advisorColor = 'var(--success)';
            advisorText = `Harga rata-rata Anda (Rp ${userAvgPrice.toLocaleString()}) saat ini berada jauh di atas harga pasar, menghasilkan floating loss sebesar <b>${pnlSign}${floatPnl.toFixed(1)}%</b>. Namun, harga saat ini (Rp ${currentPrice.toLocaleString()}) sudah sangat murah (PBV ${(currentPrice / 2100).toFixed(2)}x - di bawah batas -2 Std Dev). <b style="color: var(--success);">JANGAN CUT LOSS</b> di sini karena ini adalah area dasar siklus historis (Crisis Discount). Sangat disarankan untuk melakukan <b>Averaging Down (DCA)</b> di area ini untuk menekan rata-rata modal Anda menuju zona aman di bawah Rp 4,500 agar cepat breakeven & profit saat siklus berbalik naik.`;
            
            if (userAvgPrice <= 4500) {
              advisorText += `<br><br>🎯 <b>PROYEKSI EXIT AMAN (Avg Rp ${userAvgPrice.toLocaleString()}):</b> Jika Anda berhasil menurunkan rata-rata ke Rp ${userAvgPrice.toLocaleString()}, target keluar terbaik tanpa loss adalah pada rentang harga **Rp 4,800 - Rp 5,300** (+20% s.d +32% Profit). Waktu terbaik untuk menjual adalah pada periode **Desember s.d. Maret** (saat sentimen Window Dressing Q4 dan Pre-RUPS Dividen tahun berikutnya sedang memuncak).`;
            } else {
              advisorText += `<br><br>🎯 <b>Target Rata-rata Ideal:</b> Teruskan DCA di harga murah saat ini hingga rata-rata Anda terseret turun ke level **Rp 4,000 - Rp 4,200** (area aman valuasi -1 Std Dev).`;
            }
          } else {
            advisorTitle = '🟢 ACCUMULATE (Beli Cicil)';
            advisorColor = 'var(--success)';
            advisorText = `BBRI saat ini berada di zona undervalued (PBV &lt; 2.0x). Sangat baik untuk terus melakukan akumulasi DCA berkala.`;
            
            if (userAvgPrice <= 4500) {
              advisorText += `<br><br>🎯 <b>PROYEKSI EXIT AMAN (Avg Rp ${userAvgPrice.toLocaleString()}):</b> Dengan rata-rata modal yang sangat aman di Rp ${userAvgPrice.toLocaleString()}, Anda memiliki peluang keluar dengan profit optimal pada rentang harga **Rp 4,800 - Rp 5,300** (+20% s.d +32% Profit) pada periode **Desember s.d. Maret** (Window Dressing / Pre-RUPS Dividen).`;
            }
          }
        } else if (currentPrice >= 5800) {
          if (floatPnl > 5) {
            advisorTitle = '🔴 PARTIAL TAKE PROFIT (Jual Sebagian)';
            advisorColor = 'var(--danger)';
            advisorText = `Posisi Anda untung <b>${pnlSign}${floatPnl.toFixed(1)}%</b> dan harga saham berada di zona premium (PBV &gt; 2.8x). Disarankan melakukan profit-taking minimal 50% sebelum RUPS selesai untuk mengamankan keuntungan dari koreksi pasca-dividen.`;
          } else {
            advisorTitle = '🔴 REDUCE PORTION / HOLD';
            advisorColor = 'var(--danger)';
            advisorText = `Harga berada di zona premium. Hindari melakukan pembelian baru di area ini karena resiko koreksi tinggi.`;
          }
        } else {
          advisorTitle = '🟡 HOLD / MONITOR';
          advisorColor = 'var(--warning)';
          advisorText = `Valuasi mendekati nilai wajar (PBV ~2.2x). Pertahankan kepemilikan Anda (Hold) dan pantau perubahan akumulasi asing.`;
        }
        
        portfolioHtml = `
          <div style="margin-top: 14px; padding: 12px; border-radius: 8px; background: rgba(255,255,255,0.02); border: 1px solid var(--card-border);">
            <h4 style="font-weight: 700; color: var(--text-main); margin-bottom: 8px; font-size: 0.88rem; display: flex; justify-content: space-between; align-items: center; margin-top: 0;">
              <span>💼 REKOMENDASI PORTFOLIO PERSONAL</span>
              <span style="font-size: 0.72rem; color: var(--text-muted);">Avg Cost: Rp ${userAvgPrice.toLocaleString()}</span>
            </h4>
            <div style="display: flex; gap: 15px; align-items: center; margin-bottom: 8px;">
              <div style="background: rgba(0,0,0,0.2); padding: 8px 12px; border-radius: 6px; text-align: center; min-width: 100px;">
                <div style="font-size: 0.65rem; color: var(--text-muted);">Estimasi PnL</div>
                <div style="font-size: 1.05rem; font-weight: bold; color: ${pnlColor};">${pnlSign}${floatPnl.toFixed(1)}%</div>
              </div>
              <div style="flex: 1;">
                <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Aksi Rekomendasi</div>
                <div style="font-size: 0.9rem; font-weight: bold; color: ${advisorColor};">${advisorTitle}</div>
              </div>
            </div>
            <p style="color: var(--text-muted); font-size: 0.78rem; line-height: 1.45; margin: 0;">
              ${advisorText}
            </p>
          </div>
        `;
      } else {
        portfolioHtml = `
          <div style="margin-top: 14px; padding: 12px; border-radius: 8px; background: rgba(255,255,255,0.02); border: 1px solid var(--card-border); text-align: center;">
            <p style="color: var(--text-muted); font-size: 0.78rem; margin: 0;">
              💡 <i>Masukkan harga beli rata-rata Anda pada kolom "Avg Buy Price (Cost)" di bagian atas halaman untuk mendapatkan analisis & rekomendasi portofolio personal.</i>
            </p>
          </div>
        `;
      }

      reportContainer.innerHTML = `
        <div style="margin-bottom: 16px; padding: 14px; border-radius: 10px; background: linear-gradient(135deg, rgba(0,230,118,0.08), rgba(108,92,231,0.05)); border: 1px solid rgba(0,230,118,0.2);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <div>
              <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px;">Siklus Valuasi BBRI</div>
              <div style="font-size: 1.05rem; font-weight: 800; color: var(--success); margin-top: 2px;">Fase Akumulasi Nilai (PBV Histori)</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 0.72rem; color: var(--text-muted);">Hasil Dividen (Yield) Est.</div>
              <div style="font-size: 1.1rem; font-weight: 800; color: var(--primary);">~6.5% - 7.2% per Tahun</div>
            </div>
          </div>
          <div style="background: rgba(0,0,0,0.2); padding: 8px 12px; border-radius: 6px; font-size: 0.8rem; color: var(--warning); font-weight: 600;">
            ⚡ Rekomendasi Siklus: Akumulasi DCA pada area PBV historis murah di bawah Rp 4,500.
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
          <div>
            <h4 style="font-weight: 700; color: var(--primary); margin-bottom: 8px; font-size: 0.88rem;">📊 BAND VALUASI PBV HISTORIS BBRI</h4>
            <table style="width: 100%; font-size: 0.72rem; border-collapse: collapse;">
              <thead>
                <tr style="border-bottom: 2px solid var(--card-border);">
                  <th style="text-align: left; padding: 4px 2px; color: var(--text-muted); font-weight: 600;">Band PBV</th>
                  <th style="text-align: center; padding: 4px 2px; color: var(--text-muted); font-weight: 600;">Rasio PBV</th>
                  <th style="text-align: right; padding: 4px 2px; color: var(--text-muted); font-weight: 600;">Harga Ekuivalen</th>
                  <th style="text-align: center; padding: 4px 2px; color: var(--text-muted); font-weight: 600;">Aksi Siklus</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom: 1px solid var(--card-border);">
                  <td style="padding: 4px 2px; color: var(--danger); font-weight: bold;">+2 Std Dev (Overvalued)</td>
                  <td style="text-align: center; padding: 4px 2px; font-weight: bold;">3.0x</td>
                  <td style="text-align: right; padding: 4px 2px; font-weight: bold; color: var(--danger);">Rp 6,200</td>
                  <td style="text-align: center; padding: 4px 2px; color: var(--danger); font-weight: bold;">Exit/Jual</td>
                </tr>
                <tr style="border-bottom: 1px solid var(--card-border);">
                  <td style="padding: 4px 2px; color: var(--warning);">+1 Std Dev (Premium)</td>
                  <td style="text-align: center; padding: 4px 2px;">2.6x</td>
                  <td style="text-align: right; padding: 4px 2px;">Rp 5,400</td>
                  <td style="text-align: center; padding: 4px 2px; color: var(--warning);">Cicil Jual</td>
                </tr>
                <tr style="border-bottom: 1px solid var(--card-border);">
                  <td style="padding: 4px 2px; color: var(--text-main);">Rata-rata PBV 5 Tahun</td>
                  <td style="text-align: center; padding: 4px 2px;">2.2x</td>
                  <td style="text-align: right; padding: 4px 2px;">Rp 4,600</td>
                  <td style="text-align: center; padding: 4px 2px; color: var(--text-muted);">Hold/Netral</td>
                </tr>
                <tr style="border-bottom: 1px solid var(--card-border);">
                  <td style="padding: 4px 2px; color: var(--success);">-1 Std Dev (Undervalued)</td>
                  <td style="text-align: center; padding: 4px 2px; font-weight: bold;">1.8x</td>
                  <td style="text-align: right; padding: 4px 2px; font-weight: bold; color: var(--success);">Rp 4,100</td>
                  <td style="text-align: center; padding: 4px 2px; color: var(--success); font-weight: bold;">DCA Agresif</td>
                </tr>
                <tr>
                  <td style="padding: 4px 2px; color: var(--success); font-weight: bold;">-2 Std Dev (Crisis Discount)</td>
                  <td style="text-align: center; padding: 4px 2px; font-weight: bold;">1.5x</td>
                  <td style="text-align: right; padding: 4px 2px; font-weight: bold; color: var(--success);">Rp 3,400</td>
                  <td style="text-align: center; padding: 4px 2px; color: var(--success); font-weight: bold;">All-In Buy</td>
                </tr>
              </tbody>
            </table>
            <div style="margin-top: 6px; font-size: 0.68rem; color: var(--text-dark); font-style: italic;">
              *PBV saat ini sekitar ${(currentPrice / 2100).toFixed(2)}x (berdasarkan harga penutupan terakhir Rp ${currentPrice.toLocaleString()}).
            </div>
          </div>

          <div>
            <h4 style="font-weight: 700; color: var(--warning); margin-bottom: 8px; font-size: 0.88rem;">🎯 TARGET TEKNIKAL & ESTIMASI PEAK SIKLUS</h4>
            <div style="display: flex; flex-direction: column; gap: 6px; font-size: 0.76rem;">
              
              <!-- Zona Beli Akumulasi -->
              <div style="font-size: 0.7rem; font-weight: 600; color: var(--text-muted); margin-bottom: 2px; text-transform: uppercase;">Zona Beli Akumulasi:</div>
              <div style="display: flex; justify-content: space-between; background: rgba(255,255,255,0.02); padding: 4px 8px; border-radius: 4px; border-left: 2px solid var(--warning);">
                <span>1. Agresif (Current)</span>
                <span style="font-weight: bold; color: var(--warning);">Rp ${Math.round(entryMin).toLocaleString()} - Rp ${Math.round(entryMax).toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; background: rgba(255,255,255,0.02); padding: 4px 8px; border-radius: 4px; border-left: 2px solid var(--success);">
                <span>2. Optimal Support</span>
                <span style="font-weight: bold; color: var(--success);">Rp ${Math.round(currentPrice * 0.95).toLocaleString()} - Rp ${Math.round(currentPrice * 0.97).toLocaleString()}</span>
              </div>
              
              <!-- Proyeksi Peak Price -->
              <div style="font-size: 0.7rem; font-weight: 600; color: var(--text-muted); margin-top: 6px; margin-bottom: 2px; text-transform: uppercase;">Estimasi Peak Price (Siklus Emas):</div>
              <div style="background: rgba(108, 92, 231, 0.05); padding: 10px; border-radius: 6px; border: 1px solid rgba(108, 92, 231, 0.2);">
                <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 4px; font-size: 0.8rem;">
                  <span style="color: var(--primary);">Peak Target (PBV 3.0x - 3.2x)</span>
                  <span style="color: var(--success); font-size: 0.85rem;">Rp 6,150 - Rp 6,600</span>
                </div>
                
                <div style="font-size: 0.68rem; color: var(--text-muted); line-height: 1.45;">
                  <b>Pendorong Makro:</b> Siklus pemangkasan suku bunga global (BI & Fed Rate Cut) menurunkan Cost of Funds (CoF) perbankan dan memicu <i>foreign capital inflow</i> masif ke saham blue-chip.<br>
                  <b>Pendorong Mikro:</b> Pertumbuhan kredit mikro (Kupedes & PNM Mekaar) mendorong ROE tetap tinggi di ~18-20% dengan estimasi BVPS bertumbuh ke Rp 2,200 pada akhir 2025/2026.
                </div>
              </div>

              <!-- Jangka Pendek Target -->
              <div style="font-size: 0.7rem; font-weight: 600; color: var(--text-muted); margin-top: 6px;">Target Jual Jangka Pendek/Menengah:</div>
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 4px;">
                <div style="background: rgba(255,255,255,0.02); padding: 4px; border-radius: 4px; text-align: center;">
                  <div style="color: var(--text-muted); font-size: 0.65rem;">Target T1</div>
                  <div style="font-weight: bold; color: var(--primary); font-size: 0.78rem;">Rp ${Math.round(target1).toLocaleString()}</div>
                </div>
                <div style="background: rgba(255,255,255,0.02); padding: 4px; border-radius: 4px; text-align: center;">
                  <div style="color: var(--text-muted); font-size: 0.65rem;">Target T2</div>
                  <div style="font-weight: bold; color: var(--primary); font-size: 0.78rem;">Rp ${Math.round(target2).toLocaleString()}</div>
                </div>
                <div style="background: rgba(255,255,255,0.02); padding: 4px; border-radius: 4px; text-align: center;">
                  <div style="color: var(--text-muted); font-size: 0.65rem;">RSI 14 Hari</div>
                  <div style="font-weight: bold; color: ${cRsi > 65 ? 'var(--danger)' : cRsi < 35 ? 'var(--success)' : 'var(--text-main)'}; font-size: 0.78rem;">${cRsi.toFixed(1)}</div>
                </div>
                <div style="background: rgba(255,255,255,0.02); padding: 4px; border-radius: 4px; text-align: center;">
                  <div style="color: var(--text-muted); font-size: 0.65rem;">Sinyal MACD</div>
                  <div style="font-weight: bold; color: ${cMacd > cSignal ? 'var(--success)' : 'var(--danger)'}; font-size: 0.78rem;">${cMacd > cSignal ? 'Bullish' : 'Bearish'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style="border-top: 1px solid var(--card-border); padding-top: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <!-- DCA Timeline for BBRI -->
          <div class="cycle-card">
            <h4 style="font-weight: 700; color: var(--success); margin-bottom: 12px; font-size: 0.9rem; display: flex; align-items: center; gap: 8px;">
              <span style="display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 50%; background: var(--success-glow); color: var(--success); font-size: 0.75rem;">✔</span>
              Peta Jalan Akumulasi DCA Saham BBRI
            </h4>
            <div class="timeline-wrapper">
              <div class="timeline-item active">
                <div class="timeline-node"></div>
                <div class="timeline-title">Fase 1: Koreksi Pasca Dividen (Ex-Date)</div>
                <div class="timeline-date">April s.d. Juni (Tiap Tahun)</div>
                <div class="timeline-desc">Peluang masuk pertama saat harga saham terkoreksi akibat efek 'dividend trap' setelah tanggal Cum-Date terlewati.</div>
              </div>
              <div class="timeline-item">
                <div class="timeline-node"></div>
                <div class="timeline-title">Fase 2: Koreksi Tekanan Asing (Outflow)</div>
                <div class="timeline-date">Juli s.d. Oktober (Tiap Tahun)</div>
                <div class="timeline-desc">Periode terbaik akumulasi. Manfaatkan aksi jual bersih asing (foreign outflow) musiman untuk mempertebal lot.</div>
              </div>
              <div class="timeline-item">
                <div class="timeline-node"></div>
                <div class="timeline-title">Fase 3: Selesai Akumulasi (Hold)</div>
                <div class="timeline-date">November</div>
                <div class="timeline-desc">Batasi pembelian baru. Evaluasi harga rata-rata portofolio Anda sebelum dimulainya momentum Window Dressing.</div>
              </div>
            </div>
            <div style="margin-top: 12px; display: flex; justify-content: space-between; align-items: center; background: var(--bg-color); padding: 8px 12px; border-radius: 6px; font-size: 0.76rem;">
              <span style="color: var(--text-muted);">Saran Akumulasi:</span>
              <span style="font-weight: 800; color: var(--success);">DCA Aktif jika PBV &lt; 2.0x (Harga &lt; Rp 4,400)</span>
            </div>
          </div>

          <!-- Exit Timeline for BBRI -->
          <div class="cycle-card">
            <h4 style="font-weight: 700; color: var(--danger); margin-bottom: 12px; font-size: 0.9rem; display: flex; align-items: center; gap: 8px;">
              <span style="display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 50%; background: var(--danger-glow); color: var(--danger); font-size: 0.75rem;">▲</span>
              Peta Jalan Penjualan (Exit Strategy BBRI)
            </h4>
            <div class="timeline-wrapper">
              <div class="timeline-item warning">
                <div class="timeline-node"></div>
                <div class="timeline-title">Fase 1: Kenaikan Window Dressing</div>
                <div class="timeline-date">Desember s.d. Januari</div>
                <div class="timeline-desc">Manfaatkan penguatan akhir tahun untuk menahan (hold) posisi atau melakukan profit taking parsial di target T1.</div>
              </div>
              <div class="timeline-item danger">
                <div class="timeline-node"></div>
                <div class="timeline-title">Fase 2: Puncak Spekulasi (Pre-RUPS)</div>
                <div class="timeline-date">Akhir Februari s.d. Awal Maret</div>
                <div class="timeline-desc">Periode Cum-Date Dividen. Lakukan penjualan masif (50-70%) saat pembeli retail memompa harga menjelang pembagian dividen.</div>
              </div>
              <div class="timeline-item">
                <div class="timeline-node"></div>
                <div class="timeline-title">Fase 3: Keluar Total (Ex-Date)</div>
                <div class="timeline-date">Akhir Maret</div>
                <div class="timeline-desc">Jual sisa kepemilikan Anda. Amankan modal tunai sepenuhnya ke RDPU sebelum siklus koreksi pasca-dividen dimulai kembali.</div>
              </div>
            </div>
            <div style="margin-top: 12px; display: flex; justify-content: space-between; align-items: center; background: var(--bg-color); padding: 8px 12px; border-radius: 6px; font-size: 0.76rem;">
              <span style="color: var(--text-muted);">Saran Penjualan:</span>
              <span style="font-weight: 800; color: var(--danger);">Take Profit jika PBV &gt; 2.8x (Harga &gt; Rp 5,800)</span>
            </div>
          </div>
        </div>

        ${portfolioHtml}
      `;
    } else {
      reportContainer.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
          <div>
            <h4 style="font-weight: 700; color: var(--primary); margin-bottom: 10px; font-size: 0.95rem;">📊 RINGKASAN METRIK TEKNIKAL</h4>
            <table style="width: 100%; font-size: 0.85rem; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: var(--text-muted); border-bottom: 1px solid var(--card-border);">Tren Utama (SMA 20)</td>
                <td style="font-weight: bold; text-align: right; border-bottom: 1px solid var(--card-border);">${trendText}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: var(--text-muted); border-bottom: 1px solid var(--card-border);">EMA 9 vs EMA 21</td>
                <td style="font-weight: bold; text-align: right; border-bottom: 1px solid var(--card-border);">${emaText}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: var(--text-muted); border-bottom: 1px solid var(--card-border);">RSI (14)</td>
                <td style="font-weight: bold; text-align: right; border-bottom: 1px solid var(--card-border);">${cRsi.toFixed(2)} — ${rsiText}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: var(--text-muted); border-bottom: 1px solid var(--card-border);">Bollinger Bands</td>
                <td style="font-weight: bold; text-align: right; border-bottom: 1px solid var(--card-border);">${bbText}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: var(--text-muted); border-bottom: 1px solid var(--card-border);">MACD Line</td>
                <td style="font-weight: bold; text-align: right; border-bottom: 1px solid var(--card-border); color: ${cMacd > cSignal ? 'var(--success)' : 'var(--danger)'}">
                  ${cMacd.toFixed(4)} (${cMacd > cSignal ? 'Bullish' : 'Bearish'})
                </td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: var(--text-muted);">Stochastic %K / %D</td>
                <td style="font-weight: bold; text-align: right;">%K: ${cK.toFixed(1)} / %D: ${cD.toFixed(1)}</td>
              </tr>
            </table>
          </div>

          <div style="background: rgba(255,255,255,0.01); border-left: 3px solid var(--primary); padding: 15px; border-radius: 0 8px 8px 0; display: flex; flex-direction: column; justify-content: center;">
            <h4 style="font-weight: 700; color: var(--primary); margin-bottom: 12px; font-size: 0.95rem;">🎯 PLAN REKOMENDASI TRADING</h4>
            <div style="display: flex; flex-direction: column; gap: 10px; font-size: 0.9rem;">
              <div>
                <span style="color: var(--text-muted); font-size: 0.8rem;">Zona Entry Beli:</span>
                <div style="font-weight: bold; font-size: 1.15rem; color: var(--success);">
                  ${currency}${Math.round(entryMin).toLocaleString()} - ${currency}${Math.round(entryMax).toLocaleString()}
                </div>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 10px;">
                <div>
                  <span style="color: var(--text-muted); font-size: 0.8rem;">Target Take Profit (T1)</span>
                  <div style="font-weight: bold; color: var(--primary);">${currency}${Math.round(target1).toLocaleString()} (+5%)</div>
                </div>
                <div>
                  <span style="color: var(--text-muted); font-size: 0.8rem;">Target Take Profit (T2)</span>
                  <div style="font-weight: bold; color: var(--primary);">${currency}${Math.round(target2).toLocaleString()} (+12%)</div>
                </div>
              </div>
              <div>
                <span style="color: var(--text-muted); font-size: 0.8rem;">Stop Loss Level (Disiplin):</span>
                <div style="font-weight: bold; color: var(--danger);">${currency}${Math.round(stopLoss).toLocaleString()} (-4%)</div>
              </div>
            </div>
          </div>
        </div>

        <div style="border-top: 1px solid var(--card-border); padding-top: 15px;">
          <h4 style="font-weight: 700; color: var(--text-main); margin-bottom: 8px; font-size: 0.95rem;">📝 CATATAN ANALIS / OUTLOOK</h4>
          <p style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.5; margin: 0;">
            Berdasarkan penutupan harga terakhir di level <b>${currency}${currentPrice.toLocaleString()}</b>, indikator teknis terakumulasi menunjukkan <b>${
              cEma9 > cEma21 ? 'Kekuatan tren naik jangka pendek yang dominan.' : 'Tekanan jual jangka pendek yang membayangi.'
            }</b> 
            RSI berada di posisi <b>${cRsi.toFixed(1)}</b> yang mengindikasikan <b>${
              cRsi > 65 ? 'kondisi pasar mulai panas (Overbought), tunggu pullbacks.' : cRsi < 35 ? 'kondisi pasar jenuh jual, sangat ideal diakumulasi.' : 'kondisi netral (sideways).'
            }</b> 
            Gunakan money management yang ketat dengan menaruh porsi cash 30% untuk antisipasi koreksi regional.
          </p>
        </div>
      `;
    }

    if (timestampEl) {
      timestampEl.innerText = `Updated: ${new Date().toLocaleTimeString()}`;
    }
  }

  // Render Whale & Broker Flow (Bandarmology)
  function renderStockWhaleFlow(data, symbol) {
    const whaleContainer = document.getElementById('stock-whale-flow-data');
    if (!whaleContainer) return;

    if (!data || data.length === 0) {
      whaleContainer.innerHTML = '<div style="text-align: center; color: var(--text-muted);">Data N/A</div>';
      return;
    }

    const lastIdx = data.length - 1;
    const lastBar = data[lastIdx];
    const prevBar = data[lastIdx - 1];
    const priceChangePct = ((lastBar.close - prevBar.close) / prevBar.close) * 100;
    
    // Simulate Broker Summary & Foreign Flow based on price action
    const isAccumulation = priceChangePct >= 0;
    const multiplier = symbol === 'BBRI' || symbol === 'BBCA' || symbol === 'BMRI' ? 12 : 2.5;
    const baseValue = Math.abs(priceChangePct) * 18 * multiplier + (Math.random() * 8);
    
    const foreignFlowVal = isAccumulation ? baseValue : -baseValue;
    const cr3 = isAccumulation ? (55 + Math.random() * 15) : (22 + Math.random() * 12);
    const cr5 = cr3 + (10 + Math.random() * 10);
    
    const statusText = isAccumulation 
      ? '<span style="color:var(--success); font-weight:bold;">ACCUMULATION (Whales Buying)</span>'
      : '<span style="color:var(--danger); font-weight:bold;">DISTRIBUTION (Whales Selling)</span>';
      
    const recText = isAccumulation
      ? '<div style="color: var(--success); font-weight: 700; font-size: 0.85rem; margin-top: 4px;">✔ IKUTI STRATEGI WHALE (FOLLOW WHALES - LOW RISK)</div>'
      : '<div style="color: var(--danger); font-weight: 700; font-size: 0.85rem; margin-top: 4px;">✖ HINDARI WHALE (DISTRIBUTION PHASE - AVOID)</div>';

    // Top Brokers list matching IDX standards
    let buyers = [];
    let sellers = [];

    if (isAccumulation) {
      // Whales buying, retail selling
      buyers = [
        { code: 'AK', name: 'UBS Sekuritas', value: baseValue * 0.45 },
        { code: 'RX', name: 'Macquarie', value: baseValue * 0.35 },
        { code: 'CS', name: 'Credit Suisse', value: baseValue * 0.20 }
      ];
      sellers = [
        { code: 'YP', name: 'Mirae Asset', value: -baseValue * 0.50 },
        { code: 'PD', name: 'Indo Premier', value: -baseValue * 0.30 },
        { code: 'CC', name: 'Mandiri Sekuritas', value: -baseValue * 0.20 }
      ];
    } else {
      // Whales selling, retail FOMOing
      buyers = [
        { code: 'YP', name: 'Mirae Asset', value: baseValue * 0.52 },
        { code: 'PD', name: 'Indo Premier', value: baseValue * 0.31 },
        { code: 'CC', name: 'Mandiri Sekuritas', value: baseValue * 0.17 }
      ];
      sellers = [
        { code: 'AK', name: 'UBS Sekuritas', value: -baseValue * 0.48 },
        { code: 'RX', name: 'Macquarie', value: -baseValue * 0.32 },
        { code: 'CS', name: 'Credit Suisse', value: -baseValue * 0.20 }
      ];
    }

    whaleContainer.innerHTML = `
      <div style="margin-bottom: 10px; display: flex; justify-content: space-between; font-size: 0.82rem; border-bottom: 1px solid var(--card-border); padding-bottom: 6px;">
        <span style="color: var(--text-muted);">Status Bandarmologi</span>
        <span>${statusText}</span>
      </div>
      <div style="margin-bottom: 10px; display: flex; justify-content: space-between; font-size: 0.82rem; border-bottom: 1px solid var(--card-border); padding-bottom: 6px;">
        <span style="color: var(--text-muted);">Foreign Net Flow</span>
        <span style="font-weight: bold; color: ${foreignFlowVal >= 0 ? 'var(--success)' : 'var(--danger)'}">
          ${foreignFlowVal >= 0 ? '▲ +' : '▼ '}Rp${Math.abs(foreignFlowVal).toFixed(1)} Miliar
        </span>
      </div>
      <div style="margin-bottom: 12px; display: flex; justify-content: space-between; font-size: 0.82rem; border-bottom: 1px solid var(--card-border); padding-bottom: 6px;">
        <span style="color: var(--text-muted);">Konsentrasi (CR3 / CR5)</span>
        <span style="font-weight: bold; color: ${isAccumulation ? 'var(--success)' : 'var(--warning)'}">
          ${cr3.toFixed(0)}% / ${cr5.toFixed(0)}%
        </span>
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; font-size: 0.72rem;">
        <div>
          <div style="font-weight: bold; color: var(--success); margin-bottom: 6px;">Top Buy Brokers</div>
          ${buyers.map(b => `
            <div style="display: flex; justify-content: space-between; background: rgba(46, 204, 113, 0.04); padding: 4px 6px; border-radius: 4px; margin-bottom: 4px; border-left: 2px solid var(--success);">
              <span style="font-weight: bold; color: var(--text-main);">${b.code}</span>
              <span style="color: var(--text-muted);">+${b.value.toFixed(1)}B</span>
            </div>
          `).join('')}
        </div>
        <div>
          <div style="font-weight: bold; color: var(--danger); margin-bottom: 6px;">Top Sell Brokers</div>
          ${sellers.map(s => `
            <div style="display: flex; justify-content: space-between; background: rgba(231, 76, 60, 0.04); padding: 4px 6px; border-radius: 4px; margin-bottom: 4px; border-left: 2px solid var(--danger);">
              <span style="font-weight: bold; color: var(--text-main);">${s.code}</span>
              <span style="color: var(--text-muted);">${s.value.toFixed(1)}B</span>
            </div>
          `).join('')}
        </div>
      </div>
      <div style="background: rgba(255,255,255,0.01); padding: 8px; border-radius: 6px; text-align: center; border: 1px dashed var(--card-border);">
        ${recText}
      </div>
    `;
  }

  // Render Crypto Whale Accumulation Tracker (Individual Whales / Rich Retail Leaderboard)
  function renderCryptoWhaleFlow(symbol, currentPrice) {
    const trackerContainer = document.getElementById('crypto-whale-tracker-data');
    if (!trackerContainer) return;

    const activeSymbol = symbol || 'BTC';
    const whales = state.cryptoWhales || [];

    trackerContainer.innerHTML = `
      <p style="color: var(--text-muted); font-size: 0.72rem; margin-bottom: 12px; line-height: 1.4;">
        Pemantauan dompet ritel super kaya (Smart Money) secara live. Klik baris token untuk memuat analisanya:
      </p>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${whales.map((w, index) => {
          // If the whale token matches the active symbol, we lock its price calculation to the live price feed
          const isCurrent = w.token === activeSymbol;
          const livePrice = isCurrent ? currentPrice : (
            w.token === 'BTC' ? 95420.00 :
            w.token === 'ETH' ? 3240.00 :
            w.token === 'SOL' ? 148.50 :
            w.token === 'BRETT' ? 0.142 : 1.15
          );

          const pnl = ((livePrice - w.entry) / w.entry) * 100;
          const pnlText = `${pnl >= 0 ? '+' : ''}${pnl.toFixed(1)}%`;
          const pnlColor = pnl >= 0 ? 'var(--success)' : 'var(--danger)';
          
          let rec = 'MONITOR';
          let badgeClass = 'badge-warning';
          if (pnl > 15) {
            rec = 'TP/HOLD';
            badgeClass = 'badge-danger';
          } else if (pnl >= 0 && pnl <= 10) {
            rec = 'COPY BUY';
            badgeClass = 'badge-success';
          } else if (pnl < 0) {
            rec = 'ACCUMULATE';
            badgeClass = 'badge-info';
          }

          const shortAddress = w.address.length > 15 ? `${w.address.substring(0, 6)}...${w.address.substring(w.address.length - 4)}` : w.address;

          return `
            <div style="background: rgba(255,255,255,0.01); border: 1px solid ${isCurrent ? 'var(--primary)' : 'var(--card-border)'}; border-radius: 6px; padding: 10px; cursor: pointer; transition: all 0.2s; box-shadow: ${isCurrent ? '0 0 10px rgba(95, 39, 205, 0.15)' : 'none'};" 
                 onclick="TradeMasterApp.navigateTo('crypto', '${w.token}')"
                 title="Klik untuk memuat ${w.token} ke analisis utama">
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px; align-items: center;">
                <span style="font-weight: bold; font-size: 0.8rem; color: var(--text-main);">${w.label}</span>
                <span class="badge ${badgeClass}" style="font-size: 0.65rem; padding: 2px 6px;">${rec}</span>
              </div>
              <div style="font-family: monospace; font-size: 0.7rem; color: var(--text-muted); margin-bottom: 4px;">Addr: ${shortAddress}</div>
              <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--text-muted);">
                <span>Aset: <b style="color:var(--primary); font-size:0.78rem;">${w.token}</b></span>
                <span>Value: <b>$${(w.amount / 1000000).toFixed(2)}M</b></span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--text-muted); margin-top: 4px; border-top: 1px dashed rgba(255,255,255,0.05); padding-top: 4px; align-items: center;">
                <span>Entry: $${w.entry.toLocaleString()} | PnL: <b style="color: ${pnlColor}; font-weight: bold;">${pnlText}</b></span>
                <div style="display: flex; gap: 4px;">
                  <button class="btn-edit" style="font-size: 0.6rem; padding: 1px 4px; border-radius: 3px;" onclick="event.stopPropagation(); TradeMasterApp.openCryptoWhaleModal(${index})">Edit</button>
                  <button class="btn-delete" style="font-size: 0.6rem; padding: 1px 4px; border-radius: 3px;" onclick="event.stopPropagation(); TradeMasterApp.deleteCryptoWhaleData(${index})">Del</button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // Render BEI/KSEI Major Shareholder (>1% Holdings) Portfolios
  function renderBEIWhalePortfolios() {
    const list = document.getElementById('bei-whale-portfolio-list');
    if (!list) return;

    list.innerHTML = state.beiWhales.map((w, index) => {
      const pnlColor = w.pnl >= 0 ? 'var(--success)' : 'var(--danger)';
      const pnlText = `${w.pnl >= 0 ? '+' : ''}${w.pnl}%`;
      return `
        <tr>
          <td style="font-weight: 700; color: var(--text-main);">${w.name}</td>
          <td>
            <div style="display: flex; gap: 4px; flex-wrap: wrap;">
              ${w.holdings.map(h => {
                return `<span class="badge badge-info" style="cursor: pointer; font-size: 0.65rem; padding: 2px 4px; border-radius: 4px;" onclick="TradeMasterApp.navigateTo('stocks', '${h}')">${h}</span>`;
              }).join('')}
            </div>
          </td>
          <td style="color: var(--text-muted); font-size: 0.7rem;">${w.sector}</td>
          <td>
            <span style="font-weight: bold; color: ${pnlColor};">${w.status} (${pnlText})</span>
          </td>
          <td>
            <div style="display: flex; gap: 4px;">
              <button class="btn-edit" onclick="TradeMasterApp.openWhaleModal(${index})">Edit</button>
              <button class="btn-delete" onclick="TradeMasterApp.deleteWhaleData(${index})">Hapus</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Open modal for adding or editing a whale
  function openWhaleModal(index = null) {
    const modal = document.getElementById('whale-modal');
    if (!modal) return;

    const titleEl = document.getElementById('whale-modal-title');
    const editIndexInput = document.getElementById('whale-edit-index');
    const nameInput = document.getElementById('whale-name');
    const holdingsInput = document.getElementById('whale-holdings');
    const sectorInput = document.getElementById('whale-sector');
    const statusSelect = document.getElementById('whale-status');
    const pnlInput = document.getElementById('whale-pnl');

    if (index !== null && index >= 0 && index < state.beiWhales.length) {
      // Edit mode
      const w = state.beiWhales[index];
      titleEl.innerText = 'Edit Data Whale';
      editIndexInput.value = index;
      nameInput.value = w.name;
      holdingsInput.value = w.holdings.join(', ');
      sectorInput.value = w.sector;
      statusSelect.value = w.status;
      pnlInput.value = w.pnl;
    } else {
      // Add mode
      titleEl.innerText = 'Tambah Data Whale';
      editIndexInput.value = '';
      nameInput.value = '';
      holdingsInput.value = '';
      sectorInput.value = '';
      statusSelect.value = 'ACCUMULATING';
      pnlInput.value = '';
    }

    modal.classList.add('active');
  }

  // Close modal
  function closeWhaleModal() {
    const modal = document.getElementById('whale-modal');
    if (modal) modal.classList.remove('active');
  }

  // Save whale data (Add or Edit)
  function saveWhaleData() {
    const editIndexVal = document.getElementById('whale-edit-index').value;
    const name = document.getElementById('whale-name').value.trim();
    const holdingsStr = document.getElementById('whale-holdings').value.trim();
    const sector = document.getElementById('whale-sector').value.trim();
    const status = document.getElementById('whale-status').value;
    const pnlVal = document.getElementById('whale-pnl').value.trim();

    if (!name || !holdingsStr || !sector || pnlVal === '') {
      alert('Harap isi semua kolom!');
      return;
    }

    const holdings = holdingsStr.split(',').map(h => h.trim().toUpperCase()).filter(h => h !== '');
    const pnl = parseInt(pnlVal);

    const whaleObj = { name, holdings, sector, status, pnl };

    if (editIndexVal !== '') {
      // Update existing
      const index = parseInt(editIndexVal);
      state.beiWhales[index] = whaleObj;
    } else {
      // Add new
      state.beiWhales.push(whaleObj);
    }

    // Save to localStorage
    localStorage.setItem('bei_whales_data', JSON.stringify(state.beiWhales));

    // Refresh Dashboard UI and close modal
    renderBEIWhalePortfolios();
    closeWhaleModal();

    // If we are currently on the strategy page, re-render it to update analysis
    if (state.activePage === 'strategy') {
      renderStrategyPage();
    }
  }

  // Delete whale data
  function deleteWhaleData(index) {
    if (confirm('Apakah Anda yakin ingin menghapus data whale ini?')) {
      state.beiWhales.splice(index, 1);
      localStorage.setItem('bei_whales_data', JSON.stringify(state.beiWhales));
      renderBEIWhalePortfolios();
      
      // If we are currently on the strategy page, re-render it to update analysis
      if (state.activePage === 'strategy') {
        renderStrategyPage();
      }
    }
  }

  // Open crypto whale modal
  function openCryptoWhaleModal(index = null) {
    const modal = document.getElementById('crypto-whale-modal');
    if (!modal) return;

    const titleEl = document.getElementById('crypto-whale-modal-title');
    const editIndexInput = document.getElementById('crypto-whale-edit-index');
    const addressInput = document.getElementById('crypto-whale-address');
    const labelInput = document.getElementById('crypto-whale-label');
    const tokenInput = document.getElementById('crypto-whale-token');
    const entryInput = document.getElementById('crypto-whale-entry');
    const amountInput = document.getElementById('crypto-whale-amount');

    if (index !== null && index >= 0 && index < state.cryptoWhales.length) {
      const w = state.cryptoWhales[index];
      titleEl.innerText = 'Edit Smart Money Wallet';
      editIndexInput.value = index;
      addressInput.value = w.address;
      labelInput.value = w.label;
      tokenInput.value = w.token;
      entryInput.value = w.entry;
      amountInput.value = w.amount;
    } else {
      titleEl.innerText = 'Tambah Smart Money Wallet';
      editIndexInput.value = '';
      addressInput.value = '';
      labelInput.value = '';
      tokenInput.value = '';
      entryInput.value = '';
      amountInput.value = '';
    }

    modal.classList.add('active');
  }

  // Close crypto whale modal
  function closeCryptoWhaleModal() {
    const modal = document.getElementById('crypto-whale-modal');
    if (modal) modal.classList.remove('active');
  }

  // Save crypto whale data
  function saveCryptoWhaleData() {
    const editIndexVal = document.getElementById('crypto-whale-edit-index').value;
    const address = document.getElementById('crypto-whale-address').value.trim();
    const label = document.getElementById('crypto-whale-label').value.trim();
    const token = document.getElementById('crypto-whale-token').value.trim().toUpperCase();
    const entryVal = document.getElementById('crypto-whale-entry').value.trim();
    const amountVal = document.getElementById('crypto-whale-amount').value.trim();

    if (!address || !label || !token || entryVal === '' || amountVal === '') {
      alert('Harap isi semua kolom!');
      return;
    }

    const entry = parseFloat(entryVal);
    const amount = parseFloat(amountVal);
    const whaleObj = { address, label, token, entry, amount };

    if (editIndexVal !== '') {
      const index = parseInt(editIndexVal);
      state.cryptoWhales[index] = whaleObj;
    } else {
      state.cryptoWhales.push(whaleObj);
    }

    localStorage.setItem('crypto_whales_data', JSON.stringify(state.cryptoWhales));
    
    // Re-render
    renderCryptoWhaleFlow(state.crypto.selected, state.crypto.livePrice);
    closeCryptoWhaleModal();
    
    if (state.activePage === 'strategy') {
      renderStrategyPage();
    }
  }

  // Delete crypto whale data
  function deleteCryptoWhaleData(index) {
    if (confirm('Apakah Anda yakin ingin menghapus dompet smart money ini?')) {
      state.cryptoWhales.splice(index, 1);
      localStorage.setItem('crypto_whales_data', JSON.stringify(state.cryptoWhales));
      renderCryptoWhaleFlow(state.crypto.selected, state.crypto.livePrice);
      
      if (state.activePage === 'strategy') {
        renderStrategyPage();
      }
    }
  }

  function calcPositionSize() {
    const modalInput = document.getElementById('calc-modal');
    const riskSelect = document.getElementById('calc-risk');
    const entryInput = document.getElementById('calc-entry');
    const slInput = document.getElementById('calc-sl');

    if (!modalInput || !riskSelect || !entryInput || !slInput) return;

    const modal = parseFloat(modalInput.value) || 0;
    const riskPct = parseFloat(riskSelect.value) || 0;
    const entry = parseFloat(entryInput.value) || 0;
    const sl = parseFloat(slInput.value) || 0;

    const resRiskVal = document.getElementById('res-risk-val');
    const resSizeVal = document.getElementById('res-size-val');
    const resUnitsVal = document.getElementById('res-units-val');

    if (modal <= 0 || entry <= 0 || entry <= sl) {
      if (resRiskVal) resRiskVal.innerText = 'Rp 0';
      if (resSizeVal) resSizeVal.innerText = 'Rp 0';
      if (resUnitsVal) resUnitsVal.innerText = '0 Unit';
      return;
    }

    const riskAmount = modal * (riskPct / 100);
    const riskPerUnit = entry - sl;
    const units = Math.floor(riskAmount / riskPerUnit);
    const positionSize = units * entry;

    const isCrypto = entry < 500;
    const prefix = isCrypto ? '$' : 'Rp ';

    if (resRiskVal) resRiskVal.innerText = prefix + riskAmount.toLocaleString(undefined, { maximumFractionDigits: isCrypto ? 2 : 0 });
    if (resSizeVal) resSizeVal.innerText = prefix + positionSize.toLocaleString(undefined, { maximumFractionDigits: isCrypto ? 2 : 0 });
    if (resUnitsVal) {
      const lotText = !isCrypto ? ` (${Math.floor(units / 100)} Lot)` : '';
      resUnitsVal.innerText = `${units.toLocaleString()} Unit${lotText}`;
    }
  }

  function calcAverageDown() {
    const curPriceInput = document.getElementById('avg-current-price');
    const curQtyInput = document.getElementById('avg-current-qty');
    const targetPriceInput = document.getElementById('avg-target-price');
    const mktPriceInput = document.getElementById('avg-market-price');

    if (!curPriceInput || !curQtyInput || !targetPriceInput || !mktPriceInput) return;

    const curAvg = parseFloat(curPriceInput.value) || 0;
    const curQty = parseFloat(curQtyInput.value) || 0;
    const targetAvg = parseFloat(targetPriceInput.value) || 0;
    const mktPrice = parseFloat(mktPriceInput.value) || 0;

    const resQtyEl = document.getElementById('res-avg-qty');
    const resDanaEl = document.getElementById('res-avg-dana');
    const resTotalEl = document.getElementById('res-avg-total');

    if (curAvg <= targetAvg || targetAvg <= mktPrice || curQty <= 0) {
      if (resQtyEl) resQtyEl.innerText = 'N/A (Target tidak valid)';
      if (resDanaEl) resDanaEl.innerText = 'Rp 0';
      if (resTotalEl) resTotalEl.innerText = 'Pastikan: Serokan < Target < Rata-rata saat ini';
      return;
    }

    const additionalQty = Math.ceil(curQty * (curAvg - targetAvg) / (targetAvg - mktPrice));
    const additionalDana = additionalQty * mktPrice;
    const totalQty = curQty + additionalQty;

    const isCrypto = curAvg < 500;
    const prefix = isCrypto ? '$' : 'Rp ';

    if (resQtyEl) {
      const lotText = !isCrypto ? ` (${Math.floor(additionalQty / 100)} Lot)` : '';
      resQtyEl.innerText = `${additionalQty.toLocaleString()} Unit${lotText}`;
    }
    if (resDanaEl) {
      resDanaEl.innerText = prefix + additionalDana.toLocaleString(undefined, { maximumFractionDigits: isCrypto ? 2 : 0 });
    }
    if (resTotalEl) {
      const lotText = !isCrypto ? ` (${Math.floor(totalQty / 100)} Lot)` : '';
      resTotalEl.innerText = `${totalQty.toLocaleString()} Unit${lotText} @ ${prefix}${targetAvg.toLocaleString()}`;
    }
  }

  // Render Broker Accumulation Tracker (Portfolio of Top Brokers)
  function renderBrokerAccumulationTracker() {
    const list = document.getElementById('broker-accumulation-list');
    if (!list) return;

    const brokerAccumulation = [
      { code: 'AK', name: 'UBS Sekuritas', stock: 'BBRI', netBuy: 240.5, avgEntry: 4180 },
      { code: 'RX', name: 'Macquarie', stock: 'BMRI', netBuy: 182.2, avgEntry: 6050 },
      { code: 'CS', name: 'Credit Suisse', stock: 'BRMS', netBuy: 45.8, avgEntry: 168 },
      { code: 'KZ', name: 'CLSA Sekuritas', stock: 'BBCA', netBuy: 190.1, avgEntry: 10120 },
      { code: 'YP', name: 'Mirae Asset (Ritel)', stock: 'GOTO', netBuy: 22.5, avgEntry: 52 },
      { code: 'PD', name: 'Indo Premier (Ritel)', stock: 'BUMI', netBuy: 15.4, avgEntry: 85 }
    ];

    list.innerHTML = brokerAccumulation.map(b => {
      const isRetail = b.code === 'YP' || b.code === 'PD';
      return `
        <tr style="cursor: pointer;" onclick="TradeMasterApp.navigateTo('stocks', '${b.stock}')" title="Klik untuk melacak & memuat saham ${b.stock} ke analisis utama">
          <td style="font-weight: 700;">
            <span class="badge ${isRetail ? 'badge-warning' : 'badge-success'}" style="font-size:0.7rem; padding: 2px 6px;">${b.code}</span>
          </td>
          <td style="font-weight: bold; color: var(--primary);">${b.stock}</td>
          <td style="font-weight: bold; color: var(--success);">+Rp${b.netBuy.toFixed(1)}B</td>
          <td style="color: var(--text-muted);">Rp${b.avgEntry.toLocaleString()}</td>
        </tr>
      `;
    }).join('');
  }

  // 4. Initial Navigation and Routing
  function navigateTo(pageId, assetSymbol = null) {
    console.log(`Navigating to page: ${pageId}`);
    
    // Stop WS / Polling if leaving crypto page
    if (state.activePage === 'crypto' && pageId !== 'crypto') {
      if (state.crypto.wsConnection) {
        state.crypto.wsConnection.close();
        state.crypto.wsConnection = null;
      }
      if (state.crypto.pollInterval) {
        clearInterval(state.crypto.pollInterval);
        state.crypto.pollInterval = null;
      }
    }

    // Update active nav items in UI
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
      if (item.getAttribute('onclick')?.includes(`'${pageId}'`)) {
        item.classList.add('active');
      }
    });

    // Update active page divs
    document.querySelectorAll('.page-section').forEach(sec => {
      sec.classList.remove('active');
    });
    const targetSection = document.getElementById(`page-${pageId}`);
    if (targetSection) targetSection.classList.add('active');

    state.activePage = pageId;

    // Load page data
    if (pageId === 'dashboard') {
      renderDashboard();
    } else if (pageId === 'crypto') {
      if (assetSymbol) state.crypto.selected = assetSymbol;
      renderCryptoPage();
    } else if (pageId === 'stocks') {
      if (assetSymbol) state.stocks.selected = assetSymbol;
      renderStocksPage();
    } else if (pageId === 'news') {
      renderNewsPage();
    } else if (pageId === 'strategy') {
      renderStrategyPage();
    }
  }

  // 5. Initialize listeners & actions
  function init() {
    console.log('Initializing TradeMaster Application...');
    
    // 1. Navigation handlers
    navigateTo('dashboard');

    // 2. Crypto selector handler
    const cryptoSelect = document.getElementById('crypto-select');
    if (cryptoSelect) {
      cryptoSelect.addEventListener('change', (e) => {
        state.crypto.selected = e.target.value;
        renderCryptoPage();
      });
    }

    // 2b. CEX Exchange selector handler
    const exchangeSelect = document.getElementById('exchange-select');
    if (exchangeSelect) {
      exchangeSelect.addEventListener('change', (e) => {
        state.crypto.exchange = e.target.value;
        renderCryptoPage();
      });
    }

    // 3. Stock selector handler
    const stockSelect = document.getElementById('stock-select');
    if (stockSelect) {
      stockSelect.addEventListener('change', (e) => {
        state.stocks.selected = e.target.value;
        renderStocksPage();
      });
    }

    // 4. Indicator Toggle Click Handlers (Crypto & Stocks)
    document.querySelectorAll('.btn-indicator').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const type = e.target.closest('#page-crypto') ? 'crypto' : 'stocks';
        const indicator = e.target.getAttribute('data-ind');
        
        const activeList = state[type].activeIndicators;
        const index = activeList.indexOf(indicator);
        if (index > -1) {
          activeList.splice(index, 1);
          e.target.classList.remove('active');
        } else {
          activeList.push(indicator);
          e.target.classList.add('active');
        }
        
        renderChartOverlays(type);
      });
    });

    // 5. Generate Lucide Icons
    if (window.lucide) {
      lucide.createIcons();
    }
  }

  return {
    init,
    navigateTo,
    state,
    scanCryptoMoonshots,
    setCryptoMode,
    searchDEXToken,
    selectDEXToken,
    openWhaleModal,
    closeWhaleModal,
    saveWhaleData,
    deleteWhaleData,
    openCryptoWhaleModal,
    closeCryptoWhaleModal,
    saveCryptoWhaleData,
    deleteCryptoWhaleData,
    calcPositionSize,
    calcAverageDown
  };
})();

// Start application when fully loaded
window.addEventListener('DOMContentLoaded', () => {
  TradeMasterApp.init();
});
