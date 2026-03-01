const axios = require('axios');
const fs = require('fs');
const { create } = require('xmlbuilder2');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');

const jar = new CookieJar();
const client = wrapper(axios.create({ 
    jar, 
    withCredentials: true,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.nseindia.com/',
        'Connection': 'keep-alive'
    }
}));

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function fetchSurgeData() {
    try {
        console.log(`[${new Date().toLocaleTimeString()}] Initializing NSE Session...`);
        
        // Human mimicry: Home -> Market Page -> API
        await client.get("https://www.nseindia.com/");
        await sleep(2000 + Math.random() * 1000);
        
        const response = await client.get("https://www.nseindia.com/api/etf", {
            headers: { 'Referer': 'https://www.nseindia.com/market-data/exchange-traded-funds-etf' }
        });

        if (response.data && response.data.data) {
            // Filter for Surge: Change > 0
            const surgeItems = response.data.data.filter(item => parseFloat(item.per) > 0);
            
            // Sort: Highest % Change first
            surgeItems.sort((a, b) => parseFloat(b.per) - parseFloat(a.per));

            // Generate XML with your EXACT tags
            const root = create({ version: '1.0', encoding: 'UTF-8' }).ele('SurgeData');
            
            surgeItems.forEach(item => {
                const valInCr = item.trdVal ? (parseFloat(item.trdVal) / 10000000).toFixed(2) : "0";

                root.ele('ETF')
                    .ele('Symbol').txt(item.symbol || '').up()
                    .ele('Underlying').txt(item.meta?.companyName || 'N/A').up()
                    .ele('Asset').txt(item.assets || '').up()
                    .ele('Open').txt(item.open || '0').up()
                    .ele('High').txt(item.high || '0').up()
                    .ele('Low').txt(item.low || '0').up()
                    .ele('PrevClose').txt(item.prevClose || '0').up()
                    .ele('LTP').txt(item.ltP || '0').up()
                    .ele('IndicativeClose').txt(item.stockIndClosePrice || '0').up()
                    .ele('Change').txt(item.chn || '0').up()
                    .ele('PercentChange').txt(item.per || '0').up()
                    .ele('Volume').txt(item.qty || '0').up()
                    .ele('Value_Crores').txt(valInCr).up()
                    .ele('NAV').txt(item.nav || '-').up()
                    .ele('High52W').txt(item.wkhi || '0').up()
                    .ele('Low52W').txt(item.wklo || '0').up()
                    .ele('Change30dPercent').txt(item.perChange30d || '0').up()
                .up();
            });

            fs.writeFileSync('surge.xml', root.end({ prettyPrint: true }));
            console.log(`✔️ surge.xml updated with ${surgeItems.length} records.`);
        }
    } catch (error) {
        console.error("❌ Access Denied (403). Retrying in next cycle.");
    }

    // Dynamic Timer: At least 5 minutes (300,000ms) + random jitter (0-2 mins)
    const nextInterval = 300000 + Math.floor(Math.random() * 120000);
    console.log(`Next check in ${Math.floor(nextInterval / 60000)}m ${Math.floor((nextInterval % 60000) / 1000)}s...`);
    setTimeout(fetchSurgeData, nextInterval);
}

// Start
fetchSurgeData();
