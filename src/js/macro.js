/* C:\Users\surya\.gemini\antigravity\scratch\trademaster\src\js\macro.js */

window.TradeMasterMacro = (function() {

  // 1. DATABASE INDIKATOR MAKROEKONOMI GLOBAL & INDONESIA
  const macroIndicators = {
    global: [
      {
        id: 'fed_rate',
        name: 'Fed Funds Rate (FFR)',
        category: 'Kebijakan Moneter AS',
        currentVal: '5.25% - 5.50%',
        numericVal: 5.375,
        prevVal: '5.25% - 5.50%',
        change: '0.00% (Pause / Dovish Pivot Bias)',
        trend: 'neutral', // 'up', 'down', 'neutral'
        fomcProbCut: '72% Probabilitas Cut 25-50 bps di FOMC Q3/Q4',
        lastUpdated: '12 Sep 2026',
        btcImpact: {
          direction: 'Bullish (Transisi Cut)',
          score: +4,
          sensitivity: 'Sangat Tinggi (High)',
          explanation: 'Siklus pemangkasan suku bunga Fed menurunkan imbal hasil instrumen bebas risiko (T-Bills/Obligasi), mendorong likuiditas global mencari aset dengan pertumbuhan dan kelangkaan tinggi seperti Bitcoin (BTC).'
        },
        idxImpact: {
          direction: 'Bullish (Inflow Modal)',
          score: +4,
          sensitivity: 'Tinggi (High)',
          explanation: 'Penurunan FFR mempersempit yield gap antara AS dan RI, mengurangi tekanan capital outflow dari pasar saham domestik, dan memicu aliran dana asing (foreign net buy) masuk ke perbankan bluechip BEI.'
        }
      },
      {
        id: 'dxy',
        name: 'US Dollar Index (DXY)',
        category: 'Kekuatan Mata Uang Global',
        currentVal: '102.85',
        numericVal: 102.85,
        prevVal: '104.40',
        change: '-1.48% (Melemah)',
        trend: 'down',
        lastUpdated: 'Live',
        btcImpact: {
          direction: 'Bullish (Korelasi Negatif Kuat)',
          score: +4,
          sensitivity: 'Sangat Tinggi (High)',
          explanation: 'Bitcoin memiliki korelasi terbalik (inversely correlated r ≈ -0.72) dengan DXY. Pelemahan DXY menandakan depresiasi dolar, memicu apresiasi aset berdenominasi USD terutama BTC sebagai store-of-value.'
        },
        idxImpact: {
          direction: 'Bullish (Rupiah Menguat)',
          score: +3,
          sensitivity: 'Tinggi (High)',
          explanation: 'Pelemahan DXY mengurangi beban impor energi/bahan baku dan utang valas korporasi emiten BEI, sekaligus memperkuat kurs Rupiah sehingga minat investasi asing pada aset rupiah meningkat pesat.'
        }
      },
      {
        id: 'us10y',
        name: 'US 10-Year Treasury Yield',
        category: 'Risk-Free Benchmark Global',
        currentVal: '3.98%',
        numericVal: 3.98,
        prevVal: '4.28%',
        change: '-0.30% (Yield Turun)',
        trend: 'down',
        lastUpdated: 'Live',
        btcImpact: {
          direction: 'Bullish (Risk Appetite Naik)',
          score: +3,
          sensitivity: 'Tinggi (High)',
          explanation: 'Yield obligasi AS 10Y adalah "global discount rate". Saat yield US 10Y turun di bawah 4.00%, biaya modal global menurun drastis, memicu re-rating valuasi dan risk appetite institusional ke aset kripto.'
        },
        idxImpact: {
          direction: 'Bullish (Spread SBN Melebar)',
          score: +4,
          sensitivity: 'Tinggi (High)',
          explanation: 'Penurunan yield US 10Y membuat spread imbal hasil obligasi negara Indonesia (INDOGB 10Y) makin menarik bagi dana pensiun global, memperkuat stabilitas pasar modal domestik.'
        }
      },
      {
        id: 'us_cpi',
        name: 'US CPI (Inflasi Tahunan AS)',
        category: 'Inflasi & Daya Beli Global',
        currentVal: '2.80% YoY',
        numericVal: 2.80,
        prevVal: '2.95% YoY',
        change: '-0.15% (Disinflasi Berlanjut)',
        trend: 'down',
        lastUpdated: 'Agustus 2026',
        btcImpact: {
          direction: 'Bullish (Membuka Jalan Pelonggaran)',
          score: +3,
          sensitivity: 'Sedang-Tinggi (Medium-High)',
          explanation: 'Inflasi AS yang terus melandai mendekati target 2.0% memberikan lampu hijau bagi bank sentral untuk melonggarkan kebijakan moneter tanpa takut memicu spiral harga baru.'
        },
        idxImpact: {
          direction: 'Bullish (Kestabilan Makro Dunia)',
          score: +3,
          sensitivity: 'Sedang (Medium)',
          explanation: 'Disinflasi di AS menurunkan risiko stagflasi global, menstabilkan harga komoditas impor pangan dan membatasi volatilitas pasar finansial negara berkembang.'
        }
      },
      {
        id: 'global_m2',
        name: 'Global M2 Money Supply (Likuiditas Dunia)',
        category: 'Likuiditas Sistemik',
        currentVal: '$108.4 Triliun',
        numericVal: 108.4,
        prevVal: '$104.8 Triliun',
        change: '+$3.6 Triliun (+3.43% YoY)',
        trend: 'up',
        lastUpdated: 'Q3 2026',
        btcImpact: {
          direction: 'Super Bullish (Korelasi Historis 85%)',
          score: +5,
          sensitivity: 'Kritis (Critical Leading Indicator)',
          explanation: 'Pertumbuhan pasokan uang M2 global oleh Fed, ECB, PBOC, dan BOJ merupakan katalis fundamental terbesar bull run siklus 4 tahunan Bitcoin sepanjang sejarah.'
        },
        idxImpact: {
          direction: 'Bullish (Surplus Likuiditas Pasar)',
          score: +3,
          sensitivity: 'Tinggi (High)',
          explanation: 'Ekspansi likuiditas dunia mengalirkan limpahan likuiditas (excess liquidity) ke bursa saham regional Asia dan emerging markets termasuk Bursa Efek Indonesia.'
        }
      },
      {
        id: 'china_pboc',
        name: 'Stimulus Ekonomi China (PBOC RRR & Fiskal)',
        category: 'Permintaan Bahan Baku Global',
        currentVal: 'Pelonggaran Moneter Agresif',
        numericVal: 1,
        prevVal: 'Kebijakan Moderat',
        change: 'RRR Cut 50 bps + Stimulus Properti',
        trend: 'up',
        lastUpdated: 'Sep 2026',
        btcImpact: {
          direction: 'Netral - Agak Bullish',
          score: +2,
          sensitivity: 'Sedang (Medium)',
          explanation: 'Injeksi likuiditas likuid dari PBOC menyebar melalui pasar OTC Hong Kong dan meningkatkan likuiditas kripto di kawasan Asia Timur.'
        },
        idxImpact: {
          direction: 'Super Bullish untuk Saham Komoditas BEI',
          score: +5,
          sensitivity: 'Sangat Kritis (Sektor Energi & Logam)',
          explanation: 'China adalah mitra dagang terbesar RI. Stimulus ekonomi China mendongkrak konsumsi batubara (ADRO, PTBA), nikel (INCO, NCKL), dan tembaga/emas (AMMN, BRMS).'
        }
      }
    ],

    indonesia: [
      {
        id: 'bi_rate',
        name: 'BI-Rate (Bank Indonesia 7-Day RR)',
        category: 'Suku Bunga Acuan Domestik',
        currentVal: '6.25%',
        numericVal: 6.25,
        prevVal: '6.25%',
        change: '0 bps (Pro-Stability & Pro-Growth)',
        trend: 'neutral',
        lastUpdated: 'RDG BI Agustus 2026',
        btcImpact: {
          direction: 'Netral',
          score: 0,
          sensitivity: 'Rendah (Low)',
          explanation: 'Kebijakan suku bunga domestik BI tidak memiliki pengaruh langsung terhadap penentuan harga Bitcoin global yang berbasis di pasar USD/global.'
        },
        idxImpact: {
          direction: 'Katalis Kunci Perbankan & Properti',
          score: +2,
          sensitivity: 'Sangat Tinggi (High)',
          explanation: 'Suku bunga BI 6.25% menjaga stabilitas Rupiah dan imbal hasil SBN. Jika BI mulai memangkas suku bunga, emiten perbankan (BBCA, BBRI, BMRI) dan properti/otomotif akan mengalami lonjakan ekspansi kredit.'
        }
      },
      {
        id: 'usd_idr',
        name: 'Kurs USD/IDR (Rupiah)',
        category: 'Nilai Tukar Mata Uang',
        currentVal: 'Rp 16.140 / USD',
        numericVal: 16140,
        prevVal: 'Rp 16.380 / USD',
        change: '-Rp 240 (+1.46% Penguatan Rupiah)',
        trend: 'down', // down means USD drops, Rupiah strengthens
        lastUpdated: 'Live Spot',
        btcImpact: {
          direction: 'Netral - Bullish Transaksi IDR',
          score: +1,
          sensitivity: 'Rendah-Sedang',
          explanation: 'Fluktuasi kurs hanya mempengaruhi nilai konversi arbitrase BTC/IDR di bursa lokal (Indodax/Tokocrypto). Daya beli riil aset BTC tetap diukur dalam standar USD.'
        },
        idxImpact: {
          direction: 'Sangat Bullish untuk IHSG & Bank',
          score: +4,
          sensitivity: 'Kritis (Korelasi Signifikan Asing)',
          explanation: 'Rupiah yang menguat di bawah Rp 16.200 mengunci potensi currency gain bagi investor institusi global, memicu foreign net buy masif di saham berkapitalisasi besar (Big Caps).'
        }
      },
      {
        id: 'indo_cpi',
        name: 'Inflasi Indonesia (CPI BPS)',
        category: 'Inflasi Domestik',
        currentVal: '2.12% YoY',
        numericVal: 2.12,
        prevVal: '2.13% YoY',
        change: '-0.01% (Sangat Terkendali di Rentang Sasaran 2.5±1%)',
        trend: 'neutral',
        lastUpdated: 'BPS 1 September 2026',
        btcImpact: {
          direction: 'Netral',
          score: 0,
          sensitivity: 'Rendah',
          explanation: 'Dampak tidak signifikan terhadap dinamika suplai-permintaan Bitcoin global.'
        },
        idxImpact: {
          direction: 'Bullish (Konsumsi Domestik Solid)',
          score: +3,
          sensitivity: 'Sedang-Tinggi',
          explanation: 'Inflasi yang jinak menjaga daya beli masyarakat Indonesia (Purchasing Power), menguntungkan emiten konsumer (ICBP, INDF, AMRT) dan mencegah lonjakan biaya operasional korporasi.'
        }
      },
      {
        id: 'cadangan_devisa',
        name: 'Cadangan Devisa Bank Indonesia',
        category: 'Ketahanan Eksternal Moneter',
        currentVal: '$144.5 Miliar',
        numericVal: 144.5,
        prevVal: '$140.2 Miliar',
        change: '+$4.3 Miliar (Ekivalen 6.5 Bulan Impor)',
        trend: 'up',
        lastUpdated: 'Agustus 2026',
        btcImpact: {
          direction: 'Netral',
          score: 0,
          sensitivity: 'Rendah',
          explanation: 'Indikator ketahanan moneter nasional tanpa transmisi langsung ke kripto.'
        },
        idxImpact: {
          direction: 'Bullish (Amunisi Penjaga Stabilitas Finansial)',
          score: +3,
          sensitivity: 'Tinggi (Rating Sovereign)',
          explanation: 'Cadangan devisa di atas $144B memberikan bantalan aman bagi BI untuk melakukan intervensi pasar valas spot & DNDF, menjauhkan pasar modal dari ancaman krisis likuiditas dolar.'
        }
      },
      {
        id: 'yield_spread',
        name: 'Yield Spread (INDOGB 10Y vs US 10Y)',
        category: 'Daya Tarik Carry Trade SBN & Ekuitas',
        currentVal: '268 bps (6.66% vs 3.98%)',
        numericVal: 268,
        prevVal: '235 bps',
        change: '+33 bps (Daya Tarik Meningkat)',
        trend: 'up',
        lastUpdated: 'Live',
        btcImpact: {
          direction: 'Netral',
          score: 0,
          sensitivity: 'Rendah',
          explanation: 'Hanya mencerminkan premi risiko obligasi berdaulat Indonesia vs US Treasury.'
        },
        idxImpact: {
          direction: 'Super Bullish (Inflow Surat Utang & Saham)',
          score: +4,
          sensitivity: 'Tinggi (Korelasi Arus Modal Portofolio)',
          explanation: 'Spread di atas 250 bps memberikan insentif carry trade yang sangat menguntungkan bagi hedge fund dan manajer investasi global untuk menempatkan dana di pasar modal Indonesia.'
        }
      },
      {
        id: 'gdp_growth',
        name: 'Pertumbuhan Ekonomi RI (PDB YoY)',
        category: 'Aktivitas Makro Riil',
        currentVal: '5.05% YoY',
        numericVal: 5.05,
        prevVal: '5.11% YoY',
        change: 'Stabil di atas 5.0% (Konsumsi & Investasi Kuat)',
        trend: 'neutral',
        lastUpdated: 'BPS Q2 2026',
        btcImpact: {
          direction: 'Netral - Positif Adopsi Ritel',
          score: +1,
          sensitivity: 'Rendah',
          explanation: 'Pertumbuhan ekonomi yang stabil menumbuhkan kelas menengah Indonesia dengan surplus tabungan untuk investasi alternatif (kripto).'
        },
        idxImpact: {
          direction: 'Bullish (Earnings Growth Korporasi)',
          score: +3,
          sensitivity: 'Tinggi',
          explanation: 'PDB >5% menjamin pertumbuhan laba bersih (EPS growth) emiten BEI di kisaran 8-14% per tahun, mendukung penilaian fundamental jangka panjang IHSG.'
        }
      }
    ]
  };

  // 2. DATABASE ALIRAN DANA (CAPITAL & LIQUIDITY FUND FLOWS)
  const fundFlowData = {
    // 2a. BTC FUND FLOWS (Institusi, ETF, Stablecoins, On-Chain)
    btc: {
      etf: {
        dailyNetFlow: +248.5, // Juta USD (+248.5M)
        dailyFlowDate: '11 Sep 2026',
        weeklyNetFlow: +1145.2, // Juta USD
        totalCumulativeInflow: +18820.0, // Juta USD (Sejak Jan 2024)
        totalAumUsd: 63.4, // Miliar USD
        breakdownByIssuer: [
          { issuer: 'BlackRock (IBIT)', dailyFlow: +184.2, totalBtcHold: 362400, sharePct: 56.4 },
          { issuer: 'Fidelity (FBTC)', dailyFlow: +68.4, totalBtcHold: 184500, sharePct: 28.7 },
          { issuer: 'Bitwise (BITB)', dailyFlow: +12.1, totalBtcHold: 41200, sharePct: 6.4 },
          { issuer: 'ARK 21Shares (ARKB)', dailyFlow: +8.5, totalBtcHold: 48900, sharePct: 7.6 },
          { issuer: 'Grayscale (GBTC)', dailyFlow: -24.7, totalBtcHold: 219800, sharePct: -3.8 }
        ],
        signal: 'STRONG ACCUMULATION',
        analysis: 'Aliran dana ETF spot AS kembali mengalami net buy solid dipimpin oleh BlackRock IBIT (+ $184.2M). Aliran keluar dari Grayscale GBTC terus menyusut ke titik terendah. Penyerapan bersih institusi melampaui pasokan cetak harian Bitcoin baru pasca-Halving (450 BTC/hari) hingga 6x lipat.'
      },
      stablecoin: {
        totalMarketCap: 168.4, // Miliar USD
        monthlyNetChange: +4.2, // Miliar USD (+4.2B dalam 30 hari)
        usdtDominance: 71.2, // %
        usdcDominance: 21.8, // %
        signal: 'LIQUIDITY EXPANDING',
        analysis: 'Pasokan stablecoin global (USDT + USDC) bertambah +$4.2 Miliar dalam 30 hari terakhir. Ini adalah indikator leading bahwa modal fiat segar sedang disuntikkan ke ekosistem kripto dan siap dibelanjakan (dry powder liquidity).'
      },
      exchangeReserves: {
        totalBtcInExchanges: 2185000, // BTC
        dailyNetOutflow: -4820, // BTC keluar dari bursa (- = akumulasi ke cold storage)
        monthlyTrend: 'Outflow Bertahap (Supply Shock)',
        signal: 'SUPPLY SQUEEZE',
        analysis: 'Cadangan Bitcoin di seluruh bursa terpusat (Binance, Coinbase, Kraken) terus mencetak rekor terendah multi-tahun. Penarikan 4.820 BTC dalam 24 jam terakhir ke cold storage mengurangi likuiditas jual di pasar spot.'
      },
      derivatives: {
        cmeOpenInterestUsd: 11.2, // Miliar USD
        fundingRate: 0.0094, // % per 8 jam (Normal Positif)
        longShortRatio: 1.18, // 54.1% Longs
        signal: 'HEALTHY RISK-ON',
        analysis: 'Open Interest di bursa teregulasi CME Chicago bertahan di atas $11 Miliar dengan funding rate moderat dan sehat. Tidak terlihat tanda-tanda over-leveraged long squeeze, membuka ruang kenaikan harga berkelanjutan.'
      },
      onChainMultiples: {
        mvrvZScore: 2.14, // Rentang sehat: < 0.1 Bottom, > 6.0 Peak
        puellMultiple: 1.28,
        nupl: 0.54, // "Belief / Optimism"
        halvingProgressDays: 875, // Hari pasca Halving April 2024
        cyclePhase: 'Mid-Bull Expansion Phase'
      }
    },

    // 2b. SAHAM INDONESIA FUND FLOWS (Foreign Flow BEI, Broker Breakdown, Sektor)
    idx: {
      foreignFlow: {
        todayNet: +428.6, // Miliar IDR (Net Foreign Buy)
        todayDate: '11 Sep 2026',
        weekNet: +2480.0, // Miliar IDR
        monthToDate: +5820.0, // Miliar IDR
        yearToDate: +16450.0, // Miliar IDR (+16.45 Triliun)
        marketTypeBreakdown: {
          regularMarket: +382.4, // Miliar IDR (Pasar Reguler)
          negotiatedMarket: +46.2 // Miliar IDR (Pasar Nego/Tunai)
        },
        signal: 'STRONG FOREIGN INFLOW',
        analysis: 'Investor institusi asing mencatatkan akumulasi beli bersih (Net Foreign Buy) konsisten selama 4 hari beruntun, didorong oleh penguatan Rupiah dan ekspektasi penurunan suku bunga global. Aliran modal asing terkonsentrasi di sektor perbankan Big 4 dan komoditas nikel/tembaga.'
      },
      participationRate: {
        foreignVolumePct: 37.8, // %
        domesticRetailPct: 31.4, // %
        domesticInstPct: 30.8, // %
        trend: 'Dominasi Asing & Institusi Menguat'
      },
      topForeignStocks: [
        { symbol: 'BBCA', netBuyMiliar: +214.5, avgForeignPrice: 10250, signal: 'Akumulasi Asing Agresif' },
        { symbol: 'BMRI', netBuyMiliar: +142.8, avgForeignPrice: 6425, signal: 'Akumulasi Asing Agresif' },
        { symbol: 'AMMN', netBuyMiliar: +96.4, avgForeignPrice: 11550, signal: 'Inflow Asing Sektor Tembaga' },
        { symbol: 'BREN', netBuyMiliar: +78.2, avgForeignPrice: 8800, signal: 'Inflow Asing Indeks Global' },
        { symbol: 'BBRI', netBuyMiliar: -84.6, avgForeignPrice: 4470, signal: 'Net Sell Terbatas (Rotasi ke BMRI)' },
        { symbol: 'TLKM', netBuyMiliar: -42.1, avgForeignPrice: 2870, signal: 'Distribusi Tipis Asing' }
      ],
      brokerSummary: {
        topForeignBuyers: [
          { code: 'ZP', name: 'Maybank Sekuritas (Asing)', netVal: '+Rp 184M', action: 'Beli BBCA, BMRI' },
          { code: 'AK', name: 'UBS Sekuritas Indonesia', netVal: '+Rp 146M', action: 'Beli BMRI, AMMN' },
          { code: 'BK', name: 'J.P. Morgan Sekuritas', netVal: '+Rp 118M', action: 'Beli BBCA, BREN' },
          { code: 'RX', name: 'Macquarie Sekuritas', netVal: '+Rp 82M', action: 'Beli AMMN, BRMS' }
        ],
        topDomesticSellers: [
          { code: 'YP', name: 'Mirae Asset Sekuritas (Ritel)', netVal: '-Rp 162M', action: 'Ambil Profit di Big Banks' },
          { code: 'PD', name: 'Indo Premier Sekuritas (Ritel)', netVal: '-Rp 105M', action: 'Distribusi Saham Lapis 2' },
          { code: 'CC', name: 'Mandiri Sekuritas (Campuran)', netVal: '+Rp 45M', action: 'Net Beli Selektif SBN/Saham' }
        ]
      },
      bankingLiquidity: {
        dpkGrowthYoY: 7.8, // % Pertumbuhan Dana Pihak Ketiga
        creditGrowthYoY: 11.4, // % Pertumbuhan Kredit Sektor Riil
        ldrRatio: 86.2, // Loan-to-Deposit Ratio (Rentang Sehat 80-92%)
        signal: 'SOLID EXPANSION'
      }
    }
  };

  // 3. MATRIKS TRANSMISI DAMPAK MAKRO KE SEKTOR BEI & BTC
  const transmissionMatrix = [
    {
      macroFactor: 'Penurunan Fed Funds Rate (Dovish Pivot)',
      transmissionMechanism: 'Menurunkan imbal hasil obligasi AS -> Biaya modal turun -> Likuiditas global melimpah -> Capital flight kembali ke pasar berisiko (Risk-On).',
      btcEffect: {
        impact: 'SUPER BULLISH',
        score: +5,
        details: 'Lonjakan permintaan institusi & ETF, peningkatan valuasi Bitcoin sebagai aset langka anti-inflasi.'
      },
      idxEffect: {
        impact: 'BULLISH',
        score: +4,
        details: 'Foreign inflow masif ke Big Banks (BBCA, BBRI, BMRI, BBNI), IHSG terdorong menuju rekor tertinggi baru.'
      },
      bestSectorsIDX: ['Perbankan Big 4', 'Properti (BSDE, CTRA)', 'Teknologi (GOTO)']
    },
    {
      macroFactor: 'Pelemahan DXY (Dolar AS Turun di bawah 103)',
      transmissionMechanism: 'Depresiasi mata uang USD -> Penguatan nilai tukar mata uang lokal (Rupiah terapresiasi) -> Margin keuntungan importir meningkat.',
      btcEffect: {
        impact: 'BULLISH',
        score: +4,
        details: 'Aset berdenominasi USD (BTC/USDT) mengalami ekspansi harga signifikan karena pelemahan denominator.'
      },
      idxEffect: {
        impact: 'BULLISH',
        score: +4,
        details: 'Keuntungan valas bagi emiten berutang valas, memicu rasa aman bagi investor institusional global di BEI.'
      },
      bestSectorsIDX: ['Perbankan', 'Konsumer Ritel (ICBP, UNVR)', 'Telekomunikasi (TLKM)']
    },
    {
      macroFactor: 'Stimulus Moneter & Fiskal China (PBOC)',
      transmissionMechanism: 'Injeksi likuiditas PBOC mendongkrak aktivitas industri manufaktur dan konstruksi China -> Permintaan komoditas dunia melonjak pesat.',
      btcEffect: {
        impact: 'AGAK BULLISH',
        score: +2,
        details: 'Peningkatan likuiditas regional di Asia, volume perdagangan OTC Hong Kong meningkat.'
      },
      idxEffect: {
        impact: 'SUPER BULLISH',
        score: +5,
        details: 'Harga batubara, nikel, dan tembaga dunia terangkat naik, mendongkrak pendapatan emiten tambang RI.'
      },
      bestSectorsIDX: ['Batubara & Energi (ADRO, PTBA)', 'Nikel & Tembaga (AMMN, INCO, BRMS)']
    },
    {
      macroFactor: 'Pelemahan Rupiah Terhadap USD (USD/IDR > Rp 16.300)',
      transmissionMechanism: 'Dolar AS menguat tajam -> Tekanan depresiasi Rupiah -> Beban impor & inflasi imported naik -> Potensi kenaikan suku bunga BI.',
      btcEffect: {
        impact: 'HEDGE VALUE',
        score: +2,
        details: 'Nilai tukar BTC/IDR di bursa lokal melonjak otomatis sebagai instrumen lindung nilai (hedge) terhadap depresiasi Rupiah.'
      },
      idxEffect: {
        impact: 'BEARISH (Kecuali Komoditas)',
        score: -3,
        details: 'Capital outflow asing dari pasar obligasi dan saham domestik, membebani saham perbankan dan emiten utang valas tinggi.'
      },
      bestSectorsIDX: ['Eksportir Komoditas Murni (BUMI, ADRO)', 'Emas (ANTM, BRMS, MDKA)']
    },
    {
      macroFactor: 'Lonjakan Imbal Hasil US 10Y Treasury (> 4.30%)',
      transmissionMechanism: 'Bunga bebas risiko AS tinggi -> Investor global menarik dana dari saham & kripto ke US T-Bills -> Pengetatan kondisi likuiditas.',
      btcEffect: {
        impact: 'BEARISH',
        score: -4,
        details: 'Kompresi rasio valuasi aset digital, perlambatan inflow ke Spot Bitcoin ETF.'
      },
      idxEffect: {
        impact: 'BEARISH',
        score: -4,
        details: 'Penyempitan yield spread memicu penjualan bersih (net sell) investor asing di Surat Berharga Negara dan saham BEI.'
      },
      bestSectorsIDX: ['Saham Defensif Dividen Tinggi (BBCA, ASII)', 'Instrumen Pasar Uang Kas RDN']
    }
  ];

  // 4. KALENDER RILIS DATA MAKRO UTAMA (ECONOMIC CALENDAR 2026)
  const economicCalendar = [
    {
      date: '17-18 Sep 2026',
      time: '01:00 WIB',
      event: 'Keputusan Suku Bunga FOMC Fed & Dot Plot',
      country: 'USA',
      impactLevel: 'HIGH',
      forecast: '5.25% (Potensi Cut 25 bps)',
      previous: '5.50%',
      targetMarket: 'BTC & Saham BEI',
      bias: 'Bullish jika ada sinyal cut berkelanjutan'
    },
    {
      date: '19 Sep 2026',
      time: '14:30 WIB',
      event: 'Rapat Dewan Gubernur (RDG) Bank Indonesia',
      country: 'IDN',
      impactLevel: 'HIGH',
      forecast: '6.25% (Hold / Sinyal Dovish)',
      previous: '6.25%',
      targetMarket: 'Saham BEI & Kurs Rupiah',
      bias: 'Katalis penggerak indeks perbankan'
    },
    {
      date: '02 Okt 2026',
      time: '19:30 WIB',
      event: 'US Non-Farm Payrolls (NFP) & Unemployment Rate',
      country: 'USA',
      impactLevel: 'HIGH',
      forecast: '165K (Pengangguran 4.2%)',
      previous: '142K',
      targetMarket: 'BTC & Global FX',
      bias: 'Pasar tenaga kerja moderat = mendukung rate cut'
    },
    {
      date: '07 Okt 2026',
      time: '10:00 WIB',
      event: 'Rilis Cadangan Devisa RI Bulan September',
      country: 'IDN',
      impactLevel: 'MEDIUM',
      forecast: '$145.2 Miliar',
      previous: '$144.5 Miliar',
      targetMarket: 'Stabilitas Rupiah & SBN',
      bias: 'Peningkatan cadangan devisa menstabilkan IHSG'
    },
    {
      date: '10 Okt 2026',
      time: '19:30 WIB',
      event: 'US Consumer Price Index (CPI YoY)',
      country: 'USA',
      impactLevel: 'HIGH',
      forecast: '2.7% YoY',
      previous: '2.8% YoY',
      targetMarket: 'BTC & Seluruh Aset Risiko',
      bias: 'Penurunan inflasi mempercepat pelonggaran likuiditas'
    }
  ];

  // 5. METODE HITUNG REZIM MAKRO (MACRO REGIME CLASSIFIER)
  function evaluateMacroRegime() {
    let liquidityScore = 0;
    
    if (macroIndicators.global.find(i => i.id === 'dxy').numericVal < 103.5) liquidityScore += 2;
    if (macroIndicators.global.find(i => i.id === 'us10y').numericVal < 4.10) liquidityScore += 2;
    if (macroIndicators.global.find(i => i.id === 'global_m2').numericVal > 105) liquidityScore += 2;
    if (fundFlowData.btc.etf.dailyNetFlow > 0) liquidityScore += 2;
    if (fundFlowData.idx.foreignFlow.todayNet > 0) liquidityScore += 2;

    let regime = {
      name: 'RISK-ON LIQUIDITY EXPANSION',
      code: 'GOLDILOCKS_EXPANSION',
      badgeClass: 'badge-success',
      score: liquidityScore,
      summary: 'Rezim Makro saat ini berada dalam fase <b>Pelonggaran Likuiditas & Pertumbuhan Stabil (Goldilocks Expansion)</b>. Pelemahan DXY, tren penurunan imbal hasil US 10-Year, serta masifnya inflow modal institusi asing ke ETF Bitcoin dan Saham Indonesia menciptakan lingkungan optimal bagi apresiasi aset berisiko.',
      btcOutlook: 'BULLISH ACCUMULATION (Target Uji All-Time High)',
      idxOutlook: 'BULLISH EXPANSION (IHSG Menuju 7.400+ Ditopang Foreign Net Buy)',
      recommendedAllocation: {
        crypto: '35% (Prioritas BTC & Bluechip Layer-1)',
        idxStocks: '45% (Prioritas Big 4 Bank & Komoditas Logam)',
        cashOrBonds: '20% (Likuiditas & SBN Yield Prima)'
      }
    };

    if (liquidityScore < 4) {
      regime.name = 'DEFENSIVE TIGHTENING / RISK-OFF';
      regime.code = 'RISK_OFF';
      regime.badgeClass = 'badge-danger';
      regime.summary = 'Kondisi makro global dalam tekanan likuiditas ketat. Dolar AS menguat dan imbal hasil obligasi tinggi menekan selera risiko.';
      regime.btcOutlook = 'DEFENSIVE / RANGE-BOUND';
      regime.idxOutlook = 'KONSOLIDASI DENGAN TEKANAN JUAL ASING';
      regime.recommendedAllocation = {
        crypto: '15%',
        idxStocks: '30%',
        cashOrBonds: '55%'
      };
    } else if (liquidityScore <= 7) {
      regime.name = 'BALANCED ACCUMULATION / TRANSITION';
      regime.code = 'BALANCED';
      regime.badgeClass = 'badge-warning';
      regime.summary = 'Kondisi makro dalam fase transisi netral. Peluang akumulasi bertahap di level support kunci.';
      regime.btcOutlook = 'MODERATE BULLISH (DCA Terjadwal)';
      regime.idxOutlook = 'SELEKTIF ROTASI SEKTORAL';
      regime.recommendedAllocation = {
        crypto: '25%',
        idxStocks: '40%',
        cashOrBonds: '35%'
      };
    }

    return regime;
  }

  // 6. SIMULATOR SKENARIO MAKRO (WHAT-IF SIMULATOR ENGINE)
  function simulateScenario(scenarioConfig) {
    let btcScore = 0;
    let idxScore = 0;
    let reasoning = [];

    // Fed Action
    if (scenarioConfig.fedAction === 'cut50') {
      btcScore += 5;
      idxScore += 4;
      reasoning.push('Fed pangkas 50 bps: Likuiditas melimpah, biaya pinjaman global ambruk, memicu ledakan bull run di BTC dan aliran modal ke bursa berkembang.');
    } else if (scenarioConfig.fedAction === 'cut25') {
      btcScore += 3;
      idxScore += 3;
      reasoning.push('Fed pangkas 25 bps: Penyesuaian terukur menopang sentimen pasar finansial secara konsisten.');
    } else if (scenarioConfig.fedAction === 'hold') {
      btcScore += 0;
      idxScore += 0;
      reasoning.push('Fed menahan suku bunga: Pasar bergerak sesuai siklus earnings dan teknikal lokal.');
    } else if (scenarioConfig.fedAction === 'hike') {
      btcScore -= 4;
      idxScore -= 4;
      reasoning.push('Fed menaikkan suku bunga mengejutkan: Likuiditas mengetat darurat, aksi jual di semua aset berisiko.');
    }

    // DXY Trend
    if (scenarioConfig.dxyTrend === 'weak') {
      btcScore += 3;
      idxScore += 3;
      reasoning.push('DXY melemah: Denominasi USD terdiskon, daya beli aset kripto dan mata uang negara berkembang melompat.');
    } else {
      btcScore -= 3;
      idxScore -= 3;
      reasoning.push('DXY menguat: Investor global mengunci dana ke cash USD, memicu capital flight dari IHSG dan koreksi BTC.');
    }

    // Kurs Rupiah
    if (scenarioConfig.idrTrend === 'strong') {
      idxScore += 3;
      btcScore += 1;
      reasoning.push('Rupiah menguat (< Rp 16.000): Mengunci keuntungan nilai tukar investor asing di BEI, menopang valuasi saham perbankan.');
    } else {
      idxScore -= 3;
      btcScore += 1; // BTC hedge
      reasoning.push('Rupiah melemah (> Rp 16.400): Menekan sentimen IHSG, namun mendorong minat masyarakat memegang BTC sebagai lindung nilai nilai tukar.');
    }

    // ETF Spot Inflow
    if (scenarioConfig.etfFlow === 'inflow') {
      btcScore += 4;
      reasoning.push('US Spot ETF net inflow tinggi (> $200M/hari): Penyerapan suplai institusi jauh melampaui produksi harian penambang BTC.');
    } else {
      btcScore -= 3;
      reasoning.push('US Spot ETF net outflow: Tekanan jual institusi menguji level support psikologis BTC.');
    }

    // Foreign Flow BEI
    if (scenarioConfig.foreignBei === 'inflow') {
      idxScore += 4;
      reasoning.push('Investor asing Net Buy di BEI (> Rp 500M/hari): Penggerak utama likuiditas saham Big 4 Banks dan pengangkat IHSG.');
    } else {
      idxScore -= 4;
      reasoning.push('Investor asing Net Sell di BEI: Tekanan likuiditas pada saham bluechip berbobot indeks besar.');
    }

    // Tentukan rekomendasi
    let btcRating = btcScore >= 6 ? 'STRONG BUY / EXPANSION' : btcScore >= 2 ? 'ACCUMULATE / BUY DIP' : btcScore <= -3 ? 'DEFENSIVE / REDUCE RISK' : 'HOLD / WAIT-AND-SEE';
    let idxRating = idxScore >= 6 ? 'STRONG BUY / AGGRESSIVE' : idxScore >= 2 ? 'ACCUMULATE BLUECHIP' : idxScore <= -3 ? 'PROFIT TAKING / DEFENSIVE' : 'HOLD / SELECTIVE';

    return {
      compositeBtcScore: btcScore,
      compositeIdxScore: idxScore,
      btcRating,
      idxRating,
      reasoning
    };
  }

  // Public Interface
  return {
    getMacroIndicators: () => macroIndicators,
    getFundFlowData: () => fundFlowData,
    getTransmissionMatrix: () => transmissionMatrix,
    getEconomicCalendar: () => economicCalendar,
    evaluateMacroRegime,
    simulateScenario
  };
})();
