// Утилита для добавления новых статей в блог
// Использование: node scripts/add-article.js

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const BLOG_DIR = path.join(__dirname, '..', 'blog');
const ARTICLES_JSON = path.join(BLOG_DIR, 'articles.json');
const POSTS_DIR = path.join(BLOG_DIR, 'posts');
const CONTENT_DIR = path.join(BLOG_DIR, 'content');
const TEMPLATE_FILE = path.join(BLOG_DIR, 'post-template.html');

// Цвета для консоли
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    blue: '\x1b[34m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// Генерация ID из заголовка (slug)
function generateId(title) {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
}

// Чтение ввода пользователя
function askQuestion(rl, question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.trim());
        });
    });
}

// Создание markdown файла статьи
function createMarkdownFile(articleData) {
    // Создаем директорию content, если её нет
    if (!fs.existsSync(CONTENT_DIR)) {
        fs.mkdirSync(CONTENT_DIR, { recursive: true });
    }

    const markdownFile = path.join(CONTENT_DIR, `${articleData.id}.md`);
    
    // Создаем базовый markdown шаблон
    const markdownTemplate = `# ${articleData.title}

Начните писать вашу статью здесь.

## Примеры использования

### Обычный текст
Просто пишите текст как обычно.

### Изображения
Используйте один из форматов:
- \`![Описание](путь/к/изображению.webp)\` - стандартный markdown
- \`[IMAGE:путь/к/изображению.webp]\` - простой формат
- \`[IMAGE:путь/к/изображению.webp|Описание]\` - с описанием

### Сворачиваемые секции
\`\`\`
>>> Заголовок секции
Контент секции, который можно свернуть
<<<
\`\`\`

### Код
\`\`\`javascript
function example() {
    return "Hello, World!";
}
\`\`\`

### Списки
- Пункт 1
- Пункт 2
- Пункт 3

### Цитаты
> Важная информация или примечание
`;

    fs.writeFileSync(markdownFile, markdownTemplate, 'utf-8');
    
    return markdownFile;
}

// Форматирование даты
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

// Добавление статьи в JSON
function addArticleToJSON(articleData) {
    let data;
    
    if (fs.existsSync(ARTICLES_JSON)) {
        const jsonContent = fs.readFileSync(ARTICLES_JSON, 'utf-8');
        data = JSON.parse(jsonContent);
    } else {
        data = { articles: [] };
    }

    // Проверка на дубликат ID
    if (data.articles.some(a => a.id === articleData.id)) {
        throw new Error(`Статья с ID "${articleData.id}" уже существует`);
    }

    data.articles.push(articleData);
    
    // Сортируем по дате (новые сверху)
    data.articles.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    fs.writeFileSync(ARTICLES_JSON, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

// Главная функция
async function addArticle() {
    log('\n📝 Добавление новой статьи в блог\n', 'cyan');

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    try {
        // Заголовок
        const title = await askQuestion(rl, 'Заголовок статьи: ');
        if (!title) {
            throw new Error('Заголовок обязателен');
        }

        // Генерация ID
        const generatedId = generateId(title);
        log(`\nСгенерированный ID: ${generatedId}`, 'yellow');
        const id = await askQuestion(rl, 'ID статьи (Enter для использования сгенерированного): ') || generatedId;

        // Дата
        const today = new Date().toISOString().split('T')[0];
        const dateInput = await askQuestion(rl, `Дата публикации (YYYY-MM-DD, Enter для ${today}): `) || today;

        // Теги
        const tagsInput = await askQuestion(rl, 'Теги (через запятую): ');
        const tags = tagsInput.split(',').map(t => t.trim()).filter(t => t);

        // Краткое описание
        const excerpt = await askQuestion(rl, 'Краткое описание (excerpt): ');

        // Время чтения
        const readTimeInput = await askQuestion(rl, 'Время чтения в минутах (по умолчанию 5): ');
        const readTime = parseInt(readTimeInput) || 5;

        // Статус
        const statusInput = await askQuestion(rl, 'Статус (published/draft, по умолчанию draft): ');
        const status = statusInput || 'draft';

        if (!['published', 'draft'].includes(status)) {
            throw new Error('Статус должен быть "published" или "draft"');
        }

        // Иконка
        log('\nДоступные иконки:', 'cyan');
        const iconsDir = path.join(__dirname, '..', 'assets', 'icons');
        if (fs.existsSync(iconsDir)) {
            const icons = fs.readdirSync(iconsDir)
                .filter(f => f.endsWith('.svg'))
                .map(f => f.replace('icon-', '').replace('.svg', ''));
            log(icons.join(', '), 'yellow');
        }
        const iconInput = await askQuestion(rl, 'Иконка (например: robot, shield, chart): ');
        const icon = iconInput ? `icon-${iconInput}.svg` : 'icon-brain.svg';

        // Формируем данные статьи
        const fileName = `${dateInput}-${id}.html`;
        const articleData = {
            id: id,
            title: title,
            date: dateInput,
            tags: tags,
            excerpt: excerpt,
            contentFile: `blog/posts/${fileName}`,
            status: status,
            readTime: readTime,
            icon: icon
        };

        // Создаем markdown файл
        log('\n📄 Создание markdown файла статьи...', 'cyan');
        const markdownFile = createMarkdownFile(articleData);
        log(`✅ Markdown файл создан: ${markdownFile}`, 'green');

        // Добавляем в JSON
        log('\n📝 Добавление в articles.json...', 'cyan');
        addArticleToJSON(articleData);
        log('✅ Статья добавлена в articles.json', 'green');

        log('\n' + '='.repeat(50), 'cyan');
        log('\n✅ Статья успешно создана!', 'green');
        log(`\n📝 Markdown файл: ${markdownFile}`, 'cyan');
        log(`📊 Статус: ${status}`, 'cyan');
        log(`\n📌 Следующие шаги:`, 'yellow');
        log(`   1. Отредактируйте markdown файл: ${markdownFile}`, 'yellow');
        log(`   2. Добавьте изображения в blog/images/${id}/`, 'yellow');
        log(`   3. Соберите статью: node scripts/build-article.js ${id}`, 'yellow');
        log(`   4. Для публикации измените статус на "published" в articles.json`, 'yellow');

    } catch (error) {
        log(`\n❌ Ошибка: ${error.message}`, 'red');
        process.exit(1);
    } finally {
        rl.close();
    }
}

// Запуск
if (require.main === module) {
    addArticle();
}

module.exports = { addArticle, generateId };

