// emailUtils.js - Email utility functions
require('dotenv').config();
const axios = require('axios');
const msal = require('@azure/msal-node');

const msalConfig = {
    auth: {
        clientId: process.env.AAD_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${process.env.AAD_TENANT_ID}`,
        clientSecret: process.env.AAD_CLIENT_SECRET,
    },
};
const cca = new msal.ConfidentialClientApplication(msalConfig);

async function getAccessToken() {
    const tokenRequest = {
        scopes: ['https://graph.microsoft.com/.default'],
    };
    try {
        const response = await cca.acquireTokenByClientCredential(tokenRequest);
        return response.accessToken;
    } catch (error) {
        console.error('Error acquiring access token:', error.message);
        throw new Error('Could not acquire access token.');
    }
}

async function sendEmail(accessToken, mailOptions) {
    if (!accessToken) throw new Error('Access token is missing.');
    if (!mailOptions || !mailOptions.to || !mailOptions.subject || !mailOptions.body) throw new Error('Mail options (to, subject, body) are required.');
    const sendMailEndpoint = `https://graph.microsoft.com/v1.0/users/${process.env.USER_ID}/sendMail`;
    const emailMessage = {
        message: {
            subject: mailOptions.subject,
            body: { contentType: 'HTML', content: mailOptions.body },
            toRecipients: [{ emailAddress: { address: mailOptions.to } }],
        },
        saveToSentItems: 'true',
    };
    try {
        await axios.post(sendMailEndpoint, emailMessage, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });
    } catch (error) {
        console.error('Error sending email:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
        throw new Error('Failed to send email.');
    }
}

module.exports = {
  sendEmail,
  getAccessToken
};