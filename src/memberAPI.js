require('dotenv').config();
const fetch = require('node-fetch');
const { requestRetryLimit } = require('./config.json');
const baseUrl = process.env.MEMBER_API_BASE_URL;
const accessKey = process.env.MEMBER_API_ACCESS_KEY;
const secretKey = process.env.MEMBER_API_SECRET_KEY;

module.exports = {
    token: undefined,
    getToken: async () => {
        const url = `${baseUrl}/login`;
        const responseObj = await fetch(url, {
            method: 'POST',
            body: JSON.stringify({
                accessKeyID: accessKey, 
                secretAccessKey: secretKey,
            }),
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
    
        if (responseObj.status != 200) {
            return undefined;
        }
    
        const json = await responseObj.json();
        module.exports.token = json.token;
        console.log(module.exports.token);
    },
	getStatus: async (psid) => {
        const url = `${baseUrl}/contact/status?psid=${psid}`;
        return await fetch(url, { method: 'GET', headers: {'Accept': 'application/json'}});
    },

    getEmail: async (psid, retry = 0) => {
        if (retry >= requestRetryLimit) 
            return undefined;
        const url = `${baseUrl}/contact?psid=${psid}`;
    
        const responseObj = await fetch(url, {
            method: 'GET',
            withCredentials: true,
            credentials: 'include',
            headers: {
                'Authorization': `Bearer ${module.exports.token}`,
                'Accept': 'application/json'
            },
        });
    
        console.log("getEmail responseObj.status = " + responseObj.status);

        if (responseObj.status === 403) {
            await module.exports.getToken();
            return await module.exports.getEmail(psid, retry + 1);
        }

        const json = await responseObj.json();
        return await json["Email"];
    },
};