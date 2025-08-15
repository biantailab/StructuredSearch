const axios = require('axios');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const TEST_SMILES = [
    'C(C1=CC=CC=C1)[Ti](CC1=CC=CC=C1)(CC1=CC=CC=C1)CC1=CC=CC=C1',
    'O=C(O)C[C@H](CC(C)C)CN',
    'CNCCC(C1=CC=CC=C1)OC2=CC=C(C=C2)C(F)(F)F',
];

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
        const response = await axios.get(url, { 
            timeout,
            validateStatus: function (status) {
                return status < 500;
            }
        });
        
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
        
        const formats = ['mol', 'sdf', 'smiles'];
        const results = [];
        
        for (const format of formats) {
            try {
                const response = await axios.post(serviceUrl, {
                    structure: smiles,
                    parameters: `${format}`
                }, {
                    timeout,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                const success = response.status === 200 && response.data;
                results.push({
                    format,
                    success,
                    status: response.status,
                    hasData: !!response.data
                });
                
                console.log(`SMILES ${smiles} -> ${format}: ${success ? 'SUCCESS' : 'FAILED'}`);
            } catch (error) {
                results.push({
                    format,
                    success: false,
                    error: error.message
                });
                console.log(`SMILES ${smiles} -> ${format}: FAILED (${error.message})`);
            }
        }
        
        return {
            smiles,
            results,
            overallSuccess: results.some(r => r.success)
        };
    } catch (error) {
        console.error(`SMILES conversion test failed for ${smiles}:`, error.message);
        return {
            smiles,
            success: false,
            error: error.message
        };
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
            auth: {
                user: emailUser,
                pass: emailPass
            }
        });
        
        const failedServicesList = failedServices.map(s => `- ${s.url}: ${s.error || s.status}`).join('\n');
        const failedConversionsList = failedConversions.map(c => `- ${c.smiles}: ${c.error || 'Conversion failed'}`).join('\n');
        
        const mailOptions = {
            from: emailUser,
            to: notificationEmail,
            subject: '🚨 Webservice Health Check Failed - SMILES Conversion Issues',
            html: `
                <h2>Webservice Health Check Failed</h2>
                <p><strong>Time:</strong> ${new Date().toISOString()}</p>
                <p><strong>Repository:</strong> StructuredSearch</p>
                
                <h3>Failed Services (${failedServices.length})</h3>
                <pre>${failedServicesList}</pre>
                
                <h3>Failed SMILES Conversions (${failedConversions.length})</h3>
                <pre>${failedConversionsList}</pre>
                
                <h3>Recommended Actions</h3>
                <ul>
                    <li>Check the webservice server status</li>
                    <li>Verify network connectivity</li>
                    <li>Update webservice URLs if necessary</li>
                    <li>Check GitHub Issues for automated issue creation</li>
                </ul>
                
                <p><em>This notification was sent automatically by the GitHub Actions workflow.</em></p>
            `
        };
        
        await transporter.sendMail(mailOptions);
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
        
        for (const smiles of TEST_SMILES) {
            const result = await testSmilesConversion(molconvertUrl, smiles);
            if (!result.overallSuccess) {
                hasFailures = true;
                failedConversions.push(result);
            }
        }
        
        console.log('\n=== Health Check Summary ===');
        console.log(`Failed Services: ${failedServices.length}`);
        console.log(`Failed Conversions: ${failedConversions.length}`);
        console.log(`Overall Status: ${hasFailures ? 'FAILED' : 'PASSED'}`);
        
        if (hasFailures) {
            await sendEmailNotification(failedServices, failedConversions);
        }
        
        const hasConversionFailures = failedConversions.length > 0;
        
        if (hasConversionFailures) {
            console.error('Health check failed - SMILES conversion is not working correctly');
            process.exit(1);
        } else {
            console.log('Health check passed - SMILES conversion is working correctly');
            process.exit(0);
        }
        
    } catch (error) {
        console.error('Health check encountered an error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

if (require.main === module) {
    runHealthCheck();
}

module.exports = {
    runHealthCheck,
    testServiceEndpoint,
    testSmilesConversion,
    loadWebservicesConfig
};
