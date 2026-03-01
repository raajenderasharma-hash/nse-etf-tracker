const axios = require('axios');
const fs = require('fs');
const { create } = require('xmlbuilder2');

const API_KEY = process.env.SCRAPEOPS_API_KEY;

async function fetchNseData() {
    try {
        console.log("🚀 Attempting to bypass NSE wall with Headless Browser...");
        
        const response = await axios.get('https://proxy.scrapeops.io/v1/', {
            params: {
                'api_key': API_KEY,
                'url': 'https://www.nseindia.com/api/etf',
                'render_js': 'true',         //
                'residential': 'true',       //
                'country': 'in',             //
                'bypass': 'cloudflare_level_3', // Specific for high-security walls
                'wait_for': '.symbol',       // Wait for the data to actually load
                'json_response': 'true'      // Returns structured data to avoid parsing errors
            },
            timeout: 300000 // 5 minutes
        });

        // Parse the body correctly from the ScrapeOps JSON wrapper
        const rawBody = response.data.body;
        const jsonData = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;

        if (jsonData && jsonData.data && jsonData.data.length > 0) {
            saveToXml(jsonData.data, jsonData.timestamp);
            console.log(`✅ Success! ${jsonData.data.length} ETFs saved.`);
        } else {
            console.log("❌ Response was still empty. Check your dashboard for a Ban Page.");
            process.exit(1);
        }
    } catch (error) {
        console.error(`❌ Fatal Error: ${error.message}`);
        process.exit(1);
    }
}

function saveToXml(data, timestamp) {
    const root = create({ version: '1.0', encoding: 'UTF-8' }).ele('NSE_ETF_Data');
    root.ele('GeneratedAt').txt(timestamp || new Date().toLocaleString('en-IN')).up();

    data.forEach(item => {
        root.ele('ETF')
            .ele('Symbol').txt(item.symbol || 'N/A').up()
            .ele('LTP').txt(item.ltP || '0').up()
            .ele('PercentChange').txt(item.per || '0').up()
        .up();
    });

    fs.writeFileSync('nse_etf_data.xml', root.end({ prettyPrint: true }));
}

fetchNseData();
