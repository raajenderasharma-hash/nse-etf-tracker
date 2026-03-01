const axios = require('axios');
const fs = require('fs');
const { create } = require('xmlbuilder2');

// Access the key from GitHub Secrets
const SCRAPEOPS_API_KEY = process.env.SCRAPEOPS_API_KEY;

async function fetchWithScrapeOps() {
    if (!SCRAPEOPS_API_KEY) {
        console.error("❌ Error: SCRAPEOPS_API_KEY is missing.");
        process.exit(1);
    }

    try {
        console.log("Connecting to ScrapeOps with Ultra-Stealth settings...");
        const response = await axios.get('https://proxy.scrapeops.io/v1/', {
            params: {
                'api_key': SCRAPEOPS_API_KEY,
                'url': 'https://www.nseindia.com/api/etf',
                'render_js': 'true',      // Runs a real browser in the cloud
                'residential': 'true',    // Uses a home IP address, not a data center
                'country': 'in',          // Forces an Indian IP address
                'wait': '5000'            // Waits 5 seconds for NSE to "accept" the bot
            }
        });

        // ScrapeOps with render_js=true might return the data differently
        // If response.data.data exists, we use it. 
        if (response.data && response.data.data) {
            saveToXml(response.data.data, response.data.timestamp);
            console.log("✅ Success: Block bypassed!");
        } else {
            // Sometimes render_js returns the full JSON inside a string or body
            console.log("⚠️ Data structure unexpected. Log:", JSON.stringify(response.data).substring(0, 100));
        }
    } catch (error) {
        console.error(`❌ Still Blocked: ${error.message}`);
        console.log("Try checking your ScrapeOps dashboard to see if credits are being used.");
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
            .ele('Value_Cr').txt(item.trdVal ? (parseFloat(item.trdVal)/10000000).toFixed(2) : "0").up()
        .up();
    });

    fs.writeFileSync('nse_etf_data.xml', root.end({ prettyPrint: true }));
}

fetchWithScrapeOps();
