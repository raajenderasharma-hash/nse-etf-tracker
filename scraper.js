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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive',
    }
}));

async function fetchWithRetry() {
    try {
        console.log("Step 1: Visiting NSE Homepage to get cookies...");
        await client.get("https://www.nseindia.com/");
        
        // Wait 2 seconds to mimic human behavior
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log("Step 2: Fetching ETF API data...");
        const response = await client.get("https://www.nseindia.com/api/etf", {
            headers: {
                'Referer': 'https://www.nseindia.com/market-data/exchange-traded-funds-etf',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        if (response.data && response.data.data) {
            saveToXml(response.data.data, response.data.timestamp);
            console.log("✅ Success! XML generated.");
        } else {
            console.log("⚠️ No data found in response.");
        }
    } catch (error) {
        console.error(`❌ 403 Error: NSE is still blocking the request.`);
        console.error(`Tip: If this persists, GitHub's IP range might be temporarily blacklisted by NSE.`);
        process.exit(1);
    }
}

function saveToXml(dataList, timestamp) {
    const root = create({ version: '1.0', encoding: 'UTF-8' }).ele('NSE_ETF_Data');
    root.ele('GeneratedAt').txt(timestamp).up();

    dataList.forEach(item => {
        root.ele('ETF')
            .ele('Symbol').txt(item.symbol || '').up()
            .ele('LTP').txt(item.ltP || '0').up()
            .ele('PercentChange').txt(item.per || '0').up()
        .up();
    });

    fs.writeFileSync('nse_etf_data.xml', root.end({ prettyPrint: true }));
}

fetchWithRetry();
