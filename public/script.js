class MediaLibrary {
    constructor() {
        this.mediaFiles = [];
        this.filteredFiles = [];
        this.currentVideo = null;
        
        this.initializeElements();
        this.setupEventListeners();
        this.loadMediaLibrary();
    }
    
    initializeElements() {
        this.loadingScreen = document.getElementById('loadingScreen');
        this.mediaLibrary = document.getElementById('mediaLibrary');
        this.mediaGrid = document.getElementById('mediaGrid');
        this.searchInput = document.getElementById('searchInput');
        this.refreshBtn = document.getElementById('refreshBtn');
        this.videoModal = document.getElementById('videoModal');
        this.videoPlayer = document.getElementById('videoPlayer');
        this.videoTitle = document.getElementById('videoTitle');
        this.closeModal = document.getElementById('closeModal');
        this.errorMessage = document.getElementById('errorMessage');
        this.errorText = document.getElementById('errorText');
        this.closeError = document.getElementById('closeError');
        this.connectionStatus = document.getElementById('connectionStatus');
    }
    
    setupEventListeners() {
        // Search functionality
        this.searchInput.addEventListener('input', (e) => {
            this.filterMedia(e.target.value);
        });
        
        // Refresh button
        this.refreshBtn.addEventListener('click', () => {
            this.loadMediaLibrary(true); // Force refresh
        });
        
        // Video modal
        this.closeModal.addEventListener('click', () => {
            this.closeVideoModal();
        });
        
        // Close modal on background click
        this.videoModal.addEventListener('click', (e) => {
            if (e.target === this.videoModal) {
                this.closeVideoModal();
            }
        });
        
        // Close error message
        this.closeError.addEventListener('click', () => {
            this.hideError();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeVideoModal();
                this.hideError();
            }
        });
    }
    
    async loadMediaLibrary(forceRefresh = false) {
        try {
            this.showLoading();
            this.updateConnectionStatus('loading');
            
            // Add timestamp to prevent caching
            const timestamp = new Date().getTime();
            const endpoint = forceRefresh ? '/api/media/refresh' : '/api/media';
            const response = await fetch(`${endpoint}?t=${timestamp}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            this.mediaFiles = await response.json();
            this.filteredFiles = [...this.mediaFiles];
            
            this.renderMediaGrid();
            this.hideLoading(); // Hide loading screen
            this.showMediaLibrary();
            this.updateConnectionStatus('online');
            
        } catch (error) {
            console.error('Error loading media library:', error);
            this.hideLoading(); // Hide loading screen even on error
            this.showError('Failed to load media library. Please check your connection.');
            this.updateConnectionStatus('offline');
        }
    }
    
    filterMedia(searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        
        if (term === '') {
            this.filteredFiles = [...this.mediaFiles];
        } else {
            this.filteredFiles = this.mediaFiles.filter(file => 
                file.name.toLowerCase().includes(term)
            );
        }
        
        this.renderMediaGrid();
    }
    
    renderMediaGrid() {
        this.mediaGrid.innerHTML = '';
        
        if (this.filteredFiles.length === 0) {
            this.mediaGrid.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <h3>No media found</h3>
                    <p>Try adjusting your search terms</p>
                </div>
            `;
            return;
        }
        
        // Check if we have the new TMDB-enhanced structure or old flat structure
        const firstItem = this.filteredFiles[0];
        
        if (firstItem && firstItem.showName && firstItem.episodes) {
            // New TMDB-enhanced structure
            this.filteredFiles.forEach(showData => {
                const showSection = this.createShowSectionWithTMDB(showData);
                this.mediaGrid.appendChild(showSection);
            });
        } else {
            // Old flat structure - group files by show and season
            const groupedFiles = this.groupFilesByShowAndSeason(this.filteredFiles);
            
            // Create show sections
            Object.keys(groupedFiles).forEach(showName => {
                const showSection = this.createShowSection(showName, groupedFiles[showName]);
                this.mediaGrid.appendChild(showSection);
            });
        }
    }
    
    createMediaItem(file) {
        const item = document.createElement('div');
        item.className = 'media-item';
        
        const thumbnail = file.thumbnail || this.getDefaultThumbnail(file.mimeType);
        const fileSize = this.formatFileSize(file.size);
        const modifiedDate = this.formatDate(file.modifiedTime);
        
        item.innerHTML = `
            <div class="media-thumbnail">
                <img src="${thumbnail}" alt="${file.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="default-thumbnail" style="display: none; background: linear-gradient(135deg, #FFF7F3, #FAD0C4); color: #C599B6; font-size: 3rem; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; border-radius: 20px 20px 0 0;">
                    <i class="fas fa-${file.isVideo ? 'play-circle' : 'image'}"></i>
                </div>
                <div class="play-icon">
                    <i class="fas fa-play"></i>
                </div>
            </div>
            <div class="media-info">
                <h3 class="media-title">${this.escapeHtml(file.name)}</h3>
                <div class="media-meta">
                    <span class="media-type">${file.isVideo ? 'Video' : 'Image'}</span>
                    <span class="media-size">${fileSize}</span>
                </div>
                <div class="media-date">${modifiedDate}</div>
            </div>
        `;
        
        item.addEventListener('click', () => {
            if (file.isVideo) {
                this.playVideo(file);
            } else {
                this.showImage(file);
            }
        });
        
        return item;
    }
    
    async playVideo(file) {
        try {
            console.log(`Opening video in Google Drive: ${file.name}`);
            
            // Always open videos directly in Google Drive player
            // This ensures full compatibility with all video formats and codecs
            window.open(file.webViewLink, '_blank');
            
            this.currentVideo = file;
            
        } catch (error) {
            console.error('Error playing video:', error);
            this.showError('Failed to open video. Please try again.');
        }
    }
    
    showImage(file) {
        // For images, we can show them in a modal or open in new tab
        window.open(file.webViewLink, '_blank');
    }
    
    showVideoModal() {
        this.videoModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Focus on video player for keyboard controls
        setTimeout(() => {
            this.videoPlayer.focus();
        }, 100);
    }
    
    closeVideoModal() {
        this.videoModal.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        // Pause and clear video content if it exists
        const video = this.videoPlayer.querySelector('video');
        if (video) {
            video.pause();
            video.currentTime = 0;
        }
        this.videoPlayer.innerHTML = '';
        this.currentVideo = null;
    }
    
    showLoading() {
        this.loadingScreen.style.display = 'flex';
        this.mediaLibrary.style.display = 'none';
    }
    
    hideLoading() {
        this.loadingScreen.style.display = 'none';
    }
    
    showMediaLibrary() {
        this.mediaLibrary.style.display = 'block';
    }
    
    showError(message) {
        this.errorText.textContent = message;
        this.errorMessage.style.display = 'flex';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            this.hideError();
        }, 5000);
    }
    
    hideError() {
        this.errorMessage.style.display = 'none';
    }
    
    updateConnectionStatus(status) {
        const statusElement = this.connectionStatus;
        
        switch (status) {
            case 'online':
                statusElement.className = 'status-online';
                statusElement.innerHTML = '<i class="fas fa-circle"></i> Connected';
                break;
            case 'offline':
                statusElement.className = 'status-offline';
                statusElement.innerHTML = '<i class="fas fa-circle"></i> Disconnected';
                break;
            case 'loading':
                statusElement.className = 'status-loading';
                statusElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
                break;
        }
    }
    
    // Utility functions
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    formatFileSize(bytes) {
        if (!bytes) return 'Unknown size';
        
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }
    
    formatDate(dateString) {
        if (!dateString) return 'Unknown date';
        
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
    
    getDefaultThumbnail(mimeType) {
        if (mimeType.startsWith('video/')) {
            return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjBGMEYwIi8+CjxwYXRoIGQ9Ik04NSA3MEwxMzUgMTAwTDg1IDEzMFY3MFoiIGZpbGw9IiM2NjdFRUEiLz4KPC9zdmc+';
        } else {
            return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjBGMEYwIi8+CjxwYXRoIGQ9Ik04MCA2MEgxMjBWMTQwSDgwVjYwWiIgZmlsbD0iIzY2N0VFQSIvPgo8L3N2Zz4=';
        }
    }
    
    // New methods for grouped layout
    groupFilesByShowAndSeason(files) {
        const grouped = {};
        
        files.forEach(file => {
            const parsed = this.parseFileName(file.name);
            const showName = parsed.show || 'Other Media';
            const season = parsed.season || 'Unknown';
            
            if (!grouped[showName]) {
                grouped[showName] = {};
            }
            
            if (!grouped[showName][season]) {
                grouped[showName][season] = [];
            }
            
            grouped[showName][season].push({
                ...file,
                parsedName: parsed
            });
        });
        
        // Sort episodes within each season
        Object.keys(grouped).forEach(showName => {
            Object.keys(grouped[showName]).forEach(season => {
                grouped[showName][season].sort((a, b) => {
                    const aEp = parseInt(a.parsedName.episode) || 0;
                    const bEp = parseInt(b.parsedName.episode) || 0;
                    return aEp - bEp;
                });
            });
        });
        
        return grouped;
    }
    
    parseFileName(fileName) {
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
    
    createShowSection(showName, seasons) {
        const showSection = document.createElement('div');
        showSection.className = 'show-section';
        
        // Show header
        const showHeader = document.createElement('div');
        showHeader.className = 'show-header';
        
        const showIcon = document.createElement('div');
        showIcon.className = 'show-icon';
        showIcon.textContent = '📺';
        
        const showTitle = document.createElement('h2');
        showTitle.className = 'show-title';
        showTitle.textContent = showName;
        
        showHeader.appendChild(showIcon);
        showHeader.appendChild(showTitle);
        showSection.appendChild(showHeader);
        
        // Season sections
        Object.keys(seasons).sort().forEach(season => {
            const seasonSection = this.createSeasonSection(season, seasons[season]);
            showSection.appendChild(seasonSection);
        });
        
        return showSection;
    }
    
    createSeasonSection(season, episodes) {
        const seasonSection = document.createElement('div');
        seasonSection.className = 'season-section';
        
        // Season header
        const seasonHeader = document.createElement('div');
        seasonHeader.className = 'season-header';
        
        const seasonTitle = document.createElement('h3');
        seasonTitle.className = 'season-title';
        seasonTitle.textContent = `Season ${season.substring(1)}`; // Remove 'S' prefix
        
        const seasonBadge = document.createElement('span');
        seasonBadge.className = 'season-badge';
        seasonBadge.textContent = season;
        
        seasonHeader.appendChild(seasonTitle);
        seasonHeader.appendChild(seasonBadge);
        seasonSection.appendChild(seasonHeader);
        
        // Episodes grid
        const episodesGrid = document.createElement('div');
        episodesGrid.className = 'episodes-grid';
        
        episodes.forEach(episode => {
            const episodeItem = this.createEpisodeItem(episode);
            episodesGrid.appendChild(episodeItem);
        });
        
        seasonSection.appendChild(episodesGrid);
        return seasonSection;
    }
    
    createEpisodeItem(file) {
        const episodeItem = document.createElement('div');
        episodeItem.className = 'episode-item';
        episodeItem.onclick = () => this.playVideo(file);
        
        // Episode header
        const episodeHeader = document.createElement('div');
        episodeHeader.className = 'episode-header';
        
        const episodeNumber = document.createElement('span');
        episodeNumber.className = 'episode-number';
        episodeNumber.textContent = file.parsedName.fullEpisode;
        
        const playBtn = document.createElement('button');
        playBtn.className = 'episode-play-btn';
        playBtn.innerHTML = '▶';
        playBtn.onclick = (e) => {
            e.stopPropagation();
            this.playVideo(file);
        };
        
        episodeHeader.appendChild(episodeNumber);
        episodeHeader.appendChild(playBtn);
        
        // Episode title
        const episodeTitle = document.createElement('div');
        episodeTitle.className = 'episode-title';
        episodeTitle.textContent = file.name;
        
        // Episode meta
        const episodeMeta = document.createElement('div');
        episodeMeta.className = 'episode-meta';
        
        const episodeDate = document.createElement('span');
        episodeDate.textContent = this.formatDate(file.modifiedTime);
        
        const episodeSize = document.createElement('span');
        episodeSize.className = 'episode-size';
        episodeSize.textContent = this.formatFileSize(file.size);
        
        episodeMeta.appendChild(episodeDate);
        episodeMeta.appendChild(episodeSize);
        
        episodeItem.appendChild(episodeHeader);
        episodeItem.appendChild(episodeTitle);
        episodeItem.appendChild(episodeMeta);
        
        return episodeItem;
    }
    
    // New method for TMDB-enhanced show sections
    createShowSectionWithTMDB(showData) {
        const showSection = document.createElement('div');
        showSection.className = 'show-section';
        
        // Show header with TMDB poster
        const showHeader = document.createElement('div');
        showHeader.className = 'show-header';
        
        if (showData.tmdbData && showData.tmdbData.poster_url) {
            const showPoster = document.createElement('div');
            showPoster.className = 'show-poster';
            const mediaIcon = showData.tmdbData.media_type === 'movie' ? 'fas fa-film' : 'fas fa-tv';
            showPoster.innerHTML = `
                <img src="${showData.tmdbData.poster_url}" alt="${showData.showName}" 
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="default-poster" style="display: none;">
                    <i class="${mediaIcon}"></i>
                </div>
            `;
            showHeader.appendChild(showPoster);
        } else {
            const showIcon = document.createElement('div');
            showIcon.className = 'show-icon';
            showIcon.textContent = '📺';
            showHeader.appendChild(showIcon);
        }
        
        const showInfo = document.createElement('div');
        showInfo.className = 'show-info';
        
        const showTitle = document.createElement('h2');
        showTitle.className = 'show-title';
        showTitle.textContent = showData.showName;
        
        showInfo.appendChild(showTitle);
        
        if (showData.tmdbData) {
            const showMeta = document.createElement('div');
            showMeta.className = 'show-meta';
            
            // Add media type badge
            if (showData.tmdbData.media_type) {
                const typeSpan = document.createElement('span');
                typeSpan.className = 'show-type';
                typeSpan.textContent = showData.tmdbData.media_type === 'movie' ? 'Movie' : 'TV Show';
                showMeta.appendChild(typeSpan);
            }
            
            if (showData.tmdbData.first_air_date) {
                const year = new Date(showData.tmdbData.first_air_date).getFullYear();
                const yearSpan = document.createElement('span');
                yearSpan.className = 'show-year';
                yearSpan.textContent = year;
                showMeta.appendChild(yearSpan);
            }
            
            if (showData.tmdbData.vote_average) {
                const ratingSpan = document.createElement('span');
                ratingSpan.className = 'show-rating';
                ratingSpan.innerHTML = `<i class="fas fa-star"></i> ${showData.tmdbData.vote_average.toFixed(1)}`;
                showMeta.appendChild(ratingSpan);
            }
            
            showInfo.appendChild(showMeta);
            
            if (showData.tmdbData.overview) {
                const overview = document.createElement('p');
                overview.className = 'show-overview';
                overview.textContent = showData.tmdbData.overview.substring(0, 150) + '...';
                showInfo.appendChild(overview);
            }
        }
        
        showHeader.appendChild(showInfo);
        showSection.appendChild(showHeader);
        
        // Group episodes by season
        const seasons = {};
        showData.episodes.forEach(episode => {
            const season = episode.parsedName.season || 'Unknown';
            if (!seasons[season]) {
                seasons[season] = [];
            }
            seasons[season].push(episode);
        });
        
        // Sort episodes within each season
        Object.keys(seasons).forEach(season => {
            seasons[season].sort((a, b) => {
                const aEp = parseInt(a.parsedName.episode) || 0;
                const bEp = parseInt(b.parsedName.episode) || 0;
                return aEp - bEp;
            });
        });
        
        // Create season sections
        Object.keys(seasons).sort().forEach(season => {
            const seasonSection = this.createSeasonSection(season, seasons[season]);
            showSection.appendChild(seasonSection);
        });
        
        return showSection;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MediaLibrary();
});
