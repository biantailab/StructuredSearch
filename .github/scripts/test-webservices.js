const axios = require('axios');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const TEST_SMILES = [
    'CCCCCCCCC=O', 
];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function getSpoofedHeaders(targetUrl) {
    try {
        const urlObj = new URL(targetUrl);
        return {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Origin': urlObj.origin,
            'Referer': urlObj.origin + '/',
            'Content-Type': 'application/json'
        };
    } catch (e) {
        return { 'Content-Type': 'application/json' };
    }
}

function loadWebservicesConfig() {
    try {
        const webservicesPath = path.join(process.cwd(), 'public/marvin/js/webservices.js');
        const content = fs.readFileSync(webservicesPath, 'utf8');
        
        const serverMatch = content.match(/var servername = "([^"]+)"/);
        if (!serverMatch) {
            throw new Error('Could not extract server name from webservices.js');
        }
        
        const serverName = serverMatch[1];
        console.log(`Found server: ${serverName}`);
        
        return {
            baseUrl: serverName,
            services: {
                clean2d: `${serverName}/rest-v1/util/convert/clean`,
                molconvert: `${serverName}/rest-v1/util/calculate/molExport`,
                stereoinfo: `${serverName}/rest-v1/util/calculate/cipStereoInfo`,
                aromatize: `${serverName}/rest-v1/util/calculate/molExport`
            }
        };
    } catch (error) {
        console.error('Error loading webservices config:', error.message);
        throw error;
    }
}

async function testServiceEndpoint(url, timeout = 10000) {
    try {
        console.log(`Testing endpoint: ${url}`);
        
        const headers = getSpoofedHeaders(url);
        delete headers['Content-Type'];

        const response = await axios.get(url, { 
            timeout,
            headers: headers,
            validateStatus: function (status) {
                return status < 500;
            }
        });
        
        await sleep(500); 
        
        console.log(`Endpoint ${url} responded with status: ${response.status}`);
        return {
            success: response.status < 400 || response.status === 405,
            status: response.status,
            url: url
        };
    } catch (error) {
        console.error(`Endpoint ${url} failed:`, error.message);
        return {
            success: false,
            error: error.message,
            url: url
        };
    }
}

async function testSmilesConversion(serviceUrl, smiles, timeout = 15000) {
    try {
        console.log(`Testing SMILES conversion: ${smiles}`);

        const formats = ['mol', 'smiles']; 
        const results = [];
        
        for (const format of formats) {
            let retries = 1;
            let success = false;
            let response = null;
            let lastError = null;

            while (retries >= 0 && !success) {
                try {
                    await sleep(1000);

                    response = await axios.post(serviceUrl, {
                        structure: smiles,
                        parameters: `${format}`
                    }, {
                        timeout,
                        headers: getSpoofedHeaders(serviceUrl)
                    });
                    
                    if (response.status === 200) {
                        success = true;
                    }
                } catch (error) {
                    lastError = error;
                    if (error.response && error.response.status === 429) {
                        console.log(`Rate limited (429), waiting 3s...`);
                        await sleep(3000);
                    }
                    retries--;
                }
            }

            results.push({
                format,
                success,
                status: response ? response.status : 'ERR',
                error: success ? null : (lastError ? lastError.message : 'Unknown')
            });
            console.log(`SMILES ${smiles} -> ${format}: ${success ? 'SUCCESS' : 'FAILED'}`);
        }
        
        return {
            smiles,
            results,
            overallSuccess: results.some(r => r.success)
        };
    } catch (error) {
        return { smiles, success: false, error: error.message };
    }
}

async function sendEmailNotification(failedServices, failedConversions) {
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    const notificationEmail = process.env.NOTIFICATION_EMAIL;
    
    if (!emailUser || !emailPass || !notificationEmail) {
        console.log('Email credentials not configured, skipping email notification');
        return;
    }
    
    try {
        const transporter = nodemailer.createTransporter({
            service: 'gmail',
            auth: { user: emailUser, pass: emailPass }
        });
        
        const failedList = [...failedServices, ...failedConversions]
            .map(f => `- ${f.url || f.smiles}: ${f.error || 'Failed'}`).join('\n');
        
        await transporter.sendMail({
            from: emailUser,
            to: notificationEmail,
            subject: '🚨 Webservice Health Check Failed',
            html: `<h3>Health Check Failed</h3><pre>${failedList}</pre>`
        });
        console.log('Email notification sent successfully');
    } catch (error) {
        console.error('Failed to send email notification:', error.message);
    }
}

async function runHealthCheck() {
    console.log('Starting webservice health check...');
    
    let hasFailures = false;
    const failedServices = [];
    const failedConversions = [];
    
    try {
        const config = loadWebservicesConfig();
        
        console.log('\n=== Testing Service Endpoints ===');
        for (const [name, url] of Object.entries(config.services)) {
            const result = await testServiceEndpoint(url);
            if (!result.success) {
                hasFailures = true;
                failedServices.push(result);
            }
        }
        
        console.log('\n=== Testing SMILES Conversions ===');
        const molconvertUrl = config.services.molconvert;

        if (!hasFailures) {
            for (const smiles of TEST_SMILES) {
                const result = await testSmilesConversion(molconvertUrl, smiles);
                if (!result.overallSuccess) {
                    hasFailures = true;
                    failedConversions.push(result);
                }
            }
        }

        console.log('\n=== Summary ===');
        console.log(`Status: ${hasFailures ? 'FAILED' : 'PASSED'}`);
        
        if (hasFailures) {
            await sendEmailNotification(failedServices, failedConversions);
            process.exit(1);
        } else {
            process.exit(0);
        }
        
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    runHealthCheck();
}

module.exports = { runHealthCheck };