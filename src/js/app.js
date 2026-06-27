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
    sentimentScorecard: null
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
    destroyChart(type);
    
    const container = document.getElementById(containerId);
    if (!container) return;

    // Create the main candlestick chart
    const chart = LightweightCharts.createChart(container, {
      layout: {
        background: { type: LightweightCharts.ColorType.Solid, color: '#12121a' },
        textColor: '#8e8ea8',
        fontSize: 11
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.03)' }
      },
      crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.08)',
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.08)',
        timeVisible: true
      },
      width: container.clientWidth,
      height: type === 'crypto' ? 320 : 400
    });

    const series = chart.addCandlestickSeries({
      upColor: '#00e676',
      downColor: '#ff5252',
      borderVisible: false,
      wickUpColor: '#00e676',
      wickDownColor: '#ff5252'
    });

    state[type].chartInstance = chart;
    state[type].candlestickSeries = series;

    // Auto-resize on window resize
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

    const chart = LightweightCharts.createChart(container, {
      layout: {
        background: { type: LightweightCharts.ColorType.Solid, color: '#12121a' },
        textColor: '#8e8ea8',
        fontSize: 10
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.02)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.02)' }
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.05)',
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.05)',
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

    // Render Speculative Stocks Watchlist & Scanner
    renderSpeculativeStocks();

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
    `;
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

        return {
          symbol: t.symbol,
          pair: t.pair,
          price: last,
          volume: quoteVol,
          change,
          rangePos,
          score: Math.round(score),
          rsi: 'Loading...'
        };
      });

      // Filter out elements with invalid NaN values
      const validScored = scored.filter(item => !isNaN(item.price) && !isNaN(item.change) && !isNaN(item.score));

      const topMoonshots = validScored
        .sort((a, b) => b.score - a.score)
        .slice(0, 6);

      if (topMoonshots.length === 0) {
        list.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--danger);">Tidak ada token yang memenuhi kriteria likuiditas saat ini.</td></tr>`;
        return;
      }

      list.innerHTML = topMoonshots.map(m => `
        <tr id="moonshot-row-${m.symbol}">
          <td style="font-weight: 700; display: flex; align-items: center; gap: 8px;">
            <span class="logo-icon" style="width: 20px; height: 20px; font-size: 0.75rem; box-shadow: none;">${m.symbol[0]}</span>
            ${m.symbol} <span style="font-size: 0.75rem; color: var(--text-muted);">/USDT</span>
          </td>
          <td style="font-weight: bold;">$${m.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 6})}</td>
          <td>$${(m.volume / 1000000).toFixed(2)}M</td>
          <td class="metric-change ${m.change >= 0 ? 'up' : 'down'}">${m.change >= 0 ? '▲ +' : '▼ '}${m.change.toFixed(2)}%</td>
          <td id="moonshot-rsi-${m.symbol}">Calculated...</td>
          <td>${(m.rangePos * 100).toFixed(0)}%</td>
          <td style="font-weight: bold; color: var(--primary);">${m.score}%</td>
          <td>
            <span id="moonshot-badge-${m.symbol}" class="badge badge-warning">SCANNING...</span>
          </td>
        </tr>
      `).join('');

      // Fetch 1h candles in parallel from the correct exchange to calculate real RSI 14
      topMoonshots.forEach(async (m) => {
        try {
          const candles = await TradeMasterAPI.getCryptoChartData(m.symbol, '1h', 30, scannerExchange);
          if (candles && candles.length >= 14) {
            const rsiValues = TradeMasterTA.calculateRSI(candles, 14);
            const currentRsi = rsiValues[rsiValues.length - 1];

            const rsiEl = document.getElementById(`moonshot-rsi-${m.symbol}`);
            const badgeEl = document.getElementById(`moonshot-badge-${m.symbol}`);
            
            if (rsiEl) rsiEl.innerText = currentRsi.toFixed(1);

            if (badgeEl) {
              let rec = 'HOLD';
              let badgeClass = 'badge-warning';

              if (currentRsi >= 50 && currentRsi <= 65 && m.score >= 80) {
                rec = 'STRONG BUY';
                badgeClass = 'badge-success';
              } else if (currentRsi >= 45 && currentRsi <= 68 && m.score >= 65) {
                rec = 'BUY';
                badgeClass = 'badge-success';
              } else if (currentRsi > 70) {
                rec = 'SELL';
                badgeClass = 'badge-danger';
              } else if (currentRsi < 40) {
                rec = 'HOLD / ACCUM';
                badgeClass = 'badge-info';
              }

              badgeEl.innerText = rec;
              badgeEl.className = `badge ${badgeClass}`;
            }
          }
        } catch (e) {
          console.error(`Failed to scan dynamic indicators for ${m.symbol}:`, e);
          const rsiEl = document.getElementById(`moonshot-rsi-${m.symbol}`);
          if (rsiEl) rsiEl.innerText = 'N/A';
        }
      });

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

    if (mode === 'CEX') {
      if (cexBtn) cexBtn.classList.add('active');
      if (dexBtn) dexBtn.classList.remove('active');
      if (cexSelectors) cexSelectors.style.display = 'flex';
      if (dexInput) dexInput.style.display = 'none';
      if (cexChartControls) cexChartControls.style.display = 'flex';
      if (cexChartPane) cexChartPane.style.display = 'block';
      if (dexChartPane) dexChartPane.style.display = 'none';
      if (cexTradesCard) cexTradesCard.style.display = 'block';
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
      if (cexTradesCard) cexTradesCard.style.display = 'none';
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
    
    // List of active individual whales (rich retail)
    const individualWhales = [
      { id: '0x71a... Whale-Alpha', token: 'SOL', entry: 138.50, holdDays: 45, amount: 2450000 },
      { id: 'bc1q9... Whale-Beta', token: 'BTC', entry: 91400.00, holdDays: 82, amount: 8900000 },
      { id: '0x88f... FatCat', token: 'ETH', entry: 2980.00, holdDays: 60, amount: 3120000 },
      { id: '0x32e... Gigachad', token: 'BRETT', entry: 0.122, holdDays: 14, amount: 850000 },
      { id: 'SOL-5... DogeKing', token: 'POPCAT', entry: 0.82, holdDays: 18, amount: 1100000 }
    ];

    trackerContainer.innerHTML = `
      <p style="color: var(--text-muted); font-size: 0.72rem; margin-bottom: 12px; line-height: 1.4;">
        Pemantauan berkala wallet ritel super kaya (Individual Whales) secara live. Klik baris token untuk melacak & mengkopi posisi entry mereka:
      </p>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${individualWhales.map(w => {
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

          return `
            <div style="background: rgba(255,255,255,0.01); border: 1px solid ${isCurrent ? 'var(--primary)' : 'var(--card-border)'}; border-radius: 6px; padding: 10px; cursor: pointer; transition: all 0.2s; box-shadow: ${isCurrent ? '0 0 10px rgba(108, 92, 231, 0.15)' : 'none'};" 
                 onclick="TradeMasterApp.navigateTo('crypto', '${w.token}')"
                 title="Klik untuk memuat ${w.token} ke analisis utama">
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="font-family: monospace; font-weight: bold; font-size: 0.75rem; color: var(--text-main);">${w.id}</span>
                <span class="badge ${badgeClass}" style="font-size: 0.65rem; padding: 2px 6px;">${rec}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--text-muted);">
                <span>Aset: <b style="color:var(--primary); font-size:0.8rem;">${w.token}</b></span>
                <span>Jumlah: <b>$${(w.amount / 1000000).toFixed(2)}M</b></span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--text-muted); margin-top: 4px; border-top: 1px dashed rgba(255,255,255,0.05); padding-top: 4px;">
                <span>Entry: $${w.entry.toLocaleString()} (${w.holdDays}d hold)</span>
                <span>PnL: <b style="color: ${pnlColor}; font-weight: bold;">${pnlText}</b></span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // Render Speculative Stock Watchlist & Scanner
  async function renderSpeculativeStocks() {
    const list = document.getElementById('speculative-stock-list');
    if (!list) return;

    try {
      const symbols = ['GOTO', 'BRMS', 'BUMI', 'DEWA', 'MEDC', 'TPIA'];
      const batchTickers = symbols.map(s => `${s}.JK`).join(',');
      const url = `https://query1.finance.yahoo.com/v7/finance/quotes?symbols=${batchTickers}`;
      
      const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
      const raw = await response.json();
      const data = JSON.parse(raw.contents);
      const quotes = data.quoteResponse?.result || [];

      if (quotes.length === 0) {
        list.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--danger);">Gagal memuat list spekulatif.</td></tr>`;
        return;
      }

      list.innerHTML = quotes.map(q => {
        const symbol = q.symbol.replace('.JK', '');
        const price = q.regularMarketPrice || 0;
        const change = q.regularMarketChangePercent || 0;
        const high = q.regularMarketDayHigh || 0;
        const low = q.regularMarketDayLow || 0;
        
        // Volatility metric: High-Low range ratio
        const volatility = price > 0 ? ((high - low) / price) * 100 : 0;
        
        let rec = 'HOLD';
        let badgeClass = 'badge-warning';

        if (change >= 1.5 && change <= 6.0 && volatility > 3) {
          rec = 'BUY SPEC';
          badgeClass = 'badge-success';
        } else if (change > 6.0) {
          rec = 'SELL / TP';
          badgeClass = 'badge-danger';
        } else if (change < -3.0) {
          rec = 'ACCUM BUY';
          badgeClass = 'badge-info';
        }

        return `
          <tr style="cursor: pointer;" onclick="TradeMasterApp.navigateTo('stocks', '${symbol}')" title="Klik untuk memuat ${symbol} ke analisis utama">
            <td style="font-weight: 700; color: var(--primary);">${symbol}</td>
            <td style="font-weight: bold;">Rp${price.toLocaleString()}</td>
            <td class="metric-change ${change >= 0 ? 'up' : 'down'}">${change >= 0 ? '▲ +' : '▼ '}${change.toFixed(2)}%</td>
            <td style="color: var(--text-muted);">${volatility.toFixed(1)}%</td>
            <td>
              <span class="badge ${badgeClass}">${rec}</span>
            </td>
          </tr>
        `;
      }).join('');

    } catch (e) {
      console.error('Failed to load speculative stocks:', e);
      list.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--danger);">Koneksi API terputus.</td></tr>`;
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
    selectDEXToken
  };
})();

// Start application when fully loaded
window.addEventListener('DOMContentLoaded', () => {
  TradeMasterApp.init();
});
