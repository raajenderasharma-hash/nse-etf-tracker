const axios = require('axios');
const fs = require('fs');
const { create } = require('xmlbuilder2');

const API_KEY = process.env.SCRAPEOPS_API_KEY;

async function fetchNseData() {
    try {
        console.log("🚀 Starting Ultra-Bypass Scraper...");
        
        const response = await axios.get('https://proxy.scrapeops.io/v1/', {
            params: {
                'api_key': API_KEY,
                'url': 'https://www.nseindia.com/api/etf',
                'render_js': 'true',
                'residential': 'true',
                'country': 'in',
                'bypass': 'cloudflare_level_3',
                'wait': '20000'
            },
            timeout: 180000 
        });

        // --- THE FIX FOR THE JSON ERROR ---
        let rawData = response.data;
        
        // If it's already an object, use it; otherwise, clean and parse
        let jsonData;
        if (typeof rawData === 'object') {
            jsonData = rawData;
        } else {
            // Remove any potential hidden characters at the start of the string
            const cleanedString = rawData.trim().substring(rawData.indexOf('{'));
            jsonData = JSON.parse(cleanedString);
        }

        // According to your screenshot: data is inside jsonData.data
        if (jsonData && jsonData.data && Array.isArray(jsonData.data)) {
            saveToXml(jsonData.data, jsonData.timestamp);
            console.log(`✅ Success! Captured ${jsonData.data.length} ETFs.`);
        } else {
            console.log("❌ Response received, but 'data' array not found.");
            process.exit(1);
        }
    } catch (error) {
        console.error(`❌ Final Error: ${error.message}`);
        process.exit(1);
    }
}

function saveToXml(dataList, timestamp) {
    const root = create({ version: '1.0', encoding: 'UTF-8' }).ele('NSE_ETF_Data');
    root.ele('GeneratedAt').txt(timestamp || new Date().toLocaleString()).up();

    dataList.forEach(item => {
        root.ele('ETF')
            .ele('Symbol').txt(item.symbol || 'N/A').up()
            .ele('LTP').txt(item.ltP || '0').up()
            .ele('Change').txt(item.chn || '0').up()
            .ele('PercentChange').txt(item.per || '0').up()
            .ele('Volume').txt(item.qty || '0').up()
        .up();
    });

    fs.writeFileSync('nse_etf_data.xml', root.end({ prettyPrint: true }));
}

fetchNseData();
