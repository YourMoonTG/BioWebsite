// Модуль для работы с отдельной статьей
console.log('[article] article.js loaded');

class ArticleManager {
    constructor() {
        this.currentArticleId = null;
        this.currentArticle = null;
        this.allArticles = [];
        this.articlesCache = null;
    }

    // Инициализация модуля
    async init() {
        console.log('[article] init...');
        
        // Извлекаем метаданные из <head>
        this.currentArticleId = this.getMetaContent('article-id');
        
        if (!this.currentArticleId) {
            console.warn('[article] article-id not found in meta tags');
            return;
        }

        // Загружаем все статьи для навигации
        await this.loadAllArticles();
        
        // Находим текущую статью
        this.currentArticle = this.allArticles.find(a => a.id === this.currentArticleId);
        
        if (!this.currentArticle) {
            console.warn('[article] article not found in articles.json:', this.currentArticleId);
            return;
        }

        // Обновляем метаданные на странице
        this.updateArticleMeta();
        
        // Инициализируем навигацию
        this.initNavigation();
        
        // Загружаем связанные статьи
        this.loadRelatedArticles();
        
        console.log('[article] initialized');
    }

    // Извлечение метаданных из <head>
    getMetaContent(name) {
        const meta = document.querySelector(`meta[name="${name}"]`);
        return meta ? meta.getAttribute('content') : null;
    }

    // Загрузка всех статей из JSON
    async loadAllArticles() {
        console.log('[article] loading all articles...');
        
        try {
            const response = await fetch('../blog/articles.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            this.allArticles = (data.articles || []).filter(a => a.status === 'published');
            
            // Сортируем по дате
            this.allArticles.sort((a, b) => {
                return new Date(b.date) - new Date(a.date);
            });
            
            console.log(`[article] loaded ${this.allArticles.length} articles`);
        } catch (error) {
            console.error('[article] error loading articles:', error);
            this.allArticles = [];
        }
    }

    // Обновление метаданных на странице
    updateArticleMeta() {
        if (!this.currentArticle) return;

        // Обновляем заголовок страницы
        document.title = `${this.currentArticle.title} - Moon`;

        // Обновляем SEO мета-теги
        this.updateSEOTags();

        // Обновляем дату
        const dateElement = document.getElementById('article-date');
        if (dateElement) {
            dateElement.textContent = this.formatDate(this.currentArticle.date);
        }

        // Обновляем время чтения
        const readTimeElement = document.getElementById('article-read-time');
        if (readTimeElement) {
            readTimeElement.textContent = `${this.currentArticle.readTime} мин чтения`;
        }

        // Обновляем заголовок статьи
        const titleElement = document.getElementById('article-title');
        if (titleElement) {
            titleElement.textContent = this.currentArticle.title;
        }

        // Обновляем теги
        const tagsElement = document.getElementById('article-tags');
        if (tagsElement && this.currentArticle.tags) {
            tagsElement.innerHTML = this.currentArticle.tags.map(tag => 
                `<span class="article-tag">${tag}</span>`
            ).join('');
        }
    }

    // Обновление SEO тегов
    updateSEOTags() {
        if (!this.currentArticle) return;

        const baseUrl = 'https://yourmoontg.github.io';
        const articleUrl = `${baseUrl}/${this.currentArticle.contentFile}`;
        const articleDate = new Date(this.currentArticle.date);
        const isoDate = articleDate.toISOString();
        const excerpt = this.currentArticle.excerpt || this.currentArticle.title;
        const tags = this.currentArticle.tags || [];
        const iconPath = `${baseUrl}/assets/icons/${this.currentArticle.icon || 'icon-brain.svg'}`;

        // Обновляем или создаем meta description
        this.setOrCreateMeta('name', 'description', excerpt);
        
        // Обновляем keywords
        if (tags.length > 0) {
            this.setOrCreateMeta('name', 'keywords', tags.join(', '));
        }

        // Обновляем canonical URL
        let canonical = document.querySelector('link[rel="canonical"]');
        if (!canonical) {
            canonical = document.createElement('link');
            canonical.rel = 'canonical';
            document.head.appendChild(canonical);
        }
        canonical.href = articleUrl;

        // Обновляем Open Graph теги
        this.setOrCreateMeta('property', 'og:url', articleUrl);
        this.setOrCreateMeta('property', 'og:title', `${this.currentArticle.title} - Moon`);
        this.setOrCreateMeta('property', 'og:description', excerpt);
        this.setOrCreateMeta('property', 'og:image', iconPath);
        this.setOrCreateMeta('property', 'article:published_time', isoDate);
        
        // Обновляем теги статьи для OG
        tags.forEach(tag => {
            this.setOrCreateMeta('property', 'article:tag', tag);
        });

        // Обновляем Twitter Cards
        this.setOrCreateMeta('name', 'twitter:url', articleUrl);
        this.setOrCreateMeta('name', 'twitter:title', `${this.currentArticle.title} - Moon`);
        this.setOrCreateMeta('name', 'twitter:description', excerpt);
        this.setOrCreateMeta('name', 'twitter:image', iconPath);

        // Обновляем Structured Data (JSON-LD)
        this.updateStructuredData(articleUrl, isoDate, excerpt, tags, iconPath);
    }

    // Вспомогательная функция для установки или создания meta тега
    setOrCreateMeta(attribute, value, content) {
        let meta = document.querySelector(`meta[${attribute}="${value}"]`);
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute(attribute, value);
            document.head.appendChild(meta);
        }
        meta.setAttribute('content', content);
    }

    // Обновление Structured Data (JSON-LD)
    updateStructuredData(articleUrl, isoDate, excerpt, tags, iconPath) {
        // Удаляем старый JSON-LD для статьи, если есть
        const oldScript = document.querySelector('script[type="application/ld+json"]');
        if (oldScript && oldScript.textContent.includes('BlogPosting')) {
            oldScript.remove();
        }

        // Создаем новый JSON-LD
        const structuredData = {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": this.currentArticle.title,
            "description": excerpt,
            "image": iconPath,
            "datePublished": isoDate,
            "dateModified": isoDate,
            "author": {
                "@type": "Person",
                "name": "Moon",
                "url": "https://yourmoontg.github.io"
            },
            "publisher": {
                "@type": "Person",
                "name": "Moon",
                "url": "https://yourmoontg.github.io"
            },
            "mainEntityOfPage": {
                "@type": "WebPage",
                "@id": articleUrl
            },
            "keywords": tags
        };

        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify(structuredData, null, 2);
        document.head.appendChild(script);
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

    // Инициализация навигации между статьями
    initNavigation() {
        if (!this.currentArticle || this.allArticles.length === 0) return;

        const currentIndex = this.allArticles.findIndex(a => a.id === this.currentArticleId);
        
        // Предыдущая статья
        if (currentIndex > 0) {
            const prevArticle = this.allArticles[currentIndex - 1];
            const prevLink = document.getElementById('article-prev');
            const prevTitle = document.getElementById('article-prev-title');
            
            if (prevLink && prevTitle) {
                prevLink.href = prevArticle.contentFile;
                prevTitle.textContent = prevArticle.title;
                prevLink.style.display = 'block';
            }
        }

        // Следующая статья
        if (currentIndex < this.allArticles.length - 1) {
            const nextArticle = this.allArticles[currentIndex + 1];
            const nextLink = document.getElementById('article-next');
            const nextTitle = document.getElementById('article-next-title');
            
            if (nextLink && nextTitle) {
                nextLink.href = nextArticle.contentFile;
                nextTitle.textContent = nextArticle.title;
                nextLink.style.display = 'block';
            }
        }
    }

    // Загрузка связанных статей
    loadRelatedArticles() {
        if (!this.currentArticle || !this.currentArticle.tags) return;

        const relatedContainer = document.getElementById('related-articles-list');
        if (!relatedContainer) return;

        // Находим статьи с общими тегами
        const relatedArticles = this.allArticles
            .filter(article => {
                if (article.id === this.currentArticleId) return false;
                
                // Проверяем наличие общих тегов
                return article.tags && article.tags.some(tag => 
                    this.currentArticle.tags.includes(tag)
                );
            })
            .slice(0, 3); // Максимум 3 статьи

        if (relatedArticles.length === 0) {
            relatedContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Похожих статей пока нет</p>';
            return;
        }

        // Рендерим связанные статьи
        const articlesHTML = relatedArticles.map(article => this.renderRelatedArticle(article)).join('');
        relatedContainer.innerHTML = articlesHTML;
    }

    // Рендеринг карточки связанной статьи
    renderRelatedArticle(article) {
        const iconPath = `../assets/icons/${article.icon}`;
        const formattedDate = this.formatDate(article.date);
        const tagsHTML = article.tags.map(tag => 
            `<span class="article-tag" data-tag="${tag}">${tag}</span>`
        ).join('');

        return `
            <a href="${article.contentFile}" class="article-card article-link">
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
}

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    // Проверяем, что мы на странице статьи (есть мета-тег article-id)
    const articleId = document.querySelector('meta[name="article-id"]');
    
    if (articleId) {
        const articleManager = new ArticleManager();
        articleManager.init();
        
        // Экспортируем для использования в других модулях
        window.ArticleManager = articleManager;
    }
    
    // Инициализируем сворачиваемые секции
    initCollapsibleSections();
});

// Инициализация сворачиваемых секций
function initCollapsibleSections() {
    const collapsibles = document.querySelectorAll('.article-collapsible');
    
    collapsibles.forEach(collapsible => {
        const header = collapsible.querySelector('.collapsible-header');
        if (!header) return;
        
        // Добавляем обработчик клика
        header.addEventListener('click', () => {
            collapsible.classList.toggle('collapsed');
        });
        
        // По умолчанию секции развернуты
        collapsible.classList.remove('collapsed');
    });
}

// Экспорт класса
window.ArticleManager = ArticleManager;

