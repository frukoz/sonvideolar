import { API_KEY } from './config.js';
const CHANNELS = [
    {
        id: 'UC1PluvjVa3GI5HJhul5lszg',
        name: 'Testo Taylan'
    },
    {
        id: 'UCFr6uAPwrG040QAWDKY0nnA',
        name: 'Htalks'
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
        name: '2crserhatinci'
    },
    {
        id: 'UCXin0u5SrVEBjn5LhOoG97A',
        name: 'Enis Kirazoğlu'
    }
];

const SUGGESTION_ENDPOINT = 'YOUR_ENDPOINT'; // Replace with your actual endpoint
const COOLDOWN_TIME = 60000; // 1 minute cooldown in milliseconds

// Add these variables for spam prevention
let lastSubmissionTime = 0;
let suggestionCount = 0;
const MAX_SUGGESTIONS_PER_SESSION = 3;

document.addEventListener('DOMContentLoaded', () => {
    const videoGrid = document.getElementById('video-grid');
    const searchInput = document.getElementById('search-input');
    let allVideos = [];

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

    async function fetchAllVideos() {
        videoGrid.innerHTML = '<p>Videolar yükleniyor...</p>';
        
        try {
            const videoPromises = CHANNELS.map(channel => fetchChannelVideos(channel));
            const channelVideos = await Promise.all(videoPromises);
            
            allVideos = channelVideos
                .flat()
                .sort((a, b) => new Date(b.snippet.publishedAt) - new Date(a.snippet.publishedAt));
            
            await displayVideos(allVideos);
        } catch (error) {
            console.error('Error fetching all videos:', error);
            videoGrid.innerHTML = '<p>Videolar yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.</p>';
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
            videoGrid.innerHTML = '<p>Video bulunamadı.</p>';
            return;
        }

        videoGrid.innerHTML = '';
        for (const video of videos) {
            const videoId = video.snippet.resourceId.videoId;
            
            const details = await fetchVideoDetails(videoId);
            if (!details) continue;

            const duration = parseDuration(details.contentDetails.duration);
            const totalSeconds = (duration.hours * 3600) + (duration.minutes * 60) + duration.seconds;

            if (totalSeconds < 70) continue;

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

            const videoCard = `
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
            videoGrid.innerHTML += videoCard;
        }
    }

    // Search functionality
    if (searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                const searchTerm = searchInput.value.toLowerCase().trim();
                const filteredVideos = allVideos.filter(video => 
                    video.snippet.title.toLowerCase().includes(searchTerm) ||
                    video.channelName.toLowerCase().includes(searchTerm)
                );
                displayVideos(filteredVideos);
            }
        });
    }

    // Initial load
    fetchAllVideos();

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
}); 