// Конвертер Markdown → HTML для браузера
// Адаптированная версия для работы в браузере

class MarkdownConverter {
    constructor() {
        this.imageBasePath = '../../blog/images/';
    }

    convert(markdown, articleId = '') {
        let html = markdown;

        // Collapsible секции
        html = this.convertCollapsible(html);
        
        // Изображения
        html = this.convertImages(html, articleId);
        
        // Заголовки
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
        
        // Жирный текст
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Курсив
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Ссылки
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
        
        // Inline код
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // Блоки кода
        html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            return `<pre><code>${this.escapeHtml(code.trim())}</code></pre>`;
        });
        
        // Цитаты
        html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');
        
        // Списки
        html = this.convertOrderedList(html);
        html = this.convertUnorderedList(html);
        
        // Параграфы
        html = this.convertParagraphs(html);
        
        return html.trim();
    }

    convertCollapsible(html) {
        const collapsibleRegex = />>>\s*(.+?)\n([\s\S]*?)<<</g;
        
        return html.replace(collapsibleRegex, (match, title, content) => {
            const innerHtml = this.convert(content.trim(), '');
            return `
<div class="article-collapsible">
    <div class="collapsible-header">
        <h3>${title.trim()}</h3>
        <span class="collapsible-icon"></span>
    </div>
    <div class="collapsible-content">
        <div class="collapsible-content-inner">
            ${innerHtml}
        </div>
    </div>
</div>`;
        });
    }

    convertImages(html, articleId) {
        html = html.replace(/\[IMAGE:([^\|\]]+)(?:\|([^\]]+))?\]/g, (match, imagePath, alt) => {
            const cleanPath = imagePath.trim();
            const altText = alt ? alt.trim() : '';
            const fullPath = this.getImagePath(cleanPath, articleId);
            return `<figure class="article-image">
    <img src="${fullPath}" alt="${altText || cleanPath}" loading="lazy">
</figure>`;
        });

        html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, imagePath) => {
            const cleanPath = imagePath.trim();
            const fullPath = this.getImagePath(cleanPath, articleId);
            return `<figure class="article-image">
    <img src="${fullPath}" alt="${alt || cleanPath}" loading="lazy">
</figure>`;
        });

        return html;
    }

    getImagePath(imagePath, articleId) {
        if (imagePath.startsWith('http') || imagePath.startsWith('/')) {
            return imagePath;
        }

        if (imagePath.includes('blog/images')) {
            return imagePath;
        }

        if (articleId && !imagePath.includes('/') && !imagePath.includes('\\')) {
            return `${this.imageBasePath}${articleId}/${imagePath}`;
        }

        const normalizedPath = imagePath.replace(/\\/g, '/');
        return `${this.imageBasePath}${normalizedPath}`;
    }

    convertOrderedList(html) {
        const lines = html.split('\n');
        let inList = false;
        let result = [];
        let listItems = [];

        for (let line of lines) {
            const olMatch = line.match(/^\d+\.\s+(.+)$/);
            
            if (olMatch) {
                if (!inList) {
                    inList = true;
                }
                listItems.push(`<li>${olMatch[1]}</li>`);
            } else {
                if (inList) {
                    result.push(`<ol>${listItems.join('\n')}</ol>`);
                    listItems = [];
                    inList = false;
                }
                result.push(line);
            }
        }

        if (inList) {
            result.push(`<ol>${listItems.join('\n')}</ol>`);
        }

        return result.join('\n');
    }

    convertUnorderedList(html) {
        const lines = html.split('\n');
        let inList = false;
        let result = [];
        let listItems = [];

        for (let line of lines) {
            const ulMatch = line.match(/^[-*]\s+(.+)$/);
            
            if (ulMatch) {
                if (!inList) {
                    inList = true;
                }
                listItems.push(`<li>${ulMatch[1]}</li>`);
            } else {
                if (inList) {
                    result.push(`<ul>${listItems.join('\n')}</ul>`);
                    listItems = [];
                    inList = false;
                }
                result.push(line);
            }
        }

        if (inList) {
            result.push(`<ul>${listItems.join('\n')}</ul>`);
        }

        return result.join('\n');
    }

    convertParagraphs(html) {
        const lines = html.split('\n');
        let result = [];
        let currentParagraph = [];

        for (let line of lines) {
            const trimmed = line.trim();
            
            if (!trimmed) {
                if (currentParagraph.length > 0) {
                    result.push(`<p>${currentParagraph.join(' ')}</p>`);
                    currentParagraph = [];
                }
                continue;
            }

            if (trimmed.startsWith('<') && (
                trimmed.startsWith('<h') || 
                trimmed.startsWith('<ul') || 
                trimmed.startsWith('<ol') || 
                trimmed.startsWith('<li') ||
                trimmed.startsWith('<pre') ||
                trimmed.startsWith('<blockquote') ||
                trimmed.startsWith('<figure') ||
                trimmed.startsWith('<div')
            )) {
                if (currentParagraph.length > 0) {
                    result.push(`<p>${currentParagraph.join(' ')}</p>`);
                    currentParagraph = [];
                }
                result.push(trimmed);
            } else {
                currentParagraph.push(trimmed);
            }
        }

        if (currentParagraph.length > 0) {
            result.push(`<p>${currentParagraph.join(' ')}</p>`);
        }

        return result.join('\n');
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
}

window.MarkdownConverter = MarkdownConverter;

