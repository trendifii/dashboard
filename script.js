const API_BASE = 'https://trendify-kjsm.onrender.com';
let token = localStorage.getItem('adminToken');
let currentSection = 'overview';
let campaigns = [];
let posts = [];
let currentPage = 0;
const limit = 12;
let chartInstances = {};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    if (token) {
        showDashboard();
        loadAllData();
    }
});

// Auth Functions
function showLogin() {
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('registerScreen').classList.add('hidden');
    document.getElementById('otpScreen').classList.add('hidden');
}

function showRegister() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('registerScreen').classList.remove('hidden');
    document.getElementById('otpScreen').classList.add('hidden');
}

function showDashboard() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('registerScreen').classList.add('hidden');
    document.getElementById('otpScreen').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const res = await fetch(`${API_BASE}/api/v1/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        
        if (res.ok && data.access_token) {
            token = data.access_token;
            localStorage.setItem('adminToken', token);
            showDashboard();
            loadAllData();
            showToast('success', 'Welcome back!', 'Successfully logged in.');
        } else {
            showToast('error', 'Login Failed', data.detail || 'Invalid credentials');
        }
    } catch (err) {
        showToast('error', 'Error', 'Could not connect to server');
    }
});

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const full_name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    
    try {
        const res = await fetch(`${API_BASE}/api/v1/admin/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ full_name, email, password })
        });
        
        if (res.ok) {
            document.getElementById('otpEmail').value = email;
            document.getElementById('registerScreen').classList.add('hidden');
            document.getElementById('otpScreen').classList.remove('hidden');
            showToast('success', 'Registered!', 'Please verify your email with OTP.');
        } else {
            const data = await res.json();
            showToast('error', 'Registration Failed', data.detail || 'Could not register');
        }
    } catch (err) {
        showToast('error', 'Error', 'Could not connect to server');
    }
});

document.getElementById('otpForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('otpEmail').value;
    const otp = document.getElementById('otpCode').value;
    
    try {
        const res = await fetch(`${API_BASE}/api/v1/admin/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp })
        });
        
        if (res.ok) {
            showToast('success', 'Verified!', 'You can now log in.');
            showLogin();
        } else {
            showToast('error', 'Invalid OTP', 'Please check your code and try again.');
        }
    } catch (err) {
        showToast('error', 'Error', 'Could not verify OTP');
    }
});

async function resendOTP() {
    const email = document.getElementById('otpEmail').value;
    try {
        await fetch(`${API_BASE}/api/v1/user/resend-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        showToast('success', 'OTP Resent', 'Check your email for the new code.');
    } catch (err) {
        showToast('error', 'Error', 'Could not resend OTP');
    }
}

function logout() {
    localStorage.removeItem('adminToken');
    token = null;
    location.reload();
}

async function deleteAccount() {
    if (!confirm('Are you sure you want to delete your admin account? This cannot be undone.')) return;
    
    try {
        const res = await fetch(`${API_BASE}/api/v1/admin/delete`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
            showToast('success', 'Account Deleted', 'Your account has been removed.');
            logout();
        } else {
            showToast('error', 'Error', 'Could not delete account');
        }
    } catch (err) {
        showToast('error', 'Error', 'Could not connect to server');
    }
}

// Navigation
function showSection(section) {
    document.querySelectorAll('[id^="section-"]').forEach(el => el.classList.add('hidden'));
    document.getElementById(`section-${section}`).classList.remove('hidden');
    document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
    document.getElementById(`nav-${section}`).classList.add('active');

    const titles = {
        overview: 'Dashboard Overview',
        campaigns: 'Campaign Management',
        posts: 'Posts & Scoring',
        analytics: 'Analytics & Reports',
        settings: 'Settings'
    };
    document.getElementById('pageTitle').textContent = titles[section];
    currentSection = section;
    closeSidebar();

    if (section === 'campaigns') loadCampaigns();
    if (section === 'posts') loadPosts();
    if (section === 'analytics') loadAnalytics();
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('-translate-x-full');
    document.getElementById('sidebarOverlay').classList.toggle('hidden');
}

function closeSidebar() {
    document.getElementById('sidebar').classList.add('-translate-x-full');
    document.getElementById('sidebarOverlay').classList.add('hidden');
}

// Data Loading
async function loadAllData() {
    await Promise.all([loadCampaigns(), loadPosts()]);
    updateOverview();
}

async function apiCall(endpoint, options = {}) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
            'Authorization': `Bearer ${token}`,
            ...options.headers
        }
    });
    if (res.status === 401) {
        logout();
        return null;
    }
    return res;
}

async function loadCampaigns() {
    try {
        const res = await apiCall('/api/v1/admin/campaigns');
        if (!res) return;
        campaigns = await res.json();
        renderCampaigns();
        updateOverview();
    } catch (err) {
        showToast('error', 'Error', 'Failed to load campaigns');
    }
}

async function loadPosts() {
    try {
        const res = await apiCall(`/api/v1/admin/posts?skip=${currentPage * limit}&limit=${limit}`);
        if (!res || !res.ok) {
            renderPosts();
            return;
        }
        const data = await res.json();
        posts = Array.isArray(data) ? data : [];
        renderPosts();
        updateOverview();
    } catch (err) {
        renderPosts();
        showToast('error', 'Error', 'Failed to load posts');
    }
}

function updateOverview() {
    document.getElementById('totalCampaigns').textContent = campaigns.length;
    document.getElementById('totalPosts').textContent = posts.length;
    
    const totalBudget = campaigns.reduce((sum, c) => sum + (c.amount_allocated || 0), 0);
    document.getElementById('totalBudget').textContent = `€${totalBudget.toLocaleString()}`;
    
    const scoredPosts = posts.filter(p => p.score !== null);
    const avgScore = scoredPosts.length ? (scoredPosts.reduce((sum, p) => sum + (p.score || 0), 0) / scoredPosts.length).toFixed(1) : 0;
    document.getElementById('avgScore').textContent = avgScore;
    
    renderCampaignChart();
    renderRecentActivity();
}

// Rendering
function renderCampaigns(filter = 'all') {
    const tbody = document.getElementById('campaignsTable');
    let filtered = campaigns;
    if (filter !== 'all') filtered = campaigns.filter(c => c.campaign_status === filter);
    
    if (!filtered.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center text-gray-400">No campaigns found</td></tr>`;
        return;
    }
    
    tbody.innerHTML = filtered.map(c => `
        <tr class="hover:bg-gray-50 transition">
            <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-lg overflow-hidden bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                        ${c.brand_image_url
                            ? `<img src="${c.brand_image_url}" class="w-full h-full object-cover" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-bullhorn\\'></i>'">`
                            : `<i class="fas fa-bullhorn"></i>`}
                    </div>
                    <div>
                        <p class="font-medium text-gray-800">${c.name}</p>
                        <p class="text-xs text-gray-500">${(c.owner_email || '').split('@')[0]}</p>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 text-sm text-gray-600">${c.category}</td>
            <td class="px-6 py-4">
                <span class="px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(c.campaign_status)}">
                    ${c.campaign_status}
                </span>
            </td>
            <td class="px-6 py-4 text-sm text-gray-600">€${(c.amount_allocated || 0).toLocaleString()}</td>
            <td class="px-6 py-4 text-sm text-gray-600">
                <div>${new Date(c.start_date).toLocaleDateString()}</div>
                <div class="text-xs text-gray-400">to ${new Date(c.end_date).toLocaleDateString()}</div>
            </td>
            <td class="px-6 py-4 text-right">
                <button onclick="deleteCampaign('${c._id}')" class="text-red-500 hover:text-red-700 p-2">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function getStatusColor(status) {
    const colors = {
        draft: 'bg-gray-100 text-gray-600',
        active: 'bg-green-100 text-green-600',
        paused: 'bg-yellow-100 text-yellow-600',
        completed: 'bg-blue-100 text-blue-600',
        cancelled: 'bg-red-100 text-red-600'
    };
    return colors[status] || colors.draft;
}

function renderPosts(filter = 'all') {
    const grid = document.getElementById('postsGrid');
    let filtered = posts;
    if (filter === 'pending') filtered = posts.filter(p => p.score === null);
    if (filter === 'scored') filtered = posts.filter(p => p.score !== null);
    
    if (!filtered.length) {
        grid.innerHTML = `<div class="col-span-full text-center py-12 text-gray-400">No posts found</div>`;
        document.getElementById('pagination').classList.add('hidden');
        return;
    }
    
    grid.innerHTML = filtered.map(p => `
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition">
            <div class="h-48 bg-gray-100 relative">
                ${p.image_url ? `<img src="${p.image_url}" class="w-full h-full object-cover" onerror="this.parentElement.innerHTML='<div class=\'flex items-center justify-center h-full text-gray-400\'><i class=\'fas fa-image text-4xl\'></i></div>'">` : 
                `<div class="flex items-center justify-center h-full text-gray-400"><i class="fas fa-image text-4xl"></i></div>`}
                <div class="absolute top-2 right-2">
                    <span class="px-2 py-1 bg-black/50 text-white text-xs rounded-full backdrop-blur-sm">
                        <i class="fab fa-${(p.social_media || '').toLowerCase()} mr-1"></i>${p.social_media || 'Unknown'}
                    </span>
                </div>
            </div>
            <div class="p-4">
                <div class="flex items-center gap-2 mb-2">
                    <div class="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-xs text-indigo-600 font-bold">
                        ${(p.user_email || '?').charAt(0).toUpperCase()}
                    </div>
                    <span class="text-sm text-gray-600 truncate">${p.user_email || 'Unknown'}</span>
                </div>
                <p class="text-sm text-gray-800 line-clamp-2 mb-3">${p.caption || ''}</p>
                <div class="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <span><i class="fas fa-eye mr-1"></i>${p.view_count || 0}</span>
                    <span><i class="fas fa-heart mr-1"></i>${p.like_count || 0}</span>
                    <span><i class="fas fa-comment mr-1"></i>${p.comment_count || 0}</span>
                </div>
                <div class="flex items-center justify-between mb-3">
                    <div class="text-sm">
                        ${p.score !== null ?
                            `<span class="text-green-600 font-semibold"><i class="fas fa-star mr-1"></i>${p.score}</span>` :
                            `<span class="text-gray-400">Not scored</span>`
                        }
                    </div>
                    <button onclick="openScoreModal('${p.id}')" class="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-medium hover:bg-indigo-100 transition">
                        ${p.score !== null ? 'Re-score' : 'Score'}
                    </button>
                </div>
                <div class="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span class="text-xs text-gray-500">Final Price</span>
                    <span class="text-sm font-semibold ${p.final_price != null ? 'text-indigo-600' : 'text-gray-400'}">
                        ${p.final_price != null ? `€${Number(p.final_price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                    </span>
                </div>
            </div>
        </div>
    `).join('');
    
    document.getElementById('pagination').classList.remove('hidden');
    document.getElementById('pageInfo').textContent = `Page ${currentPage + 1}`;
    document.getElementById('prevPage').disabled = currentPage === 0;
    document.getElementById('nextPage').disabled = posts.length < limit;
}

function renderRecentActivity() {
    const container = document.getElementById('recentActivity');
    const allItems = [
        ...campaigns.slice(0, 3).map(c => ({
            icon: 'fa-bullhorn',
            color: 'bg-blue-50 text-blue-600',
            text: `Campaign "${c.name}" created`,
            time: new Date(c.created_at).toLocaleDateString()
        })),
        ...posts.slice(0, 3).map(p => ({
            icon: 'fa-photo-video',
            color: 'bg-purple-50 text-purple-600',
            text: `New post by ${p.user_email}`,
            time: new Date(p.created_at).toLocaleDateString()
        }))
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 5);
    
    if (!allItems.length) {
        container.innerHTML = '<div class="text-gray-400 text-center py-8">No recent activity</div>';
        return;
    }
    
    container.innerHTML = allItems.map(item => `
        <div class="flex items-start gap-3">
            <div class="w-8 h-8 ${item.color} rounded-lg flex items-center justify-center flex-shrink-0">
                <i class="fas ${item.icon} text-sm"></i>
            </div>
            <div class="flex-1">
                <p class="text-sm text-gray-800">${item.text}</p>
                <p class="text-xs text-gray-400">${item.time}</p>
            </div>
        </div>
    `).join('');
}

// Charts
function renderCampaignChart() {
    const canvas = document.getElementById('campaignChart');
    if (chartInstances.campaign) chartInstances.campaign.destroy();

    if (!campaigns.length) {
        showChartEmptyState(canvas, 'No campaign data available');
        return;
    }

    clearChartEmptyState(canvas);

    const statusCounts = {};
    campaigns.forEach(c => {
        const status = c.campaign_status || 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    const ctx = canvas.getContext('2d');
    chartInstances.campaign = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(statusCounts),
            datasets: [{
                data: Object.values(statusCounts),
                backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ef4444']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

function showChartEmptyState(canvas, message) {
    canvas.style.display = 'none';
    const wrapper = canvas.parentElement;
    if (!wrapper.querySelector('.no-data-msg')) {
        const msg = document.createElement('p');
        msg.className = 'no-data-msg text-center text-gray-400 flex items-center justify-center h-full';
        msg.textContent = message;
        wrapper.appendChild(msg);
    }
}

function clearChartEmptyState(canvas) {
    canvas.style.display = '';
    const existing = canvas.parentElement.querySelector('.no-data-msg');
    if (existing) existing.remove();
}

async function loadAnalytics() {
    const platformCounts = {};
    posts.forEach(p => {
        const platform = p.social_media || 'unknown';
        platformCounts[platform] = (platformCounts[platform] || 0) + 1;
    });

    const engagementCanvas = document.getElementById('engagementChart');
    if (chartInstances.engagement) chartInstances.engagement.destroy();

    if (!posts.length) {
        showChartEmptyState(engagementCanvas, 'No post data available');
    } else {
        clearChartEmptyState(engagementCanvas);
        chartInstances.engagement = new Chart(engagementCanvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: posts.slice(0, 10).map((_, i) => `Post ${i + 1}`),
                datasets: [
                    { label: 'Views', data: posts.slice(0, 10).map(p => p.view_count || 0), backgroundColor: '#6366f1' },
                    { label: 'Likes', data: posts.slice(0, 10).map(p => p.like_count || 0), backgroundColor: '#ec4899' },
                    { label: 'Comments', data: posts.slice(0, 10).map(p => p.comment_count || 0), backgroundColor: '#10b981' }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true } }
            }
        });
    }

    const platformCanvas = document.getElementById('platformChart');
    if (chartInstances.platform) chartInstances.platform.destroy();

    if (!Object.keys(platformCounts).length) {
        showChartEmptyState(platformCanvas, 'No platform data available');
    } else {
        clearChartEmptyState(platformCanvas);
        chartInstances.platform = new Chart(platformCanvas.getContext('2d'), {
            type: 'pie',
            data: {
                labels: Object.keys(platformCounts),
                datasets: [{
                    data: Object.values(platformCounts),
                    backgroundColor: ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#3b82f6', '#14b8a6']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } }
            }
        });
    }
    
    const totalViews = posts.reduce((sum, p) => sum + (p.view_count || 0), 0);
    const totalLikes = posts.reduce((sum, p) => sum + (p.like_count || 0), 0);
    const totalComments = posts.reduce((sum, p) => sum + (p.comment_count || 0), 0);
    
    document.getElementById('metricsTable').innerHTML = `
        <tr class="hover:bg-gray-50"><td class="px-6 py-3 text-sm text-gray-800">Total Views</td><td class="px-6 py-3 text-sm font-semibold text-indigo-600">${totalViews.toLocaleString()}</td><td class="px-6 py-3"><span class="text-green-500 text-sm"><i class="fas fa-arrow-up"></i> Engagement</span></td></tr>
        <tr class="hover:bg-gray-50"><td class="px-6 py-3 text-sm text-gray-800">Total Likes</td><td class="px-6 py-3 text-sm font-semibold text-pink-600">${totalLikes.toLocaleString()}</td><td class="px-6 py-3"><span class="text-green-500 text-sm"><i class="fas fa-arrow-up"></i> Engagement</span></td></tr>
        <tr class="hover:bg-gray-50"><td class="px-6 py-3 text-sm text-gray-800">Total Comments</td><td class="px-6 py-3 text-sm font-semibold text-green-600">${totalComments.toLocaleString()}</td><td class="px-6 py-3"><span class="text-green-500 text-sm"><i class="fas fa-arrow-up"></i> Engagement</span></td></tr>
        <tr class="hover:bg-gray-50"><td class="px-6 py-3 text-sm text-gray-800">Scored Posts</td><td class="px-6 py-3 text-sm font-semibold text-blue-600">${posts.filter(p => p.score !== null).length}</td><td class="px-6 py-3"><span class="text-gray-400 text-sm">Pending: ${posts.filter(p => p.score === null).length}</span></td></tr>
    `;
}

// Actions
function filterCampaigns(status) {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active', 'bg-indigo-600', 'text-white', 'hover:bg-indigo-700');
        btn.classList.add('bg-white', 'text-gray-600', 'hover:bg-gray-50');
    });
    event.target.classList.add('active', 'bg-indigo-600', 'text-white', 'hover:bg-indigo-700');
    event.target.classList.remove('bg-white', 'text-gray-600', 'hover:bg-gray-50');
    renderCampaigns(status);
}

function filterPosts(status) {
    document.querySelectorAll('.post-filter').forEach(btn => {
        btn.classList.remove('active', 'bg-indigo-50', 'text-indigo-600');
        btn.classList.add('text-gray-600');
    });
    event.target.classList.add('active', 'bg-indigo-50', 'text-indigo-600');
    event.target.classList.remove('text-gray-600');
    renderPosts(status);
}

function changePage(delta) {
    currentPage += delta;
    if (currentPage < 0) currentPage = 0;
    loadPosts();
}

function refreshPosts() {
    loadPosts();
    showToast('success', 'Refreshed', 'Posts updated successfully');
}

function openCampaignModal() {
    const todayLocal = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    document.querySelector('[name="start_date"]').min = todayLocal;
    document.querySelector('[name="end_date"]').min = todayLocal;
    document.getElementById('campaignModal').classList.add('active');
}

function closeCampaignModal() {
    document.getElementById('campaignModal').classList.remove('active');
    document.getElementById('campaignForm').reset();
}

document.getElementById('campaignForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
        const res = await fetch(`${API_BASE}/api/v1/admin/campaigns`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        
        if (res.ok) {
            closeCampaignModal();
            loadCampaigns();
            showToast('success', 'Campaign Created', 'Your campaign has been created successfully.');
        } else {
            const data = await res.json();
            showToast('error', 'Error', data.detail || 'Could not create campaign');
        }
    } catch (err) {
        showToast('error', 'Error', 'Could not connect to server');
    }
});

async function deleteCampaign(id) {
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    
    try {
        const res = await apiCall(`/api/v1/admin/campaigns/${id}`, { method: 'DELETE' });
        if (res && res.ok) {
            loadCampaigns();
            showToast('success', 'Deleted', 'Campaign removed successfully');
        } else {
            showToast('error', 'Error', 'Could not delete campaign');
        }
    } catch (err) {
        showToast('error', 'Error', 'Could not connect to server');
    }
}

let scoringPostId = null;
function openScoreModal(postId) {
    scoringPostId = postId;
    document.getElementById('scorePostId').textContent = postId;
    document.getElementById('scoreModal').classList.add('active');
}

function closeScoreModal() {
    document.getElementById('scoreModal').classList.remove('active');
    scoringPostId = null;
}

async function confirmScore() {
    if (!scoringPostId) return;
    
    try {
        const res = await fetch(`${API_BASE}/api/v1/admin/posts/score`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({ post_id: scoringPostId })
        });
        
        if (res.ok) {
            closeScoreModal();
            loadPosts();
            showToast('success', 'Scored!', 'Post has been scored successfully.');
        } else {
            const data = await res.json();
            showToast('error', 'Error', data.detail || 'Could not score post');
        }
    } catch (err) {
        showToast('error', 'Error', 'Could not connect to server');
    }
}

// Toast
function showToast(type, title, message) {
    const toast = document.getElementById('toast');
    const icon = document.getElementById('toastIcon');
    const titleEl = document.getElementById('toastTitle');
    const msgEl = document.getElementById('toastMessage');
    
    titleEl.textContent = title;
    msgEl.textContent = message;
    
    if (type === 'success') {
        icon.className = 'w-8 h-8 rounded-full flex items-center justify-center bg-green-100 text-green-600';
        icon.innerHTML = '<i class="fas fa-check"></i>';
    } else {
        icon.className = 'w-8 h-8 rounded-full flex items-center justify-center bg-red-100 text-red-600';
        icon.innerHTML = '<i class="fas fa-exclamation"></i>';
    }
    
    toast.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-2');
    setTimeout(() => toast.classList.add('opacity-0', 'pointer-events-none', 'translate-y-2'), 3000);
}