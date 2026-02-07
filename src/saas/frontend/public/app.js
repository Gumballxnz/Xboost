
const API_URL = 'http://localhost:3000/api';

// State Management
let currentUser = null;
let token = localStorage.getItem('xboost_token');

// Init
document.addEventListener('DOMContentLoaded', () => {
    checkUrlToken();
    if (token) {
        fetchProfile();
        fetchCampaigns(); // Carregar histórico
    }

    // Listener de input para custo
    const countInput = document.getElementById('camp-count');
    if (countInput) {
        countInput.addEventListener('input', (e) => {
            document.getElementById('camp-cost').textContent = `${e.target.value} créditos`;
        });
    }
});

function checkUrlToken() {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) {
        token = urlToken;
        localStorage.setItem('xboost_token', token);
        window.history.replaceState({}, document.title, window.location.pathname);
        showToast('Login realizado com sucesso!');
        fetchProfile();
    }
}

async function fetchProfile() {
    try {
        const res = await fetch(`${API_URL}/v1/protected`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            currentUser = data.user;
            updateUI(true);
            document.getElementById('credit-balance').textContent = '50'; // Mock Credits
        } else {
            logout();
        }
    } catch (e) {
        console.error('Auth Error:', e);
    }
}

async function fetchCampaigns() {
    try {
        const res = await fetch(`${API_URL}/v1/campaigns`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const campaigns = await res.json();
            renderCampaignList(campaigns);
        }
    } catch (e) {
        console.error('Fetch Campaigns Error:', e);
    }
}

function updateUI(isLoggedIn) {
    const loginBtns = document.querySelectorAll('[onclick="openLogin()"]');
    const heroCta = document.querySelector('.hero .btn-primary');

    if (isLoggedIn) {
        loginBtns.forEach(btn => {
            btn.textContent = 'Meu Dashboard';
            btn.onclick = openDashboard;
            btn.classList.add('logged-in');
        });

        if (heroCta) {
            heroCta.textContent = 'Nova Campanha';
            heroCta.onclick = openDashboard;
        }

        const headerNav = document.querySelector('.nav-btn-link').parentElement;
        if (!document.getElementById('user-avatar')) {
            const avatar = document.createElement('div');
            avatar.id = 'user-avatar';
            avatar.innerHTML = `<span style="color:var(--text-muted); margin-right:16px; font-weight:500;">${currentUser.name || 'User'}</span>`;
            headerNav.insertBefore(avatar, headerNav.firstChild);
        }
    }
}

function openDashboard(e) {
    if (e) e.preventDefault();
    // Hide Landing / Show Dashboard
    document.querySelector('.hero').style.display = 'none';
    document.querySelector('.stats-section').style.display = 'none';
    const features = document.querySelectorAll('.container.text-center');
    features.forEach(el => el.style.display = 'none'); // Esconde features e pricing

    document.getElementById('dashboard-view').style.display = 'block';
    window.scrollTo(0, 0);
}

async function submitCampaign(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const feedback = document.getElementById('form-feedback');
    const url = document.getElementById('camp-url').value;
    const count = document.getElementById('camp-count').value;

    btn.disabled = true;
    btn.textContent = 'Processando...';
    feedback.textContent = '';
    feedback.style.color = 'var(--text-muted)';

    try {
        const res = await fetch(`${API_URL}/v1/campaigns`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ postUrl: url, commentCount: count })
        });

        const data = await res.json();

        if (res.ok) {
            feedback.textContent = '✅ Campanha lançada com sucesso!';
            feedback.style.color = '#10b981';
            showToast('Campanha criada!');
            fetchCampaigns(); // Refresh list
            e.target.reset();
        } else {
            feedback.textContent = `❌ Erro: ${data.error}`;
            feedback.style.color = '#ef4444';
        }
    } catch (err) {
        feedback.textContent = '❌ Erro de conexão code server';
        feedback.style.color = '#ef4444';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Lançar Campanha';
    }
}

function renderCampaignList(campaigns) {
    const container = document.getElementById('campaign-list');
    if (!campaigns || campaigns.length === 0) {
        container.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted);">Nenhuma campanha encontrada.</div>';
        return;
    }

    let html = '';
    campaigns.forEach(camp => {
        const statusColor = camp.status === 'completed' ? '#10b981' : '#f59e0b';
        html += `
            <div style="padding: 16px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-weight: 600; color: white;">${camp.url.substring(0, 40)}...</div>
                    <div style="font-size: 0.85rem; color: var(--text-muted);">${new Date(camp.date).toLocaleDateString()} • ${camp.count} coments</div>
                </div>
                <div style="font-size: 0.85rem; padding: 4px 12px; border-radius: 100px; background: ${statusColor}20; color: ${statusColor}; border: 1px solid ${statusColor}40;">
                    ${camp.status}
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function logout() {
    localStorage.removeItem('xboost_token');
    token = null;
    currentUser = null;
    window.location.reload();
}

function showToast(msg) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed; bottom: 20px; right: 20px;
        background: #18181b; color: white; padding: 12px 24px;
        border: 1px solid #27272a;
        border-radius: 8px; z-index: 1000; font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
