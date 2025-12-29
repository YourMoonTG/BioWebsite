// Модуль для работы со списком статей блога
console.log('[blog] blog.js loaded');

class BlogManager {
    constructor() {
        this.articles = [];
        this.filteredArticles = [];
        this.currentFilter = null;
        this.currentSearch = '';
        this.sortOrder = 'desc'; // 'desc' | 'asc'
        this.container = null;
        this.cacheKey = 'blog_articles_cache';
        this.cacheExpiry = 1000 * 60 * 60; // 1 час
    }

    // Инициализация модуля
    async init(containerSelector) {
        console.log('[blog] init...');
        
        this.container = document.querySelector(containerSelector);
        if (!this.container) {
            console.error('[blog] container not found:', containerSelector);
            return;
        }

        // Очищаем устаревший кэш при инициализации
        this.invalidateOldCache();

        // Загружаем статьи
        await this.loadArticles();
        
        // Рендерим список
        this.render();
        
        // Инициализируем фильтры и поиск
        this.initFilters();
        this.initSearch();
        
        console.log('[blog] initialized');
    }

    // Загрузка статей из JSON
    async loadArticles() {
        console.log('[blog] loading articles...');
        
        // Всегда загружаем свежие данные с сервера, но используем кэш как fallback
        try {
            const response = await fetch('blog/articles.json?t=' + Date.now()); // Добавляем timestamp для обхода кэша браузера
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            let articles = data.articles || [];
            
            // Фильтруем только опубликованные статьи
            articles = articles.filter(article => article.status === 'published');
            
            // Сортируем по дате
            this.articles = articles;
            this.sortArticles();
            
            // Проверяем, изменились ли данные, сравнивая хеш
            const newHash = this.hashArticles(this.articles);
            const cachedHash = this.getCachedHash();
            
            // Сохраняем в кэш только если данные изменились
            if (newHash !== cachedHash) {
                console.log('[blog] articles data changed, updating cache');
                this.cacheArticles(this.articles);
            }
            
            this.filteredArticles = [...this.articles];
            
            console.log(`[blog] loaded ${this.articles.length} articles`);
        } catch (error) {
            console.error('[blog] error loading articles:', error);
            // В случае ошибки используем кэш как fallback
            const cached = this.getCachedArticles();
            if (cached) {
                console.log('[blog] using cached articles as fallback');
                this.articles = cached;
                this.filteredArticles = [...this.articles];
            } else {
                this.articles = [];
                this.filteredArticles = [];
            }
        }
    }

    // Сортировка статей по дате
    sortArticles() {
        this.articles.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            
            if (this.sortOrder === 'desc') {
                return dateB - dateA; // Новые сверху
            } else {
                return dateA - dateB; // Старые сверху
            }
        });
    }

    // Рендеринг списка статей
    render() {
        if (!this.container) return;
        
        console.log('[blog] rendering articles...');
        
        if (this.filteredArticles.length === 0) {
            this.container.innerHTML = `
                <div class="blog-empty">
                    <p>Статьи не найдены</p>
                </div>
            `;
            return;
        }

        const articlesHTML = this.filteredArticles.map(article => this.renderArticleCard(article)).join('');
        
        this.container.innerHTML = `
            <div class="articles-grid">
                ${articlesHTML}
            </div>
        `;

        // Добавляем анимации появления
        const cards = this.container.querySelectorAll('.article-card');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            setTimeout(() => {
                card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }

    // Рендеринг карточки статьи
    renderArticleCard(article) {
        const iconPath = `assets/icons/${article.icon}`;
        const articleUrl = article.contentFile;
        const formattedDate = this.formatDate(article.date);
        const tagsHTML = article.tags.map(tag => 
            `<span class="article-tag" data-tag="${tag}">${tag}</span>`
        ).join('');

        return `
            <a href="${articleUrl}" class="article-card article-link">
                <div class="article-image">
                    <div class="article-placeholder">
                        <img class="icon-img icon-64" src="${iconPath}" alt="${article.title}">
                    </div>
                </div>
                <div class="article-content">
                    <div class="article-meta">
                        <span class="article-date">${formattedDate}</span>
                        <span class="article-read-time">${article.readTime} мин</span>
                    </div>
                    <h3 class="article-title">${article.title}</h3>
                    <p class="article-excerpt">${article.excerpt}</p>
                    <div class="article-tags">
                        ${tagsHTML}
                    </div>
                </div>
            </a>
        `;
    }

    // Форматирование даты
    formatDate(dateString) {
        const date = new Date(dateString);
        const months = [
            'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
            'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
        ];
        
        const day = date.getDate();
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        
        return `${day} ${month} ${year}`;
    }

    // Инициализация фильтров по тегам
    initFilters() {
        const filterContainer = document.querySelector('.blog-filters');
        if (!filterContainer) return;

        // Получаем все уникальные теги
        const allTags = new Set();
        this.articles.forEach(article => {
            article.tags.forEach(tag => allTags.add(tag));
        });

        // Рендерим облако тегов
        const tagsHTML = Array.from(allTags).map(tag => 
            `<button class="filter-tag" data-tag="${tag}">${tag}</button>`
        ).join('');

        filterContainer.innerHTML = `
            <div class="filter-tags">
                <button class="filter-tag filter-tag-all active" data-tag="all">Все</button>
                ${tagsHTML}
            </div>
        `;

        // Обработчики кликов
        filterContainer.querySelectorAll('.filter-tag').forEach(button => {
            button.addEventListener('click', () => {
                const tag = button.dataset.tag;
                this.filterByTag(tag);
                
                // Обновляем активное состояние
                filterContainer.querySelectorAll('.filter-tag').forEach(btn => {
                    btn.classList.remove('active');
                });
                button.classList.add('active');
            });
        });
    }

    // Фильтрация по тегу
    filterByTag(tag) {
        console.log('[blog] filtering by tag:', tag);
        
        this.currentFilter = tag === 'all' ? null : tag;
        this.applyFilters();
    }

    // Применение всех фильтров
    applyFilters() {
        let filtered = [...this.articles];

        // Фильтр по тегу
        if (this.currentFilter) {
            filtered = filtered.filter(article => 
                article.tags.includes(this.currentFilter)
            );
        }

        // Поиск
        if (this.currentSearch) {
            const searchLower = this.currentSearch.toLowerCase();
            filtered = filtered.filter(article => 
                article.title.toLowerCase().includes(searchLower) ||
                article.excerpt.toLowerCase().includes(searchLower) ||
                article.tags.some(tag => tag.toLowerCase().includes(searchLower))
            );
        }

        this.filteredArticles = filtered;
        this.render();
    }

    // Инициализация поиска
    initSearch() {
        const searchInput = document.querySelector('.blog-search-input');
        if (!searchInput) return;

        searchInput.addEventListener('input', (e) => {
            this.currentSearch = e.target.value.trim();
            this.applyFilters();
        });
    }

    // Поиск по статьям
    search(query) {
        this.currentSearch = query;
        this.applyFilters();
    }

    // Сортировка по дате
    sortByDate(order) {
        this.sortOrder = order;
        this.sortArticles();
        this.applyFilters();
    }

    // Кэширование
    cacheArticles(articles) {
        // Вычисляем хеш статей для валидации кэша
        const articlesHash = this.hashArticles(articles);
        const cacheData = {
            articles: articles,
            timestamp: Date.now(),
            hash: articlesHash
        };
        try {
            localStorage.setItem(this.cacheKey, JSON.stringify(cacheData));
        } catch (e) {
            console.warn('[blog] failed to cache articles:', e);
        }
    }

    getCachedArticles() {
        try {
            const cached = localStorage.getItem(this.cacheKey);
            if (!cached) return null;

            const cacheData = JSON.parse(cached);
            const age = Date.now() - cacheData.timestamp;

            if (age > this.cacheExpiry) {
                localStorage.removeItem(this.cacheKey);
                return null;
            }

            return cacheData.articles;
        } catch (e) {
            console.warn('[blog] failed to read cache:', e);
            return null;
        }
    }

    getCachedHash() {
        try {
            const cached = localStorage.getItem(this.cacheKey);
            if (!cached) return null;
            const cacheData = JSON.parse(cached);
            return cacheData.hash || null;
        } catch (e) {
            return null;
        }
    }

    // Создание простого хеша статей для валидации кэша
    hashArticles(articles) {
        // Простой хеш на основе количества статей и их ID
        const ids = articles.map(a => a.id).sort().join(',');
        return ids.length + '-' + ids.substring(0, 50);
    }

    // Очистка кэша
    clearCache() {
        localStorage.removeItem(this.cacheKey);
        console.log('[blog] cache cleared');
    }

    // Инвалидация устаревшего кэша (без хеша)
    invalidateOldCache() {
        try {
            const cached = localStorage.getItem(this.cacheKey);
            if (!cached) return;
            
            const cacheData = JSON.parse(cached);
            // Если в кэше нет хеша, значит это старый формат - очищаем
            if (!cacheData.hash) {
                console.log('[blog] invalidating old cache format');
                localStorage.removeItem(this.cacheKey);
            }
        } catch (e) {
            // При ошибке просто очищаем кэш
            localStorage.removeItem(this.cacheKey);
        }
    }
}

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    const blogContainer = document.querySelector('#articles-list');
    if (blogContainer) {
        const blogManager = new BlogManager();
        blogManager.init('#articles-list');
        
        // Экспортируем для использования в других модулях
        window.BlogManager = blogManager;
    }
});

// Экспорт класса
window.BlogManager = BlogManager;

