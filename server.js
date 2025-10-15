const express = require('express');
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Google Drive configuration
const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const TOKEN_PATH = path.join(__dirname, 'token.json');

// Your Google Drive folder ID where movies/shows are stored
const MEDIA_FOLDER_ID = process.env.MEDIA_FOLDER_ID || '1iixNErqmwI5_rUspp407HMrMKsj5Hq45';

// TMDB API configuration
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const TMDB_API_KEY = 'a209dc096e1611ec93f71bf8b9b05127';

let drive;

// Initialize Google Drive API
async function initializeDrive() {
    try {
        const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
        const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
        
        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
        
        // Check if we have a previously stored token
        if (fs.existsSync(TOKEN_PATH)) {
            const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
            oAuth2Client.setCredentials(token);
        } else {
            console.log('No token found. Please run the authentication setup.');
            return null;
        }
        
        drive = google.drive({ version: 'v3', auth: oAuth2Client });
        console.log('Google Drive API initialized successfully');
        return drive;
    } catch (error) {
        console.error('Error initializing Google Drive:', error);
        return null;
    }
}

// TMDB API helper functions
function makeTMDBRequest(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

async function searchShowOnTMDB(showName) {
    try {
        // Clean the show name for better search results
        const cleanName = showName.replace(/[Ss]\d+[Ee]\d+.*$/, '').trim();
        const encodedName = encodeURIComponent(cleanName);
        
        const url = `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodedName}&language=en-US&page=1`;
        console.log(`Searching TMDB for: ${cleanName}`);
        const response = await makeTMDBRequest(url);
        
        if (response.results && response.results.length > 0) {
            const show = response.results[0];
            console.log(`Found TMDB data for: ${show.name}`);
            return {
                id: show.id,
                name: show.name,
                overview: show.overview,
                poster_path: show.poster_path,
                backdrop_path: show.backdrop_path,
                first_air_date: show.first_air_date,
                vote_average: show.vote_average
            };
        }
        console.log(`No TMDB results found for: ${cleanName}`);
        return null;
    } catch (error) {
        console.error('Error searching TMDB:', error);
        return null;
    }
}

async function getShowDetails(tmdbId) {
    try {
        const url = `${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US`;
        const response = await makeTMDBRequest(url);
        return response;
    } catch (error) {
        console.error('Error getting show details:', error);
        return null;
    }
}

// Get media files from Google Drive
async function getMediaFiles() {
    try {
        const response = await drive.files.list({
            q: `'${MEDIA_FOLDER_ID}' in parents and (mimeType contains 'video/' or mimeType contains 'image/')`,
            fields: 'files(id, name, mimeType, thumbnailLink, webViewLink, size, modifiedTime)',
            orderBy: 'name'
        });
        
        const files = response.data.files.map(file => ({
            id: file.id,
            name: file.name,
            mimeType: file.mimeType,
            thumbnail: file.thumbnailLink,
            webViewLink: file.webViewLink,
            size: file.size,
            modifiedTime: file.modifiedTime,
            isVideo: file.mimeType.startsWith('video/')
        }));
        
        // Group files by show and enhance with TMDB data
        const groupedFiles = await enhanceWithTMDBData(files);
        
        return groupedFiles;
    } catch (error) {
        console.error('Error fetching media files:', error);
        throw error;
    }
}

async function enhanceWithTMDBData(files) {
    const showMap = new Map();
    
    // Group files by show name
    files.forEach(file => {
        const parsed = parseFileName(file.name);
        const showName = parsed.show || 'Other Media';
        
        if (!showMap.has(showName)) {
            showMap.set(showName, {
                showName: showName,
                tmdbData: null,
                episodes: []
            });
        }
        
        showMap.get(showName).episodes.push({
            ...file,
            parsedName: parsed
        });
    });
    
    // Fetch TMDB data for each show
    for (const [showName, showData] of showMap) {
        if (showName !== 'Other Media') {
            try {
                const tmdbData = await searchShowOnTMDB(showName);
                if (tmdbData) {
                    showData.tmdbData = {
                        ...tmdbData,
                        poster_url: tmdbData.poster_path ? `${TMDB_IMAGE_BASE_URL}${tmdbData.poster_path}` : null,
                        backdrop_url: tmdbData.backdrop_path ? `${TMDB_IMAGE_BASE_URL}${tmdbData.backdrop_path}` : null
                    };
                }
            } catch (error) {
                console.error(`Error fetching TMDB data for ${showName}:`, error);
            }
        }
    }
    
    return Array.from(showMap.values());
}

function parseFileName(fileName) {
    // Parse "The Summer I Turned Pretty S02E01.mkv" format
    const match = fileName.match(/^(.+?)\s+(S\d+E\d+)/i);
    if (match) {
        return {
            show: match[1].trim(),
            season: match[2].substring(0, 3), // S02
            episode: match[2].substring(3),   // E01
            fullEpisode: match[2]             // S02E01
        };
    }
    
    // Fallback for other formats
    return {
        show: fileName.replace(/\.[^/.]+$/, ""), // Remove extension
        season: 'Unknown',
        episode: '01',
        fullEpisode: 'Unknown'
    };
}

// Get video stream URL
async function getVideoStreamUrl(fileId) {
    try {
        // Get the direct download URL for video streaming
        const response = await drive.files.get({
            fileId: fileId,
            fields: 'webContentLink,webViewLink'
        });
        
        // Use webContentLink for direct streaming
        // This allows browsers to stream the video directly
        return response.data.webContentLink;
    } catch (error) {
        console.error('Error getting video stream URL:', error);
        throw error;
    }
}

// API Routes

// Get all media files
app.get('/api/media', async (req, res) => {
    try {
        if (!drive) {
            return res.status(500).json({ error: 'Google Drive not initialized' });
        }
        
        console.log('Fetching fresh media files from Google Drive...');
        const mediaFiles = await getMediaFiles();
        
        // Add cache-busting headers to prevent browser caching
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        console.log(`Found ${mediaFiles.length} media files`);
        res.json(mediaFiles);
    } catch (error) {
        console.error('Error in /api/media:', error);
        res.status(500).json({ error: 'Failed to fetch media files' });
    }
});

// Force refresh media files (bypass any potential caching)
app.get('/api/media/refresh', async (req, res) => {
    try {
        if (!drive) {
            return res.status(500).json({ error: 'Google Drive not initialized' });
        }
        
        console.log('Force refreshing media files from Google Drive...');
        const mediaFiles = await getMediaFiles();
        
        // Add cache-busting headers
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        console.log(`Refreshed: Found ${mediaFiles.length} media files`);
        res.json(mediaFiles);
    } catch (error) {
        console.error('Error in /api/media/refresh:', error);
        res.status(500).json({ error: 'Failed to refresh media files' });
    }
});

// Get video stream URL
async function getVideoStreamUrl(fileId) {
    try {
        // Get the direct download URL for video streaming
        const response = await drive.files.get({
            fileId: fileId,
            fields: 'webContentLink,webViewLink'
        });
        
        // Use webContentLink for direct streaming
        // This allows browsers to stream the video directly
        return response.data.webContentLink;
    } catch (error) {
        console.error('Error getting video stream URL:', error);
        throw error;
    }
}

// Stream video through server proxy with proper headers
app.get('/api/stream/:fileId', async (req, res) => {
    try {
        if (!drive) {
            console.log('Drive not initialized');
            return res.status(500).json({ error: 'Google Drive not initialized' });
        }
        
        const { fileId } = req.params;
        const range = req.headers.range;
        
        console.log(`Streaming video: ${fileId}, Range: ${range}`);
        
        // Get the file info
        const fileResponse = await drive.files.get({
            fileId: fileId,
            fields: 'size,name,mimeType'
        });
        
        const fileSize = parseInt(fileResponse.data.size);
        const fileName = fileResponse.data.name;
        const mimeType = fileResponse.data.mimeType;
        
        console.log(`File: ${fileName}, Size: ${fileSize}, MIME: ${mimeType}`);
        
        // Set appropriate headers for video streaming
        // Convert MKV to MP4 MIME type for browser compatibility
        let contentType = mimeType;
        if (mimeType === 'video/x-matroska' || fileName.toLowerCase().endsWith('.mkv')) {
            contentType = 'video/mp4'; // Force MP4 for browser compatibility
            console.log(`Converting MKV to MP4 MIME type for: ${fileName}`);
        }
        
        res.setHeader('Content-Type', contentType);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'Range');
        
        // Add additional headers for better video streaming
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
        
        if (range) {
            // Handle range requests for video seeking
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            
            console.log(`Range request: ${start}-${end} (${chunksize} bytes)`);
            
            res.status(206);
            res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
            res.setHeader('Content-Length', chunksize);
            
            // Stream the specific range
            const stream = await drive.files.get({
                fileId: fileId,
                alt: 'media',
                headers: {
                    'Range': `bytes=${start}-${end}`
                }
            }, { responseType: 'stream' });
            
            stream.data.pipe(res);
        } else {
            // Stream the entire file
            console.log(`Full file request: ${fileSize} bytes`);
            res.setHeader('Content-Length', fileSize);
            
            const stream = await drive.files.get({
                fileId: fileId,
                alt: 'media'
            }, { responseType: 'stream' });
            
            stream.data.pipe(res);
        }
        
    } catch (error) {
        console.error('Error streaming video:', error);
        res.status(500).json({ error: 'Failed to stream video', details: error.message });
    }
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
async function startServer() {
    await initializeDrive();
    
    app.listen(PORT, () => {
        console.log(`LiliBox server running on http://localhost:${PORT}`);
        console.log('Make sure to:');
        console.log('1. Set up Google Drive API credentials');
        console.log('2. Set MEDIA_FOLDER_ID environment variable');
        console.log('3. Run authentication setup if needed');
    });
}

startServer().catch(console.error);
