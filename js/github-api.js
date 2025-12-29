// GitHub API клиент для работы с репозиторием
// Использует GitHub REST API v3

class GitHubAPI {
    constructor() {
        this.token = null;
        this.owner = 'YourMoonTG';
        this.repo = 'yourmoontg.github.io';
        this.baseURL = 'https://api.github.com';
        this.branch = 'main';
    }

    /**
     * Устанавливает Personal Access Token
     */
    setToken(token) {
        this.token = token;
        localStorage.setItem('github_token', token);
    }

    /**
     * Получает сохраненный токен
     */
    getToken() {
        if (!this.token) {
            this.token = localStorage.getItem('github_token');
        }
        return this.token;
    }

    /**
     * Проверяет наличие токена
     */
    hasToken() {
        return !!this.getToken();
    }

    /**
     * Базовый метод для запросов к GitHub API
     */
    async request(method, endpoint, data = null) {
        const token = this.getToken();
        if (!token) {
            throw new Error('GitHub токен не установлен. Пожалуйста, введите Personal Access Token.');
        }

        const url = `${this.baseURL}${endpoint}`;
        const options = {
            method,
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            }
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            // Если ответ пустой (204 No Content), возвращаем null
            if (response.status === 204) {
                return null;
            }

            return await response.json();
        } catch (error) {
            console.error('GitHub API Error:', error);
            throw error;
        }
    }

    /**
     * Получает содержимое файла из репозитория
     */
    async getFileContent(path) {
        try {
            const endpoint = `/repos/${this.owner}/${this.repo}/contents/${path}`;
            const data = await this.request('GET', endpoint);
            
            if (data.content) {
                // Декодируем base64
                return atob(data.content.replace(/\s/g, ''));
            }
            
            return null;
        } catch (error) {
            if (error.message.includes('404')) {
                return null; // Файл не найден
            }
            throw error;
        }
    }

    /**
     * Сохраняет или обновляет файл в репозитории
     */
    async saveFile(path, content, message, sha = null) {
        // Если content уже base64 (для изображений), используем как есть
        // Иначе кодируем текст в base64
        let encodedContent;
        
        // Проверяем, является ли content уже base64 строкой
        // Base64 строки обычно не содержат пробелы и имеют определенную длину
        if (typeof content === 'string' && /^[A-Za-z0-9+/=]+$/.test(content) && content.length > 100) {
            // Похоже на base64, используем как есть
            encodedContent = content;
        } else {
            // Кодируем текст в base64 с правильной обработкой UTF-8
            encodedContent = btoa(unescape(encodeURIComponent(content)));
        }
        
        // GitHub API требует base64 без переносов строк
        encodedContent = encodedContent.replace(/\s/g, '');
        
        const data = {
            message: message,
            content: encodedContent,
            branch: this.branch
        };

        // Если файл существует, добавляем SHA для обновления
        if (sha) {
            data.sha = sha;
        }

        try {
            const endpoint = `/repos/${this.owner}/${this.repo}/contents/${path}`;
            const result = await this.request('PUT', endpoint, data);
            return result;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Удаляет файл из репозитория
     */
    async deleteFile(path, message, sha) {
        const data = {
            message: message,
            sha: sha,
            branch: this.branch
        };

        try {
            const endpoint = `/repos/${this.owner}/${this.repo}/contents/${path}`;
            const result = await this.request('DELETE', endpoint, data);
            return result;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Загружает изображение в репозиторий
     */
    async uploadImage(imageFile, articleId, filename = null) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async () => {
                try {
                    // Определяем имя файла
                    const imageName = filename || imageFile.name;
                    const imagePath = `blog/images/${articleId}/${imageName}`;
                    
                    // Конвертируем File в base64
                    // GitHub API требует base64 без префикса data:image/...;base64,
                    const base64Data = reader.result;
                    let base64;
                    
                    if (base64Data.includes(',')) {
                        base64 = base64Data.split(',')[1];
                    } else {
                        base64 = base64Data;
                    }
                    
                    // Проверяем, существует ли файл (нужен SHA для обновления)
                    let sha = null;
                    try {
                        sha = await this.getFileSHA(imagePath);
                    } catch (e) {
                        // Файл не существует, это нормально
                    }
                    
                    const message = `Добавлено изображение: ${imageName}`;
                    const result = await this.saveFile(imagePath, base64, message, sha);
                    
                    // Возвращаем путь к изображению для использования в статье
                    resolve({
                        path: imagePath,
                        url: `../../blog/images/${articleId}/${imageName}`,
                        result: result
                    });
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('Ошибка чтения файла'));
            reader.readAsDataURL(imageFile);
        });
    }

    /**
     * Получает SHA файла (нужно для обновления)
     */
    async getFileSHA(path) {
        try {
            const endpoint = `/repos/${this.owner}/${this.repo}/contents/${path}`;
            const data = await this.request('GET', endpoint);
            return data.sha;
        } catch (error) {
            if (error.message.includes('404')) {
                return null; // Файл не существует
            }
            throw error;
        }
    }

    /**
     * Получает список статей из articles.json
     */
    async getArticles() {
        try {
            const content = await this.getFileContent('blog/articles.json');
            if (!content) {
                return { articles: [] };
            }
            return JSON.parse(content);
        } catch (error) {
            console.error('Ошибка получения статей:', error);
            return { articles: [] };
        }
    }

    /**
     * Сохраняет articles.json
     */
    async saveArticles(articlesData, message = 'Обновлен список статей') {
        const content = JSON.stringify(articlesData, null, 2) + '\n';
        const sha = await this.getFileSHA('blog/articles.json');
        return await this.saveFile('blog/articles.json', content, message, sha);
    }

    /**
     * Получает markdown контент статьи
     */
    async getArticleContent(articleId) {
        const path = `blog/content/${articleId}.md`;
        return await this.getFileContent(path);
    }

    /**
     * Сохраняет markdown контент статьи
     */
    async saveArticleContent(articleId, markdown, message = null) {
        const path = `blog/content/${articleId}.md`;
        const sha = await this.getFileSHA(path);
        const commitMessage = message || `Обновлена статья: ${articleId}`;
        return await this.saveFile(path, markdown, commitMessage, sha);
    }

    /**
     * Создает новую статью (markdown + запись в articles.json)
     */
    async createArticle(articleData, markdownContent) {
        const articlesData = await this.getArticles();
        
        // Проверяем на дубликат
        if (articlesData.articles.some(a => a.id === articleData.id)) {
            throw new Error(`Статья с ID "${articleData.id}" уже существует`);
        }

        // Добавляем статью в список
        articlesData.articles.push(articleData);
        articlesData.articles.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Сохраняем markdown файл
        await this.saveArticleContent(
            articleData.id, 
            markdownContent, 
            `Создана новая статья: ${articleData.title}`
        );

        // Обновляем articles.json
        await this.saveArticles(articlesData, `Добавлена статья: ${articleData.title}`);

        return articleData;
    }

    /**
     * Обновляет статью
     */
    async updateArticle(articleId, articleData, markdownContent) {
        const articlesData = await this.getArticles();
        const articleIndex = articlesData.articles.findIndex(a => a.id === articleId);

        if (articleIndex === -1) {
            throw new Error(`Статья с ID "${articleId}" не найдена`);
        }

        // Обновляем данные статьи
        articlesData.articles[articleIndex] = {
            ...articlesData.articles[articleIndex],
            ...articleData,
            id: articleId // ID не меняем
        };

        // Сохраняем markdown
        await this.saveArticleContent(articleId, markdownContent, `Обновлена статья: ${articleData.title || articleId}`);

        // Обновляем articles.json
        await this.saveArticles(articlesData, `Обновлена статья: ${articleData.title || articleId}`);

        return articlesData.articles[articleIndex];
    }

    /**
     * Удаляет статью
     */
    async deleteArticle(articleId) {
        const articlesData = await this.getArticles();
        const articleIndex = articlesData.articles.findIndex(a => a.id === articleId);

        if (articleIndex === -1) {
            throw new Error(`Статья с ID "${articleId}" не найдена`);
        }

        const article = articlesData.articles[articleIndex];

        // Удаляем markdown файл
        const contentPath = `blog/content/${articleId}.md`;
        const contentSHA = await this.getFileSHA(contentPath);
        if (contentSHA) {
            await this.deleteFile(contentPath, `Удалена статья: ${article.title}`, contentSHA);
        }

        // Удаляем из списка
        articlesData.articles.splice(articleIndex, 1);
        await this.saveArticles(articlesData, `Удалена статья: ${article.title}`);

        return true;
    }

    /**
     * Проверяет подключение к GitHub
     */
    async testConnection() {
        try {
            const endpoint = `/repos/${this.owner}/${this.repo}`;
            await this.request('GET', endpoint);
            return true;
        } catch (error) {
            throw new Error(`Не удалось подключиться к GitHub: ${error.message}`);
        }
    }
}

// Экспорт для использования
window.GitHubAPI = GitHubAPI;

