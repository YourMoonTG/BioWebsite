# Структура проекта Bio Website v2

## Обзор

Проект организован по принципу модульности и разделения ответственности.

## Корневые файлы

- `index.html` - главная страница портфолио
- `blog.html` - страница блога со списком статей
- `admin.html` - веб-редактор статей
- `README.md` - основная документация проекта
- `start-site.cmd` - скрипт для быстрого запуска локального сервера
- `.gitignore` - правила игнорирования файлов для Git

## Папки

### `/css/` - Стили
Все CSS файлы разделены по назначению:
- `main.css` - базовые стили, переменные, типографика
- `components.css` - компоненты (кнопки, карточки, формы)
- `animations.css` - анимации и переходы
- `blog.css` - стили для блога (список статей и страницы статей)
- `admin.css` - стили для веб-редактора статей

### `/js/` - JavaScript модули
- `main.js` - основная логика (тема, скролл, тайпрайтер)
- `particles.js` - эффект звёздного неба в hero секции
- `cube.js` - 3D куб (Three.js)
- `blog.js` - модуль для работы со списком статей
- `article.js` - модуль для работы с отдельной статьей
- `github-api.js` - клиент для работы с GitHub API (для веб-редактора)
- `markdown-converter-browser.js` - конвертер markdown → HTML для браузера
- `admin.js` - логика веб-редактора статей

### `/assets/` - Ресурсы
- `icons/` - SVG иконки для сайта

### `/blog/` - Блог
Конструктор статей: метаданные в JSON, контент в markdown файлах, автоматическая сборка в HTML.
- `articles.json` - метаданные всех статей
- `content/` - markdown файлы статей (исходники)
- `posts/` - HTML файлы статей (собираются автоматически)
- `images/` - изображения для статей (организованы по папкам статей)
- `post-template.html` - шаблон для создания новых статей
- `README.md` - документация по работе с блогом

### `/projects/` - Страницы проектов
Отдельные HTML страницы для каждого проекта:
- `smart-committer.html` - страница проекта Smart Committer
- `smart-committer.css` - стили для страницы Smart Committer
- `smart-committer.js` - JavaScript для страницы Smart Committer
- `tebium-ecosystem.html` - страница проекта TeBium
- `custom-linux.html` - страница проекта Custom Linux
- `project-styles.css` - общие стили для страниц проектов

### `/api/` - API сервер
Express сервер для управления статьями через HTTP API:
- `server.js` - основной файл API сервера
- `package.json` - зависимости Node.js
- `README.md` - документация API
- `QUICKSTART.md` - быстрый старт
- `telegram-bot-example.*` - примеры интеграции с Telegram ботом

### `/scripts/` - Утилиты
Node.js скрипты для работы с блогом:
- `add-article.js` - интерактивное добавление статей (CLI)
- `build-article.js` - сборка статей из markdown в HTML
- `markdown-converter.js` - конвертер markdown → HTML (Node.js версия)
- `validate-blog.js` - валидация структуры блога

### `/docs/` - Документация
- `README.md` - индекс документации
- `STRUCTURE.md` - этот файл (описание структуры)
- `plans/` - планы разработки:
  - `BLOG_IMPLEMENTATION_PLAN.md` - план реализации блога
  - `API_TASKS.md` - задачи по API
  - `SMART_COMMITTER_REDESIGN_PLAN.md` - план редизайна Smart Committer

### `/archive/` - Архив
Устаревшие материалы, которые не используются в продакшене:
- `css/` - старые стили
- `docs/` - старые документы и дизайн-материалы

### `/backups/` - Бэкапы
Автоматические бэкапы (игнорируется Git через .gitignore)

## Пути и ссылки

### От корня проекта
- CSS: `css/main.css`
- JS: `js/main.js`
- Иконки: `assets/icons/icon-name.svg`
- Проекты: `projects/project-name.html`
- Блог: `blog.html`

### Из папки projects/
- CSS: `../css/main.css`
- JS: `../js/main.js`
- Иконки: `../assets/icons/icon-name.svg`
- Главная: `../index.html`

### Из папки blog/posts/
- CSS: `../../css/main.css`
- JS: `../../js/main.js`
- Иконки: `../../assets/icons/icon-name.svg`
- Главная: `../../index.html`
- Блог: `../../blog.html`
- JSON статей: `../../blog/articles.json` (для fetch)

### Из папки blog/
- CSS: `../css/main.css`
- JS: `../js/main.js`
- Иконки: `../assets/icons/icon-name.svg`
- JSON статей: `blog/articles.json` (для fetch из blog.html)

### Из admin.html (веб-редактор)
- CSS: `css/main.css`, `css/admin.css`
- JS: `js/github-api.js`, `js/markdown-converter-browser.js`, `js/admin.js`
- Иконки: `assets/icons/icon-name.svg`
- Блог: `blog.html`

## Принципы организации

1. **Модульность** - каждый компонент в отдельном файле
2. **Разделение по типам** - CSS, JS, HTML в отдельных папках
3. **Логическая группировка** - связанные файлы рядом (blog/, projects/)
4. **Документация рядом с кодом** - README в каждой папке где нужно
5. **Архив вместо удаления** - старые материалы в archive/

