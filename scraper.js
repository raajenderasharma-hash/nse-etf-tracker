const axios = require('axios');
const fs = require('fs');
const { create } = require('xmlbuilder2');

const API_KEY = process.env.SCRAPEOPS_API_KEY;

async function fetchWithRetry(retries = 3) {
    for (let i = 1; i <= retries; i++) {
        try {
            console.log(`🚀 Attempt ${i}: Launching Ultra-Stealth Browser...`);
            
            const response = await axios.get('https://proxy.scrapeops.io/v1/', {
                params: {
                    'api_key': API_KEY,
                    'url': 'https://www.nseindia.com/api/etf',
                    'render_js': 'true',
                    'residential': 'true',
                    'country': 'in',
                    'wait': '20000', // Increased wait to 20s for NSE stability
                    'optimize_request': 'true'
                },
                // Global wait time for the entire request
                timeout: 180000 
            });

            if (response.data && response.data.data) {
                saveToXml(response.data.data, response.data.timestamp);
                console.log(`✅ SUCCESS! Data saved on attempt ${i}.`);
                return; // Exit function on success
            } else {
                throw new Error("Invalid data format received.");
            }

        } catch (error) {
            console.error(`⚠️ Attempt ${i} failed: ${error.message}`);
            if (i === retries) {
                console.error("❌ All 3 attempts failed. NSE might be under heavy maintenance.");
                process.exit(1);
            }
            console.log("Waiting 10 seconds before retrying...");
            await new Promise(res => setTimeout(res, 10000));
        }
    }
}

function saveToXml(data, timestamp) {
    const root = create({ version: '1.0', encoding: 'UTF-8' }).ele('NSE_ETF_Data');
    root.ele('GeneratedAt').txt(timestamp || new Date().toLocaleString()).up();

    data.forEach(item => {
        root.ele('ETF')
            .ele('Symbol').txt(item.symbol || 'N/A').up()
            .ele('LTP').txt(item.ltP || '0').up()
            .ele('PercentChange').txt(item.per || '0').up()
        .up();
    });

    fs.writeFileSync('nse_etf_data.xml', root.end({ prettyPrint: true }));
}

fetchWithRetry();
