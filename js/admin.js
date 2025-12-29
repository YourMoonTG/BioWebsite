// Логика админ-панели редактора статей

class ArticleEditor {
    constructor() {
        this.github = new GitHubAPI();
        this.converter = new MarkdownConverter();
        this.currentArticle = null;
        this.editor = null;
        this.autoSaveTimer = null;
        this.isSaving = false;
        
        this.init();
    }

    async init() {
        // Проверяем сохраненный токен
        const savedToken = this.github.getToken();
        if (savedToken) {
            document.getElementById('github-token').value = savedToken;
            this.updateTokenStatus(true);
        }

        // Инициализируем редактор TipTap
        this.initEditor();

        // Настраиваем обработчики событий
        this.setupEventListeners();

        // Загружаем список статей
        await this.loadArticles();
    }

    initEditor() {
        const editorElement = document.getElementById('wysiwyg-editor');
        
        // Инициализируем TipTap редактор
        this.editor = new tiptap.Editor({
            element: editorElement,
            extensions: [
                tiptap.StarterKit,
                tiptap.Image,
                tiptap.Link.configure({
                    openOnClick: false,
                })
            ],
            content: '',
            editorProps: {
                attributes: {
                    class: 'ProseMirror',
                },
            },
        });

        // Синхронизируем с markdown редактором
        this.editor.on('update', () => {
            const html = this.editor.getHTML();
            const markdown = this.htmlToMarkdown(html);
            document.getElementById('markdown-editor').value = markdown;
            this.updatePreview();
            this.autoSave();
        });
    }

    setupEventListeners() {
        // Сохранение токена
        document.getElementById('save-token-btn').addEventListener('click', () => {
            const token = document.getElementById('github-token').value.trim();
            if (token) {
                this.github.setToken(token);
                this.updateTokenStatus(true);
                this.loadArticles();
            }
        });

        // Новая статья
        document.getElementById('new-article-btn').addEventListener('click', () => {
            this.createNewArticle();
        });

        // Сохранение статьи
        document.getElementById('save-btn').addEventListener('click', () => {
            this.saveArticle();
        });

        // Удаление статьи
        document.getElementById('delete-btn').addEventListener('click', () => {
            if (confirm('Вы уверены, что хотите удалить эту статью?')) {
                this.deleteArticle();
            }
        });

        // Отмена редактирования
        document.getElementById('cancel-btn').addEventListener('click', () => {
            this.cancelEditing();
        });

        // Переключение вкладок
        document.querySelectorAll('.editor-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Загрузка изображений
        const imageUpload = document.getElementById('image-upload');
        const imageInput = document.getElementById('image-input');

        imageUpload.addEventListener('click', () => {
            imageInput.click();
        });

        imageUpload.addEventListener('dragover', (e) => {
            e.preventDefault();
            imageUpload.classList.add('dragover');
        });

        imageUpload.addEventListener('dragleave', () => {
            imageUpload.classList.remove('dragover');
        });

        imageUpload.addEventListener('drop', (e) => {
            e.preventDefault();
            imageUpload.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.uploadImage(files[0]);
            }
        });

        imageInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.uploadImage(e.target.files[0]);
            }
        });

        // Синхронизация markdown редактора
        document.getElementById('markdown-editor').addEventListener('input', () => {
            const markdown = document.getElementById('markdown-editor').value;
            const html = this.converter.convert(markdown, this.currentArticle?.id || '');
            this.editor.commands.setContent(html);
            this.updatePreview();
            this.autoSave();
        });
    }

    updateTokenStatus(connected) {
        const statusEl = document.getElementById('token-status');
        if (connected) {
            statusEl.textContent = 'Подключено к GitHub';
            statusEl.classList.add('connected');
        } else {
            statusEl.textContent = 'Токен не установлен';
            statusEl.classList.remove('connected');
        }
    }

    async loadArticles() {
        if (!this.github.hasToken()) {
            document.getElementById('articles-list').innerHTML = `
                <div style="text-align: center; color: var(--text-secondary); padding: 2rem;">
                    Введите GitHub токен для загрузки статей
                </div>
            `;
            return;
        }

        try {
            const data = await this.github.getArticles();
            const articles = data.articles || [];
            
            if (articles.length === 0) {
                document.getElementById('articles-list').innerHTML = `
                    <div style="text-align: center; color: var(--text-secondary); padding: 2rem;">
                        Статей пока нет. Создайте новую!
                    </div>
                `;
                return;
            }

            const articlesHTML = articles.map(article => `
                <div class="article-item" data-id="${article.id}">
                    <div class="article-item-title">${article.title}</div>
                    <div class="article-item-meta">
                        <span>${new Date(article.date).toLocaleDateString('ru-RU')}</span>
                        <span class="article-status ${article.status}">${article.status === 'published' ? 'Опубликовано' : 'Черновик'}</span>
                    </div>
                </div>
            `).join('');

            document.getElementById('articles-list').innerHTML = articlesHTML;

            // Обработчики клика на статьи
            document.querySelectorAll('.article-item').forEach(item => {
                item.addEventListener('click', () => {
                    const articleId = item.dataset.id;
                    this.loadArticle(articleId);
                });
            });
        } catch (error) {
            console.error('Ошибка загрузки статей:', error);
            document.getElementById('articles-list').innerHTML = `
                <div style="text-align: center; color: var(--accent-color); padding: 2rem;">
                    Ошибка: ${error.message}
                </div>
            `;
        }
    }

    async loadArticle(articleId) {
        if (!this.github.hasToken()) {
            alert('Сначала введите GitHub токен');
            return;
        }

        try {
            // Загружаем метаданные
            const articlesData = await this.github.getArticles();
            const article = articlesData.articles.find(a => a.id === articleId);

            if (!article) {
                alert('Статья не найдена');
                return;
            }

            // Загружаем контент
            const markdown = await this.github.getArticleContent(articleId) || '';

            // Заполняем форму
            this.currentArticle = article;
            document.getElementById('article-title').value = article.title;
            document.getElementById('article-date').value = article.date;
            document.getElementById('article-tags').value = article.tags.join(', ');
            document.getElementById('article-excerpt').value = article.excerpt || '';
            document.getElementById('article-read-time').value = article.readTime || 5;
            document.getElementById('article-status').value = article.status;
            document.getElementById('article-icon').value = article.icon || 'icon-brain.svg';

            // Загружаем контент в редакторы
            document.getElementById('markdown-editor').value = markdown;
            const html = this.converter.convert(markdown, articleId);
            this.editor.commands.setContent(html);

            // Показываем редактор
            document.getElementById('editor-panel').style.display = 'flex';
            document.getElementById('empty-state').style.display = 'none';
            document.getElementById('delete-btn').style.display = 'block';

            // Обновляем активную статью в списке
            document.querySelectorAll('.article-item').forEach(item => {
                item.classList.remove('active');
                if (item.dataset.id === articleId) {
                    item.classList.add('active');
                }
            });

            this.updatePreview();
        } catch (error) {
            console.error('Ошибка загрузки статьи:', error);
            alert(`Ошибка загрузки статьи: ${error.message}`);
        }
    }

    createNewArticle() {
        this.currentArticle = null;
        
        // Очищаем форму
        document.getElementById('article-title').value = '';
        document.getElementById('article-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('article-tags').value = '';
        document.getElementById('article-excerpt').value = '';
        document.getElementById('article-read-time').value = 5;
        document.getElementById('article-status').value = 'draft';
        document.getElementById('article-icon').value = 'icon-brain.svg';
        
        // Очищаем редакторы
        this.editor.commands.clearContent();
        document.getElementById('markdown-editor').value = '';

        // Показываем редактор
        document.getElementById('editor-panel').style.display = 'flex';
        document.getElementById('empty-state').style.display = 'none';
        document.getElementById('delete-btn').style.display = 'none';

        // Убираем активность со статей
        document.querySelectorAll('.article-item').forEach(item => {
            item.classList.remove('active');
        });
    }

    async saveArticle() {
        if (!this.github.hasToken()) {
            alert('Сначала введите GitHub токен');
            return;
        }

        const title = document.getElementById('article-title').value.trim();
        if (!title) {
            alert('Введите заголовок статьи');
            return;
        }

        this.updateSaveStatus('saving', 'Сохранение...');

        try {
            const markdown = document.getElementById('markdown-editor').value;
            const date = document.getElementById('article-date').value;
            const tags = document.getElementById('article-tags').value.split(',').map(t => t.trim()).filter(t => t);
            const excerpt = document.getElementById('article-excerpt').value.trim();
            const readTime = parseInt(document.getElementById('article-read-time').value) || 5;
            const status = document.getElementById('article-status').value;
            const icon = document.getElementById('article-icon').value.trim() || 'icon-brain.svg';

            // Генерируем ID из заголовка
            const generateId = (title) => {
                return title
                    .toLowerCase()
                    .replace(/[^a-z0-9\s-]/g, '')
                    .replace(/\s+/g, '-')
                    .replace(/-+/g, '-')
                    .trim();
            };

            const articleId = this.currentArticle?.id || generateId(title);
            const articleDate = date || new Date().toISOString().split('T')[0];

            const articleData = {
                id: articleId,
                title: title,
                date: articleDate,
                tags: tags,
                excerpt: excerpt,
                contentFile: `blog/posts/${articleDate}-${articleId}.html`,
                status: status,
                readTime: readTime,
                icon: icon
            };

            if (this.currentArticle) {
                // Обновляем существующую статью
                await this.github.updateArticle(articleId, articleData, markdown);
                this.currentArticle = articleData;
            } else {
                // Создаем новую статью
                await this.github.createArticle(articleData, markdown);
                this.currentArticle = articleData;
            }

            this.updateSaveStatus('saved', 'Сохранено в GitHub');
            await this.loadArticles();
            
            // Показываем кнопку удаления для новой статьи
            document.getElementById('delete-btn').style.display = 'block';
        } catch (error) {
            console.error('Ошибка сохранения:', error);
            this.updateSaveStatus('error', `Ошибка: ${error.message}`);
            alert(`Ошибка сохранения: ${error.message}`);
        }
    }

    async deleteArticle() {
        if (!this.currentArticle) return;

        if (!this.github.hasToken()) {
            alert('Сначала введите GitHub токен');
            return;
        }

        try {
            await this.github.deleteArticle(this.currentArticle.id);
            this.cancelEditing();
            await this.loadArticles();
            alert('Статья удалена');
        } catch (error) {
            console.error('Ошибка удаления:', error);
            alert(`Ошибка удаления: ${error.message}`);
        }
    }

    cancelEditing() {
        this.currentArticle = null;
        document.getElementById('editor-panel').style.display = 'none';
        document.getElementById('empty-state').style.display = 'flex';
        
        document.querySelectorAll('.article-item').forEach(item => {
            item.classList.remove('active');
        });
    }

    switchTab(tabName) {
        // Обновляем вкладки
        document.querySelectorAll('.editor-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Показываем нужный редактор
        document.getElementById('wysiwyg-editor').style.display = tabName === 'editor' ? 'block' : 'none';
        document.getElementById('markdown-editor').style.display = tabName === 'markdown' ? 'block' : 'none';
        document.getElementById('preview-area').style.display = tabName === 'preview' ? 'block' : 'none';

        if (tabName === 'preview') {
            this.updatePreview();
        }
    }

    updatePreview() {
        const markdown = document.getElementById('markdown-editor').value;
        const html = this.converter.convert(markdown, this.currentArticle?.id || '');
        document.getElementById('preview-area').innerHTML = `
            <div class="article-content">${html}</div>
        `;
    }

    async uploadImage(file) {
        if (!this.currentArticle) {
            alert('Сначала создайте или откройте статью');
            return;
        }

        if (!this.github.hasToken()) {
            alert('Сначала введите GitHub токен');
            return;
        }

        try {
            this.updateSaveStatus('saving', 'Загрузка изображения...');
            
            const result = await this.github.uploadImage(file, this.currentArticle.id);
            
            // Вставляем изображение в редактор
            const imageMarkdown = `![${file.name}](${result.url})`;
            const currentMarkdown = document.getElementById('markdown-editor').value;
            document.getElementById('markdown-editor').value = currentMarkdown + '\n\n' + imageMarkdown;
            
            // Обновляем WYSIWYG редактор
            const html = this.converter.convert(document.getElementById('markdown-editor').value, this.currentArticle.id);
            this.editor.commands.setContent(html);
            
            this.updateSaveStatus('saved', 'Изображение загружено');
            
            // Автоматически сохраняем статью
            setTimeout(() => this.saveArticle(), 1000);
        } catch (error) {
            console.error('Ошибка загрузки изображения:', error);
            this.updateSaveStatus('error', `Ошибка: ${error.message}`);
            alert(`Ошибка загрузки изображения: ${error.message}`);
        }
    }

    autoSave() {
        // Автосохранение в localStorage
        if (this.currentArticle) {
            const draft = {
                id: this.currentArticle.id,
                title: document.getElementById('article-title').value,
                markdown: document.getElementById('markdown-editor').value,
                date: document.getElementById('article-date').value,
                tags: document.getElementById('article-tags').value,
                excerpt: document.getElementById('article-excerpt').value,
                readTime: document.getElementById('article-read-time').value,
                status: document.getElementById('article-status').value,
                icon: document.getElementById('article-icon').value
            };
            localStorage.setItem(`article_draft_${this.currentArticle.id}`, JSON.stringify(draft));
        }
    }

    updateSaveStatus(status, message) {
        const statusEl = document.getElementById('save-status');
        statusEl.className = `save-status ${status}`;
        statusEl.innerHTML = `<span>${message}</span>`;
        
        if (status === 'saved') {
            setTimeout(() => {
                statusEl.className = 'save-status';
                statusEl.innerHTML = '<span>Не сохранено</span>';
            }, 3000);
        }
    }

    htmlToMarkdown(html) {
        // Простая конвертация HTML → Markdown (базовая)
        // Для полной конвертации лучше использовать библиотеку
        let markdown = html;
        
        // Заголовки
        markdown = markdown.replace(/<h1>(.*?)<\/h1>/gi, '# $1\n\n');
        markdown = markdown.replace(/<h2>(.*?)<\/h2>/gi, '## $1\n\n');
        markdown = markdown.replace(/<h3>(.*?)<\/h3>/gi, '### $1\n\n');
        
        // Параграфы
        markdown = markdown.replace(/<p>(.*?)<\/p>/gi, '$1\n\n');
        
        // Жирный текст
        markdown = markdown.replace(/<strong>(.*?)<\/strong>/gi, '**$1**');
        markdown = markdown.replace(/<b>(.*?)<\/b>/gi, '**$1**');
        
        // Курсив
        markdown = markdown.replace(/<em>(.*?)<\/em>/gi, '*$1*');
        markdown = markdown.replace(/<i>(.*?)<\/i>/gi, '*$1*');
        
        // Ссылки
        markdown = markdown.replace(/<a href="([^"]+)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
        
        // Изображения
        markdown = markdown.replace(/<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)');
        
        // Код
        markdown = markdown.replace(/<code>(.*?)<\/code>/gi, '`$1`');
        markdown = markdown.replace(/<pre><code>(.*?)<\/code><\/pre>/gis, '```\n$1\n```\n\n');
        
        // Списки
        markdown = markdown.replace(/<ul>([\s\S]*?)<\/ul>/gi, (match, content) => {
            return content.replace(/<li>(.*?)<\/li>/gi, '- $1\n') + '\n';
        });
        
        markdown = markdown.replace(/<ol>([\s\S]*?)<\/ol>/gi, (match, content) => {
            let counter = 1;
            return content.replace(/<li>(.*?)<\/li>/gi, () => `${counter++}. $1\n`) + '\n';
        });
        
        // Цитаты
        markdown = markdown.replace(/<blockquote>(.*?)<\/blockquote>/gi, '> $1\n\n');
        
        // Очистка
        markdown = markdown.replace(/<div[^>]*>/gi, '');
        markdown = markdown.replace(/<\/div>/gi, '');
        markdown = markdown.replace(/\n{3,}/g, '\n\n');
        
        return markdown.trim();
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.articleEditor = new ArticleEditor();
});

