import { API_KEY, GOOGLE_FORM_URL } from './config.js';
const CHANNELS = [
    {
        id: 'UC1PluvjVa3GI5HJhul5lszg',
        name: 'Testo Taylan'
    },
    {
        id: 'UCFr6uAPwrG040QAWDKY0nnA',
        name: 'HTalks'
    },
    {
        id: 'UCXDPGKBmtGAjIaUrd7nYEOg',
        name: 'FEY'
    },
    {
        id: 'UCnyDauIsUmvr-9Q3H0Eq74g',
        name: 'Mind Vorteks'
    },
    {
        id: 'UCdakEeTJHMPz9MdejLKDRhg',
        name: 'Çimen Show'
    },
    {
        id: 'UCWsudnBrEOJLQ1JpkdloxKg',
        name: 'Yatırım 101'
    },
    {
        id: 'UC5_0UPuXT5SAGsbTe2T_PJg',
        name: '49W'
    },
    {
        id: 'UCW5d5ByWEsKNtzkrjTXGOMg',
        name: '2CR Serhat İnci'
    },
    {
        id: 'UCXin0u5SrVEBjn5LhOoG97A',
        name: 'Enis Kirazoğlu'
    },
    {
        id: 'UCKG3sWc3L13LvgKpJz1IvuQ',
        name: 'Bentropi'
    }
];

const SUGGESTION_ENDPOINT = 'YOUR_ENDPOINT'; // Replace with your actual endpoint
const COOLDOWN_TIME = 60000; // 1 minute cooldown in milliseconds

// Add these variables for spam prevention
let lastSubmissionTime = 0;
let suggestionCount = 0;
const MAX_SUGGESTIONS_PER_SESSION = 3;

// Add this after your CHANNELS array
const channelDetails = {};

// Add this at the top of your file with other global variables
let allVideos = [];

// Add this function to fetch channel details
async function fetchChannelDetails(channelId) {
    try {
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${API_KEY}`
        );
        const data = await response.json();
        return data.items[0].snippet.thumbnails.default.url;
    } catch (error) {
        console.error('Error fetching channel details:', error);
        return null;
    }
}

// Add this function for live search
function setupSearch() {
    const searchInput = document.getElementById('search-input');
    const clearButton = document.createElement('button');
    clearButton.className = 'clear-search';
    clearButton.innerHTML = '×';
    clearButton.style.display = 'none';
    searchInput.parentElement.appendChild(clearButton);

    // Live search - removed keypress event, only using input
    searchInput.addEventListener('input', debounce(() => {
        const searchTerm = searchInput.value.toLowerCase().trim();
        clearButton.style.display = searchTerm ? 'block' : 'none';
        
        const filteredVideos = allVideos.filter(video => 
            video.snippet.title.toLowerCase().includes(searchTerm) ||
            video.channelName.toLowerCase().includes(searchTerm)
        );
        displayVideos(filteredVideos);
    }, 300));

    // Clear search
    clearButton.addEventListener('click', () => {
        searchInput.value = '';
        clearButton.style.display = 'none';
        displayVideos(allVideos);
        searchInput.focus();
    });
}

// Add debounce function to prevent too many searches
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function setupSuggestionModal() {
    const modal = document.getElementById('suggestion-modal');
    const btn = document.getElementById('suggest-channel');
    const closeBtn = document.querySelector('.close-modal');
    const submitBtn = document.getElementById('submit-suggestion');
    const messageEl = document.getElementById('suggestion-message');
    const input = document.getElementById('channel-suggestion');

    btn.onclick = () => modal.style.display = 'block';
    closeBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (e) => {
        if (e.target === modal) modal.style.display = 'none';
    }

    submitBtn.onclick = () => {
        const suggestion = input.value.trim();
        if (!suggestion) {
            showMessage('Lütfen bir kanal adı veya linki girin.', 'error');
            return;
        }

        showMessage('Öneriniz için teşekkürler!', 'success');
        input.value = '';
        setTimeout(() => {
            modal.style.display = 'none';
            messageEl.style.display = 'none';
        }, 2000);
    }

    function showMessage(text, type) {
        messageEl.textContent = text;
        messageEl.className = type;
        messageEl.style.display = 'block';
    }
}

// Add this function before the DOMContentLoaded event listener
function addChannelFilters() {
    // First, check if filters already exist and remove them
    const existingFilters = document.querySelector('.channel-filters');
    if (existingFilters) {
        existingFilters.remove();
    }

    const filterContainer = document.createElement('div');
    filterContainer.className = 'channel-filters';
    filterContainer.innerHTML = `
        <div class="filter-buttons">
            <button class="filter-btn active" data-channel="all">Tümü</button>
            ${CHANNELS.map(channel => 
                `<button class="filter-btn" data-channel="${channel.id}">${channel.name}</button>`
            ).join('')}
        </div>
    `;
    
    const header = document.querySelector('.header');
    header.parentNode.insertBefore(filterContainer, header.nextSibling);

    filterContainer.addEventListener('click', async (e) => {
        if (e.target.classList.contains('filter-btn')) {
            document.querySelectorAll('.filter-btn').forEach(btn => 
                btn.classList.remove('active')
            );
            e.target.classList.add('active');

            const channelId = e.target.dataset.channel;
            if (channelId === 'all') {
                await displayVideos(allVideos);
            } else {
                const filteredVideos = allVideos.filter(video => 
                    video.snippet.channelId === channelId
                );
                await displayVideos(filteredVideos);
            }
            scrollToTop();
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    setupSearch();
    setupSuggestionModal();
    addChannelFilters();
    fetchAllVideos();
});

async function getUploadsPlaylistId(channelId) {
    try {
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${API_KEY}`
        );
        const data = await response.json();
        return data.items[0].contentDetails.relatedPlaylists.uploads;
    } catch (error) {
        console.error('Error getting playlist ID:', error);
        return null;
    }
}

async function fetchChannelVideos(channel) {
    try {
        const playlistId = await getUploadsPlaylistId(channel.id);
        if (!playlistId) return [];

        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=5&key=${API_KEY}`
        );
        const data = await response.json();
        
        if (data.error) {
            console.error('YouTube API Error:', data.error);
            return [];
        }
        
        return data.items.map(item => ({
            ...item,
            channelName: channel.name
        }));
    } catch (error) {
        console.error('Error fetching videos:', error);
        return [];
    }
}

// Add this function for skeleton loading
function showSkeletonLoading() {
    const videoGrid = document.getElementById('video-grid');
    const skeletons = Array(6).fill().map(() => `
        <div class="video-card skeleton">
            <div style="width: 240px; height: 135px; background: var(--card-hover)"></div>
            <div class="video-info">
                <div style="width: 80%; height: 20px; margin-bottom: 8px; background: var(--card-hover)"></div>
                <div style="width: 60%; height: 16px; background: var(--card-hover)"></div>
            </div>
        </div>
    `).join('');
    
    videoGrid.innerHTML = skeletons;
}

// Update fetchAllVideos to use skeleton loading
async function fetchAllVideos() {
    showSkeletonLoading();
    
    try {
        const videoPromises = CHANNELS.map(channel => fetchChannelVideos(channel));
        const channelVideos = await Promise.all(videoPromises);
        
        // Store all videos in the global variable
        allVideos = channelVideos
            .flat()
            .sort((a, b) => {
                const dateA = new Date(a.snippet.publishedAt);
                const dateB = new Date(b.snippet.publishedAt);
                return dateB - dateA;
            });
        
        await displayVideos(allVideos);
    } catch (error) {
        console.error('Error fetching all videos:', error);
        videoGrid.innerHTML = `
            <div class="error-state">
                <h3>😕 Bir şeyler ters gitti</h3>
                <p>Videolar yüklenirken bir hata oluştu.</p>
                <button onclick="fetchAllVideos()" class="retry-btn">Tekrar Dene</button>
            </div>
        `;
    }
}

async function fetchVideoDetails(videoId) {
    try {
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics&id=${videoId}&key=${API_KEY}`
        );
        const data = await response.json();
        return data.items[0];
    } catch (error) {
        console.error('Error fetching video details:', error);
        return null;
    }
}

function parseDuration(duration) {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    const hours = (match[1] || '').replace('H', '');
    const minutes = (match[2] || '').replace('M', '');
    const seconds = (match[3] || '').replace('S', '');
    return {
        hours: parseInt(hours) || 0,
        minutes: parseInt(minutes) || 0,
        seconds: parseInt(seconds) || 0
    };
}

function formatViews(views) {
    if (views >= 1000000) {
        return `${(views / 1000000).toFixed(1)}M`;
    } else if (views >= 1000) {
        return `${(views / 1000).toFixed(1)}B`;
    }
    return views;
}

async function displayVideos(videos) {
    if (!videos || videos.length === 0) {
        const videoGrid = document.getElementById('video-grid');
        videoGrid.innerHTML = '<p>Video bulunamadı.</p>';
        return;
    }

    // Sort videos again just before display
    videos.sort((a, b) => {
        const dateA = new Date(a.snippet.publishedAt);
        const dateB = new Date(b.snippet.publishedAt);
        return dateB - dateA;
    });

    const videoGrid = document.getElementById('video-grid');
    videoGrid.innerHTML = '';

    // Create all video cards first
    const videoCards = await Promise.all(videos.map(async video => {
        const videoId = video.snippet.resourceId.videoId;
        const details = await fetchVideoDetails(videoId);
        if (!details) return null;

        const duration = parseDuration(details.contentDetails.duration);
        const totalSeconds = (duration.hours * 3600) + (duration.minutes * 60) + duration.seconds;

        if (totalSeconds < 121) return null;

        // Calculate time ago and view count as before
        const publishedDate = new Date(video.snippet.publishedAt);
        const now = new Date();
        const diffTime = Math.abs(now - publishedDate);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
        const diffMinutes = Math.floor(diffTime / (1000 * 60));

        let timeAgo;
        if (diffDays > 0) {
            timeAgo = `${diffDays} ${diffDays === 1 ? 'gün' : 'gün'} önce`;
        } else if (diffHours > 0) {
            timeAgo = `${diffHours} ${diffHours === 1 ? 'saat' : 'saat'} önce`;
        } else {
            timeAgo = `${diffMinutes} ${diffMinutes === 1 ? 'dakika' : 'dakika'} önce`;
        }

        const viewCount = formatViews(parseInt(details.statistics.viewCount));

        return `
            <div class="video-card">
                <a href="https://www.youtube.com/watch?v=${videoId}" target="_blank">
                    <img src="${video.snippet.thumbnails.high.url}" alt="${video.snippet.title}">
                    <div class="video-info">
                        <h3>${video.snippet.title}</h3>
                        <p class="channel-name">${video.channelName}</p>
                        <p>${viewCount} görüntülenme • ${timeAgo}</p>
                    </div>
                </a>
            </div>
        `;
    }));

    // Filter out null entries and join the HTML
    videoGrid.innerHTML = videoCards.filter(card => card !== null).join('');
}

// Search functionality
if (document.getElementById('search-input')) {
    document.getElementById('search-input').addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            const searchTerm = document.getElementById('search-input').value.toLowerCase().trim();
            const filteredVideos = allVideos.filter(video => 
                video.snippet.title.toLowerCase().includes(searchTerm) ||
                video.channelName.toLowerCase().includes(searchTerm)
            );
            displayVideos(filteredVideos);
        }
    });
}

// Add this function for channel suggestions
function addSuggestionButton() {
    const header = document.querySelector('.header');
    const suggestionDiv = document.createElement('div');
    suggestionDiv.className = 'suggestion-container';
    suggestionDiv.innerHTML = `
        <button id="suggest-channel" class="suggest-button">Kanal Öner</button>
        <div id="suggestion-modal" class="modal">
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>Kanal Öner</h2>
                <p>Eklemek istediğiniz kanalın adını veya linkini yazın:</p>
                <input type="text" id="channel-suggestion" placeholder="Kanal adı veya linki">
                <button id="submit-suggestion">Gönder</button>
                <p id="suggestion-message"></p>
            </div>
        </div>
    `;
    header.appendChild(suggestionDiv);

    // Modal functionality
    const modal = document.getElementById('suggestion-modal');
    const btn = document.getElementById('suggest-channel');
    const span = document.getElementsByClassName('close')[0];
    const submitBtn = document.getElementById('submit-suggestion');
    const messageElement = document.getElementById('suggestion-message');

    btn.onclick = () => modal.style.display = 'block';
    span.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => {
        if (event.target === modal) modal.style.display = 'none';
    }

    submitBtn.onclick = async () => {
        const currentTime = Date.now();
        const timeSinceLastSubmission = currentTime - lastSubmissionTime;

        // Check for spam
        if (suggestionCount >= MAX_SUGGESTIONS_PER_SESSION) {
            messageElement.textContent = 'Maksimum öneri sayısına ulaştınız. Lütfen daha sonra tekrar deneyin.';
            messageElement.className = 'error';
            return;
        }

        if (timeSinceLastSubmission < COOLDOWN_TIME) {
            const remainingTime = Math.ceil((COOLDOWN_TIME - timeSinceLastSubmission) / 1000);
            messageElement.textContent = `Lütfen ${remainingTime} saniye bekleyin.`;
            messageElement.className = 'error';
            return;
        }

        const suggestion = document.getElementById('channel-suggestion').value.trim();
        if (!suggestion) {
            messageElement.textContent = 'Lütfen bir kanal adı veya linki girin.';
            messageElement.className = 'error';
            return;
        }

        try {
            const response = await fetch(SUGGESTION_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ suggestion })
            });

            if (response.ok) {
                messageElement.textContent = 'Öneriniz için teşekkürler!';
                messageElement.className = 'success';
                document.getElementById('channel-suggestion').value = '';
                lastSubmissionTime = currentTime;
                suggestionCount++;
            } else {
                throw new Error('Gönderim başarısız');
            }
        } catch (error) {
            messageElement.textContent = 'Bir hata oluştu. Lütfen daha sonra tekrar deneyin.';
            messageElement.className = 'error';
        }
    };
}

// Add this line to create the channel list
document.addEventListener('DOMContentLoaded', () => {
    setupSearch();
    setupSuggestionModal();
    addChannelFilters();
    fetchAllVideos();
});

// Add smooth scrolling for filter clicks
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

function showLoadingState() {
    const videoGrid = document.getElementById('video-grid');
    videoGrid.innerHTML = `
        <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Videolar yükleniyor...</p>
        </div>
    `;
}