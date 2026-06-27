/* C:\Users\surya\.gemini\antigravity\scratch\trademaster\src\js\impact.js */

window.TradeMasterImpact = (function() {
  
  // Keyword rules for geopolitical, economic, regulatory, and technological events
  const RULES = [
    {
      keywords: ['fed', 'interest rate', 'suku bunga', 'rate hike', 'fomc', 'inflation', 'inflasi', 'cpi'],
      name: 'Kebijakan Moneter & Suku Bunga (Fed)',
      category: 'Makroekonomi',
      analyze: (title) => {
        const text = title.toLowerCase();
        const isHikeOrHigh = text.includes('hike') || text.includes('naik') || text.includes('tinggi') || text.includes('tighten') || text.includes('hawkish');
        const isCutOrLow = text.includes('cut') || text.includes('turun') || text.includes('longgar') || text.includes('dovish') || text.includes('lower');
        
        if (isHikeOrHigh) {
          return {
            sentiment: 'Bearish',
            cryptoScore: -4,
            stockScore: -3,
            goldScore: +2,
            analysis: 'Suku bunga tinggi atau inflasi tinggi meningkatkan daya tarik obligasi/USD, menekan aset berisiko seperti Crypto dan Saham karena likuiditas mengetat.',
            strategy: 'Hedge ke USD/Obligasi, kurangi eksposur di Saham Growth dan Altcoins. Akumulasi bertahap di level support kuat.'
          };
        } else if (isCutOrLow) {
          return {
            sentiment: 'Bullish',
            cryptoScore: +5,
            stockScore: +4,
            goldScore: +3,
            analysis: 'Penurunan suku bunga Fed menyuntikkan likuiditas baru ke pasar finansial global. Aset berisiko (Crypto) & pasar negara berkembang (IHSG) biasanya melonjak.',
            strategy: 'Aggressive Buy Crypto (BTC/ETH) & Saham Bluechip (Perbankan/Consumer) untuk memanfaatkan aliran dana asing (foreign flow).'
          };
        }
        
        return {
          sentiment: 'Neutral',
          cryptoScore: 0,
          stockScore: 0,
          goldScore: 0,
          analysis: 'Spekulasi kebijakan moneter Fed masih berlanjut. Pasar dalam kondisi wait-and-see.',
          strategy: 'Jaga rasio kas 30-40%. Tunggu rilis data resmi inflasi (CPI) sebelum mengambil posisi besar.'
        };
      }
    },
    {
      keywords: ['perang', 'war', 'konflik', 'geopolitik', 'military', 'invasi', 'serangan', 'geopolitical', 'tensi'],
      name: 'Ketegangan Geopolitik & Konflik',
      category: 'Geopolitik',
      analyze: (title) => {
        return {
          sentiment: 'Risk-Off',
          cryptoScore: -2,
          stockScore: -4,
          goldScore: +5,
          analysis: 'Ketegangan militer memicu kepanikan pasar global. Investor keluar dari aset berisiko (IHSG & Crypto) menuju aset aman (Safe Haven) seperti Emas dan minyak mentah.',
          strategy: 'Beli Emas (Gold) atau reksa dana komoditas. Kurangi portofolio saham jangka pendek. Untuk Crypto, tunggu panik mereda lalu buy limit BTC.'
        };
      }
    },
    {
      keywords: ['sec', 'etf', 'regulation', 'regulasi', 'tuntut', 'lawsuit', 'crypto ban', 'crypto legal', 'halving'],
      name: 'Regulasi Kripto & Sentimen Industri',
      category: 'Regulasi',
      analyze: (title) => {
        const text = title.toLowerCase();
        const isPositive = text.includes('etf') || text.includes('legal') || text.includes('approve') || text.includes('win') || text.includes('halving') || text.includes('lolos');
        const isNegative = text.includes('ban') || text.includes('tuntut') || text.includes('block') || text.includes('lawsuit') || text.includes('illegal') || text.includes('hack');
        
        if (isPositive) {
          return {
            sentiment: 'Bullish',
            cryptoScore: +5,
            stockScore: +1,
            goldScore: -1,
            analysis: 'Adopsi institusi yang didorong oleh regulasi ramah (seperti ETF) atau sentimen Halving memperkuat fundamental jangka panjang Crypto.',
            strategy: 'Porsi portofolio dialihkan lebih banyak ke Crypto utama (BTC/SOL). HOLD saham IDX, manfaatkan momentum saham teknologi terkait.'
          };
        } else if (isNegative) {
          return {
            sentiment: 'Bearish',
            cryptoScore: -5,
            stockScore: -1,
            goldScore: +2,
            analysis: 'Tindakan tegas regulator (SEC) atau pelarangan transaksi memicu kepanikan penjualan (FUD) di pasar kripto. Dampak ke saham relatif minimal.',
            strategy: 'Amankan profit Altcoins ke stablecoins (USDT/USDC). Tunggu regulasi mereda sebelum serok bawah (buy the dip).'
          };
        }
        
        return {
          sentiment: 'Neutral',
          cryptoScore: 0,
          stockScore: 0,
          goldScore: 0,
          analysis: 'Perkembangan regulasi crypto sedang dimonitor ketat oleh pelaku pasar global.',
          strategy: 'Fokus ke aset berkapitalisasi besar (BTC) yang lebih kebal dari isu regulasi lokal.'
        };
      }
    },
    {
      keywords: ['rupiah', 'dollar', 'usd', 'idr', 'depresiasi', 'pelemahan', 'menguat', 'nilai tukar'],
      name: 'Fluktuasi Nilai Tukar (USD/IDR)',
      category: 'Mata Uang',
      analyze: (title) => {
        const text = title.toLowerCase();
        const isRupiahWeak = text.includes('lemah') || text.includes('depresiasi') || text.includes('tembus') || text.includes('amblas');
        const isRupiahStrong = text.includes('kuat') || text.includes('apresiasi') || text.includes('turun ke');
        
        if (isRupiahWeak) {
          return {
            sentiment: 'Bearish for IDX',
            cryptoScore: +1,
            stockScore: -3,
            goldScore: +3,
            analysis: 'Pelemahan Rupiah terhadap USD mendorong capital outflow dari pasar saham Indonesia (IHSG). Namun, nilai aset Crypto (yang dihargai USD) & Emas akan terapresiasi secara domestik.',
            strategy: 'Pesan jual untuk saham sensitif utang USD. Akumulasi saham komoditas berorientasi ekspor (Bumi, Adaro, dll). Kripto aman disimpan.'
          };
        } else if (isRupiahStrong) {
          return {
            sentiment: 'Bullish for IDX',
            cryptoScore: -1,
            stockScore: +4,
            goldScore: -2,
            analysis: 'Rupiah menguat mencerminkan kepercayaan investor asing pada ekonomi domestik, memicu aliran modal masuk ke perbankan dan saham bluechip Indonesia.',
            strategy: 'Beli Saham Perbankan Big Caps (BBCA, BBRI, BMRI). Kurangi porsi cash USD Anda.'
          };
        }
        
        return {
          sentiment: 'Neutral',
          cryptoScore: 0,
          stockScore: 0,
          goldScore: 0,
          analysis: 'Nilai tukar Rupiah berfluktuasi wajar. Sentimen regional mendominasi pergerakan IHSG.',
          strategy: 'Tetap pada alokasi reguler.'
        };
      }
    },
    {
      keywords: ['china', 'stimulus', 'ekonomi', 'komoditas', 'batubara', 'coal', 'nickel', 'nikel', 'minyak', 'oil'],
      name: 'Sentimen Ekonomi Tiongkok & Komoditas',
      category: 'Komoditas',
      analyze: (title) => {
        const text = title.toLowerCase();
        const isPositive = text.includes('stimulus') || text.includes('tumbuh') || text.includes('naik') || text.includes('pulih') || text.includes('booming');
        
        if (isPositive) {
          return {
            sentiment: 'Bullish for Commodities',
            cryptoScore: +2,
            stockScore: +4,
            goldScore: +1,
            analysis: 'Kebangkitan ekonomi China meningkatkan permintaan bahan baku global. Indonesia sebagai eksportir komoditas utama (Batubara, Nikel, CPO) akan diuntungkan.',
            strategy: 'Beli Saham Komoditas & Energi (ADRO, PTBA, ANTM, INCO). Sektor pertambangan berpotensi rally kuat.'
          };
        }
        
        return {
          sentiment: 'Neutral',
          cryptoScore: 0,
          stockScore: +1,
          goldScore: 0,
          analysis: 'Pergerakan harga komoditas global bergerak dinamis mengikuti pola supply-demand regional.',
          strategy: 'Trading cepat di saham komoditas berbasis volatilitas harga harian acuan dunia.'
        };
      }
    }
  ];

  return {
    // Analyze a single news headline/item and return impact score and commentary
    analyzeNewsItem(newsItem) {
      const title = newsItem.title;
      const textToScan = title.toLowerCase();
      
      // Find matching rule
      let matchedRule = null;
      for (const rule of RULES) {
        if (rule.keywords.some(keyword => textToScan.includes(keyword))) {
          matchedRule = rule;
          break;
        }
      }

      // Default fallback return if no specific rule matched
      if (!matchedRule) {
        return {
          title: title,
          pubDate: newsItem.pubDate,
          source: newsItem.source,
          link: newsItem.link,
          name: 'Isu Global Umum',
          category: 'Ekonomi Global',
          sentiment: 'Neutral',
          cryptoScore: 0,
          stockScore: 0,
          goldScore: 0,
          analysis: 'Berita ekonomi umum global. Tidak menunjukkan korelasi langsung atau dampak yang signifikan terhadap volatilitas harga jangka pendek.',
          strategy: 'Lanjutkan strategi trading teknikal reguler Anda tanpa penyesuaian khusus.'
        };
      }

      const analysisResult = matchedRule.analyze(title);
      return {
        title: title,
        pubDate: newsItem.pubDate,
        source: newsItem.source,
        link: newsItem.link,
        name: matchedRule.name,
        category: matchedRule.category,
        ...analysisResult
      };
    },

    // Analyze a list of news items and compile an aggregate market sentiment scorecard
    compileGlobalSentiment(analyzedNewsList) {
      if (!analyzedNewsList || analyzedNewsList.length === 0) {
        return { cryptoSentiment: 'NEUTRAL', stockSentiment: 'NEUTRAL', cryptoScore: 0, stockScore: 0 };
      }

      let totalCrypto = 0;
      let totalStock = 0;
      let countedItems = 0;

      analyzedNewsList.forEach(item => {
        // We only average items that aren't fully neutral (score !== 0) to highlight active impacts
        if (item.cryptoScore !== 0 || item.stockScore !== 0) {
          totalCrypto += item.cryptoScore;
          totalStock += item.stockScore;
          countedItems++;
        }
      });

      if (countedItems === 0) {
        return {
          cryptoSentiment: 'NEUTRAL',
          stockSentiment: 'NEUTRAL',
          cryptoScore: 0,
          stockScore: 0,
          summary: 'Kondisi isu geopolitik & makroekonomi cenderung stabil dan tenang. Pasar didominasi oleh pergerakan teknikal murni.'
        };
      }

      const avgCrypto = totalCrypto / countedItems;
      const avgStock = totalStock / countedItems;

      let cryptoSentiment = 'NEUTRAL';
      if (avgCrypto >= 2.0) cryptoSentiment = 'STRONG BULLISH';
      else if (avgCrypto >= 0.5) cryptoSentiment = 'BULLISH';
      else if (avgCrypto <= -2.0) cryptoSentiment = 'STRONG BEARISH';
      else if (avgCrypto <= -0.5) cryptoSentiment = 'BEARISH';

      let stockSentiment = 'NEUTRAL';
      if (avgStock >= 2.0) stockSentiment = 'STRONG BULLISH';
      else if (avgStock >= 0.5) stockSentiment = 'BULLISH';
      else if (avgStock <= -2.0) stockSentiment = 'STRONG BEARISH';
      else if (avgStock <= -0.5) stockSentiment = 'BEARISH';

      let summary = '';
      if (avgCrypto < -1 && avgStock < -1) {
        summary = '⚠️ Peringatan Risiko: Tensi geopolitik/ekonomi memburuk. Mode "Risk-Off" aktif. Disarankan untuk memegang kas lebih besar.';
      } else if (avgCrypto > 1 && avgStock > 1) {
        summary = '🚀 Sentimen Positif: Kebijakan global/regional mendukung pertumbuhan pasar modal & crypto. Peluang "Risk-On" akumulasi aktif.';
      } else {
        summary = '⚖️ Sentimen Campuran: Ada divergensi pergerakan antara instrumen Crypto dan Saham lokal Indonesia. Lakukan alokasi selektif.';
      }

      return {
        cryptoSentiment,
        stockSentiment,
        cryptoScore: Math.round(avgCrypto * 10) / 10,
        stockScore: Math.round(avgStock * 10) / 10,
        summary
      };
    }
  };
})();
