const axios = require('axios');
const fs = require('fs');
const { create } = require('xmlbuilder2');

const API_KEY = process.env.SCRAPEOPS_API_KEY;

async function fetchNseData() {
    try {
        console.log("🚀 Fetching large dataset (18,000+ lines)...");
        
        const response = await axios.get('https://proxy.scrapeops.io/v1/', {
            params: {
                'api_key': API_KEY,
                'url': 'https://www.nseindia.com/api/etf',
                'render_js': 'true',
                'residential': 'true',
                'country': 'in',
                'bypass': 'cloudflare_level_3'
            },
            timeout: 240000 
        });

        let rawData = response.data;

        // --- THE SLEDGEHAMMER CLEANER ---
        if (typeof rawData === 'string') {
            console.log("🧹 Scrubbing 18k lines for hidden control characters...");
            
            // 1. Remove non-printable control characters (ASCII 0-31) including Vertical Tabs
            rawData = rawData.replace(/[\x00-\x1F\x7F-\x9F]/g, ""); 
            
            // 2. Ensure we only parse from the first '{' to the last '}'
            const firstBrace = rawData.indexOf('{');
            const lastBrace = rawData.lastIndexOf('}');
            
            if (firstBrace !== -1 && lastBrace !== -1) {
                rawData = rawData.substring(firstBrace, lastBrace + 1);
            }
        }

        // Try parsing the cleaned string
        const jsonData = (typeof rawData === 'string') ? JSON.parse(rawData) : rawData;

        if (jsonData && jsonData.data && Array.isArray(jsonData.data)) {
            saveToXml(jsonData.data, jsonData.timestamp);
            console.log(`✅ Success! Cleaned and processed ${jsonData.data.length} ETFs.`);
        } else {
            console.log("❌ Cleaned data is missing the 'data' array.");
            process.exit(1);
        }
    } catch (error) {
        console.error(`❌ Fatal Error: ${error.message}`);
        // If it fails, save the 'raw' response for 1 min to debug manually if needed
        fs.writeFileSync('error_dump.txt', String(response?.data || "No data"));
        process.exit(1);
    }
}

function saveToXml(dataList, timestamp) {
    const root = create({ version: '1.0', encoding: 'UTF-8' }).ele('NSE_ETF_Data');
    root.ele('GeneratedAt').txt(timestamp || new Date().toISOString()).up();

    dataList.forEach(item => {
        if (item.symbol) {
            root.ele('ETF')
                .ele('Symbol').txt(item.symbol).up()
                .ele('LTP').txt(item.ltP || '0').up()
                .ele('PercentChange').txt(item.per || '0').up()
                .ele('Volume').txt(item.qty || '0').up()
            .up();
        }
    });

    fs.writeFileSync('nse_etf_data.xml', root.end({ prettyPrint: true }));
}

fetchNseData();
