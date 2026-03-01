const axios = require('axios');
const fs = require('fs');
const { create } = require('xmlbuilder2');

const API_KEY = process.env.SCRAPEOPS_API_KEY;

async function fetchNseData() {
    try {
        console.log("🚀 Initializing Ultra-Bypass Mode (Level 3)...");
        
        const response = await axios.get('https://proxy.scrapeops.io/v1/', {
            params: {
                'api_key': API_KEY,
                'url': 'https://www.nseindia.com/api/etf',
                'render_js': 'true',
                'residential': 'true',
                'country': 'in',
                'bypass': 'cloudflare_level_3', // Specific for NSE/Akamai walls
                'wait': '25000',                // Wait 25s for the wall to "thaw"
            },
            timeout: 240000 // 4 minute global timeout
        });

        // Validation logic
        if (response.data && response.data.data) {
            const etfData = response.data.data;
            saveToXml(etfData, response.data.timestamp);
            console.log(`✅ Success! Bypassed the wall. ${etfData.length} ETFs captured.`);
        } else {
            console.error("❌ NSE sent a response, but it was empty. Check ScrapeOps dashboard.");
            process.exit(1);
        }
    } catch (error) {
        console.error(`❌ Final Error: ${error.message}`);
        process.exit(1);
    }
}

function saveToXml(data, timestamp) {
    const root = create({ version: '1.0', encoding: 'UTF-8' }).ele('NSE_ETF_Data');
    root.ele('GeneratedAt').txt(timestamp || new Date().toLocaleString()).up();

    data.forEach(item => {
        root.ele('ETF')
            .ele('Symbol').txt(item.symbol || 'N/A').up()
            .ele('LTP').txt(item.ltP || '0').up()
            .ele('Change').txt(item.per || '0').up()
        .up();
    });

    fs.writeFileSync('nse_etf_data.xml', root.end({ prettyPrint: true }));
}

fetchNseData();
