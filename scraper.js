const axios = require('axios');
const fs = require('fs');
const { create } = require('xmlbuilder2');

// Access the key from GitHub Secrets
const SCRAPEOPS_API_KEY = process.env.SCRAPEOPS_API_KEY;

async function fetchWithScrapeOps() {
    if (!SCRAPEOPS_API_KEY) {
        console.error("❌ Error: SCRAPEOPS_API_KEY is missing from environment variables.");
        process.exit(1);
    }

    try {
        console.log("Connecting to ScrapeOps Proxy...");
        const response = await axios.get('https://proxy.scrapeops.io/v1/', {
            params: {
                'api_key': SCRAPEOPS_API_KEY,
                'url': 'https://www.nseindia.com/api/etf',
                'render_js': 'true',
                'residential': 'true',
                'country': 'in' // Specifically use an Indian IP
            }
        });

        if (response.data && response.data.data) {
            saveToXml(response.data.data, response.data.timestamp);
            console.log("✅ Success: Data fetched via Proxy and saved.");
        }
    } catch (error) {
        console.error(`❌ ScrapeOps Failed: ${error.message}`);
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
