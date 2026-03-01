const axios = require('axios');
const fs = require('fs');
const { create } = require('xmlbuilder2');

const API_KEY = process.env.SCRAPEOPS_API_KEY;

async function fetchNseData() {
    try {
        console.log("🚀 Fetching large dataset and converting to Custom XML...");
        
        const response = await axios.get('https://proxy.scrapeops.io/v1/', {
            params: {
                'api_key': API_KEY,
                'url': 'https://www.nseindia.com/api/etf',
                'render_js': 'true',
                'residential': 'true',
                'country': 'in',
                'bypass': 'cloudflare_level_3'
            },
            timeout: 300000 
        });

        let rawData = response.data;

        // --- STEP 1: CLEANING ---
        if (typeof rawData === 'string') {
            // Remove control characters (V-lines, etc)
            rawData = rawData.replace(/[\x00-\x1F\x7F-\x9F]/g, ""); 
            
            const firstBrace = rawData.indexOf('{');
            const lastBrace = rawData.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) {
                rawData = rawData.substring(firstBrace, lastBrace + 1);
            }
        }

        // --- STEP 2: PARSING ---
        const jsonData = (typeof rawData === 'string') ? JSON.parse(rawData) : rawData;

        if (jsonData && jsonData.data) {
            saveToXml(jsonData.data, jsonData.timestamp);
            console.log(`✅ Success! Generated XML for ${jsonData.data.length} ETFs.`);
        }
    } catch (error) {
        console.error(`❌ Fatal Error: ${error.message}`);
        process.exit(1);
    }
}

function saveToXml(dataList, timestamp) {
    const root = create({ version: '1.0', encoding: 'UTF-8' }).ele('NSE_ETF_Data');
    root.ele('GeneratedAt').txt(timestamp || "").up();

    dataList.forEach(item => {
        if (!item.symbol) return;

        // Calculate Value in Crores (trdVal / 10,000,000)
        const valCrores = item.trdVal ? (parseFloat(item.trdVal) / 10000000).toFixed(2) : "0.00";

        const etf = root.ele('ETF');
        etf.ele('Symbol').txt(item.symbol).up();
        etf.ele('Underlying').txt(item.meta?.companyName || "-").up();
        etf.ele('Asset').txt(item.assets || "-").up();
        etf.ele('Open').txt(item.open || "0").up();
        etf.ele('High').txt(item.high || "0").up();
        etf.ele('Low').txt(item.low || "0").up();
        etf.ele('PrevClose').txt(item.prevClose || "0").up();
        etf.ele('LTP').txt(item.ltP || "0").up();
        etf.ele('IndicativeClose').txt(item.stockIndClosePrice || "0").up();
        etf.ele('Change').txt(item.chn || "0").up();
        etf.ele('PercentChange').txt(item.per || "0").up();
        etf.ele('Volume').txt(item.qty || "0").up();
        etf.ele('Value_Crores').txt(valCrores).up();
        etf.ele('NAV').txt(item.nav || "-").up();
        etf.ele('High52W').txt(item.wkhi || "0").up();
        etf.ele('Low52W').txt(item.wklo || "0").up();
        etf.ele('Change30dPercent').txt(item.perChange30d || "0").up();
        etf.up();
    });

    // Write to file with pretty printing (indentation)
    fs.writeFileSync('nse_etf_data.xml', root.end({ prettyPrint: true }));
}

fetchNseData();
