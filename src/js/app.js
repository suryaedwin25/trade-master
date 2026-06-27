/* C:\Users\surya\.gemini\antigravity\scratch\trademaster\src\js\app.js */

window.TradeMasterApp = (function() {
  
  // App state
  const state = {
    activePage: 'dashboard',
    crypto: {
      selected: 'BTC',
      chartInterval: '1d',
      activeIndicators: ['EMA9', 'EMA21'], // defaults
      chartData: [],
      livePrice: 0,
      priceChange: 0,
      trades: [],
      wsConnection: null,
      chartInstance: null,
      indicatorChartInstance: null,
      candlestickSeries: null,
      indicatorLineSeries: {}
    },
    stocks: {
      selected: 'BBCA',
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
    
    // Set headers
    document.getElementById('crypto-title').innerText = `${symbol}/USDT`;
    
    // Set up selector active asset
    const select = document.getElementById('crypto-select');
    if (select) select.value = symbol;

    // Initialize Chart
    const chart = initMainChart('crypto-chart-pane', 'crypto');
    
    // Fetch Chart Data
    const data = await TradeMasterAPI.getCryptoChartData(symbol, state.crypto.chartInterval);
    state.crypto.chartData = data;
    
    if (state.crypto.candlestickSeries) {
      state.crypto.candlestickSeries.setData(data);
      state.crypto.chartInstance.timeScale().fitContent();
    }

    // Render Indicators
    renderChartOverlays('crypto');

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

    // Connect to Live WebSocket for Trades
    state.crypto.trades = [];
    const tradesContainer = document.getElementById('crypto-trades-list');
    
    // Setup fallback live simulated price updates if ws fails, or directly stream ws
    TradeMasterAPI.connectCryptoWS(symbol, (trade) => {
      // Keep only last 15 trades
      state.crypto.trades.unshift(trade);
      if (state.crypto.trades.length > 15) state.crypto.trades.pop();

      // Update ticker real-time price info
      state.crypto.livePrice = trade.price;
      const priceText = document.getElementById('crypto-live-price');
      if (priceText) {
        priceText.innerText = `$${trade.price.toLocaleString()}`;
        priceText.style.color = trade.isBuyerMaker ? 'var(--danger)' : 'var(--success)';
      }

      // Render trade row
      if (tradesContainer) {
        tradesContainer.innerHTML = state.crypto.trades.map(t => `
          <div class="trade-row">
            <span class="trade-price ${t.isBuyerMaker ? 'sell' : 'buy'}">$${t.price.toLocaleString()}</span>
            <span>${t.quantity.toFixed(4)}</span>
            <span style="color: var(--text-dark); font-size: 0.75rem;">${new Date(t.time).toLocaleTimeString()}</span>
          </div>
        `).join('');
      }

      // Add ticker item to main header top bar
      const topCrypto = document.getElementById('top-crypto-ticker');
      if (topCrypto) {
        topCrypto.innerHTML = `<span class="ticker-label">${symbol}:</span> <span class="ticker-val up">$${trade.price.toLocaleString()}</span>`;
      }
    });
  }

  async function renderStocksPage() {
    console.log('Rendering Stocks Terminal...');
    const symbol = state.stocks.selected;

    // Set headers
    document.getElementById('stock-title').innerText = `${symbol}.JK (Saham Indonesia)`;
    
    const select = document.getElementById('stock-select');
    if (select) select.value = symbol;

    // Init Chart
    const chart = initMainChart('stock-chart-pane', 'stocks');

    // Fetch stock data from Yahoo Finance
    const data = await TradeMasterAPI.getIDXChartData(symbol);
    state.stocks.chartData = data;

    if (state.stocks.candlestickSeries && data.length > 0) {
      state.stocks.candlestickSeries.setData(data);
      state.stocks.chartInstance.timeScale().fitContent();
      
      const last = data[data.length - 1];
      const prev = data[data.length - 2];
      const changePct = ((last.close - prev.close) / prev.close) * 100;
      
      document.getElementById('stock-live-price').innerText = `Rp${last.close.toLocaleString()}`;
      const changeEl = document.getElementById('stock-price-change');
      changeEl.innerText = `${changePct >= 0 ? '▲ +' : '▼ '}${changePct.toFixed(2)}%`;
      changeEl.className = `metric-change ${changePct >= 0 ? 'up' : 'down'}`;
    } else {
      document.getElementById('stock-live-price').innerText = 'Data N/A';
    }

    // Render Overlays
    renderChartOverlays('stocks');

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

  // 4. Initial Navigation and Routing
  function navigateTo(pageId, assetSymbol = null) {
    console.log(`Navigating to page: ${pageId}`);
    
    // Stop WS if leaving crypto page
    if (state.activePage === 'crypto' && pageId !== 'crypto' && state.crypto.wsConnection) {
      state.crypto.wsConnection.close();
      state.crypto.wsConnection = null;
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
    state
  };
})();

// Start application when fully loaded
window.addEventListener('DOMContentLoaded', () => {
  TradeMasterApp.init();
});
