const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const TOKEN_PATH = path.join(__dirname, 'token.json');

async function setupAuthentication() {
    try {
        // Check if credentials file exists
        if (!fs.existsSync(CREDENTIALS_PATH)) {
            console.log('❌ credentials.json not found!');
            console.log('Please follow these steps:');
            console.log('1. Go to https://console.developers.google.com/');
            console.log('2. Create a new project or select existing one');
            console.log('3. Enable Google Drive API');
            console.log('4. Create credentials (OAuth 2.0 Client ID)');
            console.log('5. Download the JSON file and rename it to credentials.json');
            console.log('6. Place it in the project root directory');
            return;
        }

        const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
        const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
        
        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

        // Check if we already have a token
        if (fs.existsSync(TOKEN_PATH)) {
            console.log('✅ Token already exists. Authentication setup complete!');
            return;
        }

        // Get authorization URL
        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
        });

        console.log('🔐 Authorize this app by visiting this url:');
        console.log(authUrl);
        console.log('\n📋 After authorization, you will get a code. Paste it here:');

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        rl.question('Enter the authorization code: ', async (code) => {
            try {
                const { tokens } = await oAuth2Client.getToken(code);
                oAuth2Client.setCredentials(tokens);

                // Store the token for future use
                fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
                console.log('✅ Token stored successfully!');
                console.log('🎉 Authentication setup complete!');
                console.log('\nNext steps:');
                console.log('1. Set your MEDIA_FOLDER_ID environment variable');
                console.log('2. Run: npm start');
            } catch (error) {
                console.error('❌ Error retrieving access token:', error);
            }
            rl.close();
        });

    } catch (error) {
        console.error('❌ Setup error:', error);
    }
}

setupAuthentication();
