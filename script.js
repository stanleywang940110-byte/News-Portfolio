document.addEventListener('DOMContentLoaded', () => {
    const portfolioGrid = document.getElementById('portfolioGrid');
    const errorToast = document.getElementById('error-message');
    
    const openAddBtn = document.getElementById('openAddBtn');
    const addPanel = document.getElementById('addPanel');
    const cancelAddBtn = document.getElementById('cancelAddBtn');
    const confirmAddBtn = document.getElementById('confirmAddBtn');
    const batchUrlInput = document.getElementById('batchUrlInput');
    const categorySelect = document.getElementById('categorySelect');

    let works = JSON.parse(localStorage.getItem('newsPortfolio')) || [];
    let currentFilter = '全部';
    let currentSearch = '';

    renderWorks();

    // 新增面板邏輯
    openAddBtn.addEventListener('click', () => openAddPanel());
    cancelAddBtn.addEventListener('click', closeAddPanel);
    
    function openAddPanel(url = '') {
        addPanel.style.display = 'flex';
        batchUrlInput.value = url;
        batchUrlInput.focus();
        document.body.style.overflow = 'hidden';
    }

    function closeAddPanel() {
        addPanel.style.display = 'none';
        document.body.style.overflow = '';
    }

    confirmAddBtn.addEventListener('click', async () => {
        const rawUrls = batchUrlInput.value.split('\n').map(u => u.trim()).filter(u => u.length > 0);
        const category = categorySelect.value;

        if (rawUrls.length === 0) return;

        confirmAddBtn.disabled = true;
        confirmAddBtn.textContent = '處理中...';

        let successCount = 0;
        for (const url of rawUrls) {
            if (works.some(w => w.url === url)) continue;
            try {
                await addWork(url, category);
                successCount++;
            } catch (err) {
                console.error(`Failed to add ${url}`, err);
            }
        }

        confirmAddBtn.disabled = false;
        confirmAddBtn.textContent = '確認新增';
        closeAddPanel();
        renderWorks();
    });

    async function addWork(url, category) {
        try {
            const metadata = await fetchMetadata(url);
            const newWork = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                url: url,
                category: category,
                title: metadata.title || '未知標題',
                description: metadata.description || '該報導未提供簡介。',
                image: metadata.image || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&q=80'
            };
            works.unshift(newWork);
            saveWorks();
        } catch (error) {
            throw error;
        }
    }

    async function fetchMetadata(url) {
        const proxyUrl = `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('Network response was not ok');
        const htmlText = await response.text();
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');
        const getMeta = (propName) => {
            let meta = doc.querySelector(`meta[property="${propName}"]`) || doc.querySelector(`meta[name="${propName}"]`);
            return meta ? meta.getAttribute('content') : null;
        };

        let title = getMeta('og:title') || getMeta('twitter:title') || doc.title || '';
        let description = getMeta('og:description') || getMeta('twitter:description') || getMeta('description') || '';
        let image = getMeta('og:image') || getMeta('twitter:image') || '';

        if (image && !image.startsWith('http')) {
            try {
                const urlObj = new URL(url);
                image = `${urlObj.protocol}//${urlObj.host}${image.startsWith('/') ? '' : '/'}${image}`;
            } catch (e) {}
        }

        return { 
            title: title.replace(/\s+/g, ' ').trim(), 
            description: description.replace(/\s+/g, ' ').trim(), 
            image 
        };
    }

    function renderWorks() {
        portfolioGrid.innerHTML = '';
        
        // 篩選分類
        let filtered = currentFilter === '全部' ? works : works.filter(w => w.category === currentFilter);
        
        if (filtered.length === 0) {
            portfolioGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 6rem 2rem; color: #94A3B8;">
                    <p>目前沒有作品</p>
                </div>
            `;
            return;
        }

        filtered.forEach((work, index) => {
            const card = document.createElement('div');
            card.className = 'card';
            card.style.animationDelay = `${index * 0.05}s`;
            
            const badgeHtml = work.category ? `<span class="category-badge">${work.category}</span>` : '';

            card.innerHTML = `
                <a href="${work.url}" target="_blank" class="card-img-wrapper" title="點擊閱讀原文">
                    ${badgeHtml}
                    <img src="${work.image}" alt="Thumbnail" class="card-img" onerror="this.src='https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&q=80'">
                </a>
                <div class="card-content">
                    <h3 class="card-title" title="${work.title}">${work.title}</h3>
                    <p class="card-desc">${work.description}</p>
                    <a href="${work.url}" target="_blank" class="card-link">閱讀報導 ↗</a>
                </div>
                <button class="delete-btn" data-id="${work.id}">×</button>
            `;
            portfolioGrid.appendChild(card);
        });

        // 綁定刪除按鈕
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                works = works.filter(w => w.id !== id);
                saveWorks();
                renderWorks();
            });
        });
    }

    // 分類篩選
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.getAttribute('data-filter');
            renderWorks();
        });
    });

    function saveWorks() {
        localStorage.setItem('newsPortfolio', JSON.stringify(works));
    }

    function showError(message) {
        errorToast.textContent = message;
        errorToast.classList.add('show');
        setTimeout(() => errorToast.classList.remove('show'), 3000);
    }
});
