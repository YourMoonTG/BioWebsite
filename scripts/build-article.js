// Скрипт для сборки статьи из markdown файла в HTML
// Использование: node scripts/build-article.js <article-id>
// Или: node scripts/build-article.js --all (для всех статей)

const fs = require('fs');
const path = require('path');
const MarkdownConverter = require('./markdown-converter');

const BLOG_DIR = path.join(__dirname, '..', 'blog');
const CONTENT_DIR = path.join(BLOG_DIR, 'content');
const POSTS_DIR = path.join(BLOG_DIR, 'posts');
const ARTICLES_JSON = path.join(BLOG_DIR, 'articles.json');
const TEMPLATE_FILE = path.join(BLOG_DIR, 'post-template.html');

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    red: '\x1b[31m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Загружает метаданные статьи из articles.json
 */
function getArticleData(articleId) {
    if (!fs.existsSync(ARTICLES_JSON)) {
        throw new Error('articles.json не найден');
    }

    const data = JSON.parse(fs.readFileSync(ARTICLES_JSON, 'utf-8'));
    const article = data.articles.find(a => a.id === articleId);

    if (!article) {
        throw new Error(`Статья с ID "${articleId}" не найдена в articles.json`);
    }

    return article;
}

/**
 * Форматирует дату
 */
function formatDate(dateString) {
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

/**
 * Собирает HTML статью из markdown
 */
function buildArticle(articleId) {
    log(`\n🔨 Сборка статьи: ${articleId}`, 'cyan');

    // Загружаем метаданные
    const articleData = getArticleData(articleId);

    // Ищем markdown файл
    const markdownFile = path.join(CONTENT_DIR, `${articleId}.md`);
    
    if (!fs.existsSync(markdownFile)) {
        throw new Error(`Markdown файл не найден: ${markdownFile}`);
    }

    log(`📄 Чтение markdown: ${markdownFile}`, 'cyan');
    const markdown = fs.readFileSync(markdownFile, 'utf-8');

    // Конвертируем markdown в HTML
    const converter = new MarkdownConverter();
    const htmlContent = converter.convert(markdown, articleId);

    // Загружаем шаблон
    if (!fs.existsSync(TEMPLATE_FILE)) {
        throw new Error(`Шаблон не найден: ${TEMPLATE_FILE}`);
    }

    let template = fs.readFileSync(TEMPLATE_FILE, 'utf-8');

    // Заменяем метаданные
    template = template.replace(
        /<meta name="article-id" content="[^"]*">/,
        `<meta name="article-id" content="${articleData.id}">`
    );
    template = template.replace(
        /<meta name="article-date" content="[^"]*">/,
        `<meta name="article-date" content="${articleData.date}">`
    );
    template = template.replace(
        /<meta name="article-tags" content="[^"]*">/,
        `<meta name="article-tags" content="${articleData.tags.join(',')}">`
    );
    template = template.replace(
        /<meta name="article-read-time" content="[^"]*">/,
        `<meta name="article-read-time" content="${articleData.readTime}">`
    );

    // Заменяем заголовок страницы
    template = template.replace(
        /<title>[^<]*<\/title>/,
        `<title>${articleData.title} - Moon</title>`
    );

    // Заменяем заголовок статьи
    template = template.replace(
        /<h1 class="article-title-main"[^>]*>.*?<\/h1>/,
        `<h1 class="article-title-main" id="article-title">${articleData.title}</h1>`
    );

    // Заменяем дату
    const formattedDate = formatDate(articleData.date);
    template = template.replace(
        /<span class="article-date-header"[^>]*>.*?<\/span>/,
        `<span class="article-date-header" id="article-date">${formattedDate}</span>`
    );

    // Заменяем время чтения
    template = template.replace(
        /<span class="article-read-time-header"[^>]*>.*?<\/span>/,
        `<span class="article-read-time-header" id="article-read-time">${articleData.readTime} мин чтения</span>`
    );

    // Заменяем теги
    const tagsHTML = articleData.tags.map(tag => 
        `<span class="article-tag">${tag}</span>`
    ).join('');
    template = template.replace(
        /<div class="article-tags-header"[^>]*>.*?<\/div>/,
        `<div class="article-tags-header" id="article-tags">${tagsHTML}</div>`
    );

    // Заменяем контент статьи
    template = template.replace(
        /<div class="article-content" id="article-body">[\s\S]*?<\/div>/,
        `<div class="article-content" id="article-body">\n${htmlContent}\n                </div>`
    );

    // Обновляем SEO мета-теги
    template = updateSEOTags(template, articleData);

    // Сохраняем HTML файл
    const fileName = path.basename(articleData.contentFile);
    const outputPath = path.join(POSTS_DIR, fileName);
    
    // Создаем директорию если нужно
    if (!fs.existsSync(POSTS_DIR)) {
        fs.mkdirSync(POSTS_DIR, { recursive: true });
    }

    fs.writeFileSync(outputPath, template, 'utf-8');
    log(`✅ Статья собрана: ${outputPath}`, 'green');

    return outputPath;
}

/**
 * Обновляет SEO мета-теги в шаблоне
 * @returns {string} обновленный шаблон
 */
function updateSEOTags(template, articleData) {
    const baseUrl = 'https://yourmoontg.github.io';
    const articleUrl = `${baseUrl}/${articleData.contentFile}`;
    const articleDate = new Date(articleData.date);
    const isoDate = articleDate.toISOString();
    const excerpt = articleData.excerpt || articleData.title;
    const tags = articleData.tags || [];
    const iconPath = `${baseUrl}/assets/icons/${articleData.icon || 'icon-brain.svg'}`;

    // Обновляем description
    template = template.replace(
        /<meta name="description" content="[^"]*">/,
        `<meta name="description" content="${excerpt.replace(/"/g, '&quot;')}">`
    );

    // Обновляем keywords
    if (tags.length > 0) {
        template = template.replace(
            /<meta name="keywords" content="[^"]*">/,
            `<meta name="keywords" content="${tags.join(', ')}">`
        );
    }

    // Обновляем canonical
    template = template.replace(
        /<link rel="canonical" href="[^"]*">/,
        `<link rel="canonical" href="${articleUrl}">`
    );

    // Обновляем Open Graph
    template = template.replace(
        /<meta property="og:url" content="[^"]*">/,
        `<meta property="og:url" content="${articleUrl}">`
    );
    template = template.replace(
        /<meta property="og:title" content="[^"]*">/,
        `<meta property="og:title" content="${articleData.title} - Moon">`
    );
    template = template.replace(
        /<meta property="og:description" content="[^"]*">/,
        `<meta property="og:description" content="${excerpt.replace(/"/g, '&quot;')}">`
    );
    template = template.replace(
        /<meta property="og:image" content="[^"]*">/,
        `<meta property="og:image" content="${iconPath}">`
    );

    // Обновляем Twitter Cards
    template = template.replace(
        /<meta name="twitter:url" content="[^"]*">/,
        `<meta name="twitter:url" content="${articleUrl}">`
    );
    template = template.replace(
        /<meta name="twitter:title" content="[^"]*">/,
        `<meta name="twitter:title" content="${articleData.title} - Moon">`
    );
    template = template.replace(
        /<meta name="twitter:description" content="[^"]*">/,
        `<meta name="twitter:description" content="${excerpt.replace(/"/g, '&quot;')}">`
    );
    template = template.replace(
        /<meta name="twitter:image" content="[^"]*">/,
        `<meta name="twitter:image" content="${iconPath}">`
    );

    return template;
}

/**
 * Собирает все статьи
 */
function buildAllArticles() {
    if (!fs.existsSync(ARTICLES_JSON)) {
        throw new Error('articles.json не найден');
    }

    const data = JSON.parse(fs.readFileSync(ARTICLES_JSON, 'utf-8'));
    const articles = data.articles || [];

    log(`\n🔨 Сборка всех статей (${articles.length})`, 'cyan');

    let success = 0;
    let errors = 0;

    for (const article of articles) {
        try {
            buildArticle(article.id);
            success++;
        } catch (error) {
            log(`❌ Ошибка при сборке "${article.id}": ${error.message}`, 'red');
            errors++;
        }
    }

    log(`\n✅ Готово! Успешно: ${success}, Ошибок: ${errors}`, success > 0 ? 'green' : 'red');
}

// Главная функция
function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        log('Использование:', 'cyan');
        log('  node scripts/build-article.js <article-id>  - собрать одну статью', 'yellow');
        log('  node scripts/build-article.js --all         - собрать все статьи', 'yellow');
        process.exit(1);
    }

    try {
        if (args[0] === '--all') {
            buildAllArticles();
        } else {
            buildArticle(args[0]);
        }
    } catch (error) {
        log(`\n❌ Ошибка: ${error.message}`, 'red');
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { buildArticle, buildAllArticles };

