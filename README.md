# LiliBox - Google Drive Media Streaming App

A beautiful web application that streams movies and shows directly from your Google Drive account. Perfect for sharing your media library with family and friends without requiring them to have Google Drive access.

## Features

- 🎬 **Stream Videos**: Play movies and shows directly in the browser
- 🖼️ **Image Gallery**: View images from your Drive
- 🔍 **Search**: Find content quickly with real-time search
- 📱 **Responsive**: Works on desktop, tablet, and mobile
- 🔒 **Secure**: Server-side authentication keeps your credentials safe
- 🎨 **Modern UI**: Beautiful, intuitive interface

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Google Drive API Setup

1. Go to [Google Cloud Console](https://console.developers.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Drive API
4. Create credentials (OAuth 2.0 Client ID)
5. Download the JSON file and rename it to `credentials.json`
6. Place it in the project root directory

### 3. Authentication Setup

Run the authentication setup script:

```bash
npm run setup-auth
```

Follow the instructions to authorize the application with your Google Drive account.

### 4. Configure Media Folder

Set your Google Drive folder ID as an environment variable:

**Windows (PowerShell):**
```powershell
$env:MEDIA_FOLDER_ID="your_folder_id_here"
```

**Windows (Command Prompt):**
```cmd
set MEDIA_FOLDER_ID=your_folder_id_here
```

**Linux/Mac:**
```bash
export MEDIA_FOLDER_ID="your_folder_id_here"
```

To find your folder ID:
1. Open Google Drive in your browser
2. Navigate to the folder containing your movies/shows
3. Copy the folder ID from the URL: `https://drive.google.com/drive/folders/FOLDER_ID_HERE`

### 5. Start the Server

```bash
npm start
```

The app will be available at `http://localhost:3000`

## Usage

1. **Access the App**: Open your browser and go to `http://localhost:3000`
2. **Browse Media**: Your movies and shows will be displayed in a beautiful grid
3. **Search**: Use the search bar to find specific content
4. **Stream**: Click on any video to start streaming
5. **View Images**: Click on images to open them in Google Drive

## File Structure

```
lilibox/
├── server.js              # Main server file
├── setup-auth.js          # Authentication setup script
├── package.json           # Dependencies and scripts
├── credentials.json       # Google Drive API credentials (you provide)
├── token.json            # Authentication token (generated)
├── public/               # Frontend files
│   ├── index.html        # Main HTML file
│   ├── styles.css        # CSS styles
│   └── script.js         # Frontend JavaScript
└── README.md             # This file
```

## Environment Variables

- `MEDIA_FOLDER_ID`: Your Google Drive folder ID containing media files
- `PORT`: Server port (default: 3000)

## Troubleshooting

### Common Issues

1. **"Google Drive not initialized" error**
   - Make sure you've run `npm run setup-auth`
   - Check that `credentials.json` exists and is valid

2. **"No media found"**
   - Verify your `MEDIA_FOLDER_ID` is correct
   - Ensure the folder contains video or image files
   - Check that the folder is accessible to your Google account

3. **Videos won't play**
   - Some video formats may not be supported by the browser
   - Check browser console for specific error messages
   - Ensure the video files are not corrupted

### Getting Help

If you encounter issues:
1. Check the browser console for error messages
2. Verify all setup steps were completed correctly
3. Ensure your Google Drive API credentials are valid
4. Check that your media folder ID is correct

## Security Notes

- Keep your `credentials.json` and `token.json` files secure
- Never commit these files to version control
- The app only requests read-only access to your Google Drive
- Consider using environment variables for sensitive data in production

## License

MIT License - feel free to modify and distribute as needed.
