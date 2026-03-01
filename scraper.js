const axios = require('axios');
const fs = require('fs');
const { create } = require('xmlbuilder2');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');

const jar = new CookieJar();
const client = wrapper(axios.create({ 
    jar, 
    withCredentials: true,
    timeout: 30000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Connection': 'keep-alive',
    }
}));

async function fetchETFData() {
    try {
        console.log("Initializing session...");
        await client.get("https://www.nseindia.com/");
        await new Promise(res => setTimeout(res, 3000)); // Wait for cookies

        console.log("Fetching API Data...");
        const response = await client.get("https://www.nseindia.com/api/etf", {
            headers: { 'Referer': 'https://www.nseindia.com/market-data/exchange-traded-funds-etf' }
        });

        if (response.data && response.data.data) {
            saveToXml(response.data.data, response.data.timestamp);
            console.log("✅ Success: Data saved.");
        }
    } catch (error) {
        console.error(`❌ Failed: ${error.message}`);
        process.exit(1); // Tell GitHub Action it failed
    }
}

function saveToXml(dataList, timestamp) {
    const root = create({ version: '1.0', encoding: 'UTF-8' }).ele('NSE_ETF_Data');
    root.ele('GeneratedAt').txt(timestamp).up();

    dataList.forEach(item => {
        const valInCr = item.trdVal ? (parseFloat(item.trdVal) / 10000000).toFixed(2) : "0";
        root.ele('ETF')
            .ele('Symbol').txt(item.symbol || '').up()
            .ele('LTP').txt(item.ltP || '0').up()
            .ele('Change').txt(item.chn || '0').up()
            .ele('PercentChange').txt(item.per || '0').up()
            .ele('Value_Crores').txt(valInCr).up()
        .up();
    });

    fs.writeFileSync('nse_etf_data.xml', root.end({ prettyPrint: true }));
}

fetchETFData();
