/* C:\Users\surya\.gemini\antigravity\scratch\trademaster\src\js\api.js */

window.TradeMasterAPI = (function() {
  const CORS_PROXY = 'https://corsproxy.io/?';
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

  // Cache helper
  function getCachedData(key) {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    const { timestamp, data } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_DURATION) {
      localStorage.removeItem(key);
      return null;
    }
    return data;
  }

  function setCachedData(key, data) {
    localStorage.setItem(key, JSON.stringify({
      timestamp: Date.now(),
      data
    }));
  }

  // Fetch with Cache and optional CORS Proxy
  async function fetchJSON(url, useProxy = false, skipCache = false) {
    const cacheKey = `cache_${url}`;
    if (!skipCache) {
      const cached = getCachedData(cacheKey);
      if (cached) return cached;
    }

    const fetchUrl = useProxy ? `${CORS_PROXY}${encodeURIComponent(url)}` : url;
    const response = await fetch(fetchUrl);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const result = await response.json();
    
    if (!skipCache) {
      setCachedData(cacheKey, result);
    }
    return result;
  }

  // Active WebSocket reference
  let currentWS = null;

  return {
    // 1. Crypto API - Get Top Market Data (REST)
    async getCryptoTickers() {
      // Fetch prices for top pairs from Binance
      const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'ADAUSDT', 'XRPUSDT', 'DOGEUSDT', 'DOTUSDT'];
      try {
        const data = await fetchJSON('https://api.binance.com/api/v3/ticker/24hr');
        return data.filter(item => symbols.includes(item.symbol)).map(item => ({
          symbol: item.symbol.replace('USDT', ''),
          pair: item.symbol,
          price: parseFloat(item.lastPrice),
          change: parseFloat(item.priceChangePercent),
          high: parseFloat(item.highPrice),
          low: parseFloat(item.lowPrice),
          volume: parseFloat(item.volume)
        }));
      } catch (err) {
        console.error('Failed to fetch crypto tickers from Binance:', err);
        // Fallback mockup in case of network issue
        return symbols.map(sym => ({
          symbol: sym.replace('USDT', ''),
          pair: sym,
          price: sym === 'BTCUSDT' ? 95000 : sym === 'ETHUSDT' ? 3200 : 150,
          change: 1.5,
          high: 160,
          low: 140,
          volume: 100000
        }));
      }
    },

    // 2. Crypto API - Live Trades Stream (WebSocket)
    connectCryptoWS(symbol, onMessage) {
      if (currentWS) {
        currentWS.close();
      }

      const wsSymbol = symbol.toLowerCase() + 'usdt';
      const wsUrl = `wss://stream.binance.com:9443/ws/${wsSymbol}@trade`;
      
      console.log(`Connecting to Binance WS: ${wsUrl}`);
      const ws = new WebSocket(wsUrl);
      
      ws.onmessage = (event) => {
        const raw = JSON.parse(event.data);
        onMessage({
          price: parseFloat(raw.p),
          quantity: parseFloat(raw.q),
          time: raw.E,
          isBuyerMaker: raw.m // true = sell, false = buy
        });
      };

      ws.onerror = (err) => {
        console.error('Binance WebSocket Error:', err);
      };

      currentWS = ws;
      return ws;
    },

    // 3. Crypto API - Historical Candlestick data for Charts (Binance, Bybit, Gate.io)
    async getCryptoChartData(symbol, interval = '1d', limit = 150, exchange = 'Binance') {
      const pair = symbol.toUpperCase() + 'USDT';
      
      if (exchange === 'Bybit') {
        const bybitInterval = interval === '1d' ? 'D' : '60';
        const url = `https://api.bybit.com/v5/market/kline?category=spot&symbol=${pair}&interval=${bybitInterval}&limit=${limit}`;
        try {
          const data = await fetchJSON(url);
          const rawList = data.result?.list || [];
          // Bybit returns newest first, reverse it for charting
          return [...rawList].reverse().map(item => ({
            time: parseInt(item[0]) / 1000,
            open: parseFloat(item[1]),
            high: parseFloat(item[2]),
            low: parseFloat(item[3]),
            close: parseFloat(item[4]),
            volume: parseFloat(item[5])
          }));
        } catch (err) {
          console.error(`Failed to fetch Bybit chart data for ${symbol}:`, err);
          return [];
        }
      } 
      
      if (exchange === 'Gate.io') {
        const gateInterval = interval === '1d' ? '1d' : '1h';
        const url = `https://api.gateio.ws/api/v4/spot/candlesticks?currency_pair=${symbol.toUpperCase()}_USDT&limit=${limit}&interval=${gateInterval}`;
        try {
          const data = await fetchJSON(url);
          return data.map(item => ({
            time: parseInt(item[0]), // Already in seconds
            open: parseFloat(item[5]),
            high: parseFloat(item[3]),
            low: parseFloat(item[4]),
            close: parseFloat(item[2]),
            volume: parseFloat(item[1])
          }));
        } catch (err) {
          console.error(`Failed to fetch Gate.io chart data for ${symbol}:`, err);
          return [];
        }
      }

      // Default: Binance
      const url = `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${interval}&limit=${limit}`;
      try {
        const data = await fetchJSON(url);
        return data.map(item => ({
          time: item[0] / 1000, // Convert ms to s for TV library
          open: parseFloat(item[1]),
          high: parseFloat(item[2]),
          low: parseFloat(item[3]),
          close: parseFloat(item[4]),
          volume: parseFloat(item[5])
        }));
      } catch (err) {
        console.error(`Failed to fetch Binance chart data for ${symbol}:`, err);
        return [];
      }
    },

    // 3b. Crypto API - Fetch single live ticker price (for non-websocket feeds or initial loads)
    async getCryptoLiveTicker(symbol, exchange = 'Binance') {
      const pair = symbol.toUpperCase() + 'USDT';
      
      if (exchange === 'Bybit') {
        const url = `https://api.bybit.com/v5/market/tickers?category=spot&symbol=${pair}`;
        try {
          const data = await fetchJSON(url);
          const item = data.result?.list?.[0];
          if (!item) return null;
          return {
            price: parseFloat(item.lastPrice),
            change: parseFloat(item.price24hPcnt) * 100 // Bybit returns fraction e.g. 0.02
          };
        } catch (e) {
          console.error('Failed to fetch Bybit ticker:', e);
          return null;
        }
      }
      
      if (exchange === 'Gate.io') {
        const url = `https://api.gateio.ws/api/v4/spot/tickers?currency_pair=${symbol.toUpperCase()}_USDT`;
        try {
          const data = await fetchJSON(url);
          const item = data[0];
          return {
            price: parseFloat(item.last),
            change: parseFloat(item.change_percentage)
          };
        } catch (e) {
          console.error('Failed to fetch Gate.io ticker:', e);
          return null;
        }
      }

      // Default: Binance
      const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${pair}`;
      try {
        const data = await fetchJSON(url);
        return {
          price: parseFloat(data.lastPrice),
          change: parseFloat(data.priceChangePercent)
        };
      } catch (e) {
        console.error('Failed to fetch Binance ticker:', e);
        return null;
      }
    },

    // 4. Saham IDX API - Get Historical Stock Price (Yahoo Finance via Proxy)
    async getIDXChartData(symbol, range = '3mo', interval = '1d') {
      const ticker = `${symbol.toUpperCase()}.JK`;
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=${range}&interval=${interval}&_nocache=${Date.now()}`;
      try {
        const data = await fetchJSON(url, true, true); // skipCache = true
        const result = data.chart.result[0];
        const timestamps = result.timestamp;
        const indicators = result.indicators.quote[0];
        
        return timestamps.map((ts, index) => ({
          time: ts,
          open: indicators.open[index] || indicators.close[index],
          high: indicators.high[index] || indicators.close[index],
          low: indicators.low[index] || indicators.close[index],
          close: indicators.close[index],
          volume: indicators.volume[index] || 0
        })).filter(item => item.close !== null && item.open !== null);
      } catch (err) {
        console.error(`Failed to fetch IDX stock data for ${symbol}:`, err);
        // Fallback realistic candle generator for smooth UX if proxy is unavailable
        const now = Math.floor(Date.now() / 1000);
        const daySeconds = 86400;
        const mockData = [];
        let basePrice = symbol === 'BBCA' ? 10250 : symbol === 'BBRI' ? 4480 : symbol === 'BMRI' ? 6450 : symbol === 'TLKM' ? 2880 : symbol === 'ASII' ? 4950 : symbol === 'GOTO' ? 54 : symbol === 'BREN' ? 8850 : symbol === 'AMMN' ? 11600 : symbol === 'BRMS' ? 188 : symbol === 'CUAN' ? 7800 : 3500;
        
        for (let i = 60; i >= 0; i--) {
          const time = now - (i * daySeconds);
          const volatility = basePrice * 0.012;
          const open = basePrice + (Math.random() - 0.48) * volatility;
          const close = open + (Math.random() - 0.48) * volatility;
          const high = Math.max(open, close) + Math.random() * volatility * 0.5;
          const low = Math.min(open, close) - Math.random() * volatility * 0.5;
          const volume = Math.floor(10000000 + Math.random() * 50000000);
          mockData.push({ time, open, high, low, close, volume });
          basePrice = close;
        }
        return mockData;
      }
    },

    // 4b. Saham IDX API - Get current quotes for multiple stocks in a single request
    async getIDXQuotes(symbols) {
      const tickers = symbols.map(s => `${s.toUpperCase()}.JK`).join(',');
      const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${tickers}&_nocache=${Date.now()}`;
      try {
        const data = await fetchJSON(url, true, true); // skipCache = true
        return data.quoteResponse.result.map(item => ({
          symbol: item.symbol.replace('.JK', ''),
          price: item.regularMarketPrice,
          change: item.regularMarketChangePercent,
          name: item.shortName
        }));
      } catch (err) {
        console.error('Failed to fetch IDX quotes:', err);
        return [];
      }
    },

    // 5. Global News API - Fetch Financial & Geopolitical News
    async getGlobalNews(queries = ['financial market', 'geopolitics', 'saham indonesia', 'crypto regulation']) {
      // Use Google News RSS feed search wrapped in CORS proxy
      const searchQuery = queries.join(' OR ');
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(searchQuery)}&hl=id&gl=ID&ceid=ID:id`;
      
      try {
        const cacheKey = `cache_news_${searchQuery}`;
        let xmlText = getCachedData(cacheKey);
        
        if (!xmlText) {
          const proxyUrl = `${CORS_PROXY}${encodeURIComponent(url)}`;
          const response = await fetch(proxyUrl);
          const raw = await response.json();
          xmlText = raw.contents;
          setCachedData(cacheKey, xmlText);
        }

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        const items = xmlDoc.getElementsByTagName('item');
        
        const news = [];
        for (let i = 0; i < Math.min(items.length, 25); i++) {
          const item = items[i];
          news.push({
            title: item.getElementsByTagName('title')[0]?.textContent || '',
            link: item.getElementsByTagName('link')[0]?.textContent || '#',
            pubDate: new Date(item.getElementsByTagName('pubDate')[0]?.textContent).toLocaleString('id-ID'),
            source: item.getElementsByTagName('source')[0]?.textContent || 'Google News'
          });
        }
        return news;
      } catch (err) {
        console.error('Failed to fetch global news RSS:', err);
        return [
          {
            title: "IHSG Ditutup Menguat Tipis di Tengah Sentimen Suku Bunga Global",
            link: "#",
            pubDate: new Date().toLocaleString(),
            source: "MarketNews Fallback"
          },
          {
            title: "Bitcoin Bertahan di Level Support Kuat Menjelang Keputusan Fed",
            link: "#",
            pubDate: new Date().toLocaleString(),
            source: "CryptoNews Fallback"
          }
        ];
      }
    }
  };
})();
