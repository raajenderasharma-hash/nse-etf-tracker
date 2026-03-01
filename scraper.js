const axios = require('axios');
const fs = require('fs');
const { create } = require('xmlbuilder2');

const API_KEY = process.env.SCRAPEOPS_API_KEY;

async function runScraper() {
    if (!API_KEY) {
        console.error("❌ SCRAPEOPS_API_KEY is missing from GitHub Secrets.");
        process.exit(1);
    }

    try {
        console.log("🚀 Launching Headless Browser via ScrapeOps...");
        
        const response = await axios.get('https://proxy.scrapeops.io/v1/', {
            params: {
                'api_key': API_KEY,
                'url': 'https://www.nseindia.com/api/etf',
                'render_js': 'true',      // Runs Chrome to solve security challenges
                'residential': 'true',    // Uses a home internet IP in India
                'country': 'in',          // Mandatory for NSE access
                'wait': '10000'           // Waits 10s for the page to fully authorize
            },
            timeout: 120000 // 2 minute timeout for the cloud browser
        });

        // The API returns the JSON directly inside response.data
        const etfData = response.data.data;

        if (etfData && Array.isArray(etfData)) {
            generateXML(etfData, response.data.timestamp);
            console.log(`✅ Success! Data for ${etfData.length} ETFs captured.`);
        } else {
            throw new Error("Received empty or invalid data format from NSE.");
        }
    } catch (error) {
        console.error(`❌ Final Error: ${error.message}`);
        process.exit(1);
    }
}

function generateXML(data, timestamp) {
    const root = create({ version: '1.0', encoding: 'UTF-8' }).ele('NSE_ETF_Data');
    root.ele('GeneratedAt').txt(timestamp || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })).up();

    data.forEach(item => {
        root.ele('ETF')
            .ele('Symbol').txt(item.symbol || 'N/A').up()
            .ele('LTP').txt(item.ltP || '0').up()
            .ele('Change').txt(item.chn || '0').up()
            .ele('PercentChange').txt(item.per || '0').up()
            .ele('Volume').txt(item.trdQty || '0').up()
        .up();
    });

    fs.writeFileSync('nse_etf_data.xml', root.end({ prettyPrint: true }));
}

runScraper();
