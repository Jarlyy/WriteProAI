# Product Requirements Document (PRD): Платформа для улучшения письменных работ  

## 1. Обзор  
**Цель**: Веб-приложение для школьников 10–18 лет, помогающее улучшать письменные работы через анализ ошибок, стиля и читаемости с объяснениями.  

## 2. Целевая аудитория  
- **Основные пользователи**: Ученики средней и старшей школы.  
- **Особенности**:  
  - Простой интерфейс с подсказками.  
  - Мотивация через визуализацию прогресса (графики, бейджи).  

## 3. Основные функции  
### MVP (первая версия):  
- 📝 **Редактор текста** с реалтайм-подсветкой ошибок.  
- ✅ **Проверка грамматики/пунктуации** (LanguageTool API).  
- 📊 **Оценка читаемости** (Hemingway API + Readability Formulas).  
- 🔍 **Подбор синонимов** (WordNet/Thesaurus API).  
- 📈 **Отслеживание прогресса** (сохранение истории работ).  

### Дополнительно (после MVP):  
- 🎮 Геймификация (баллы за исправления).  
- 📁 Шаблоны для сочинений/эссе.  

Технологический стек
- Фронтенд: Next.js (TSX), Tailwind CSS, shadcn/ui
- Бэкенд и аутентификация: Firebase или Supabase
- Хостинг: Vercel  
- Пакетный менеджер: pnpm

### Интеграции:  
- Бесплатные API: LanguageTool, Hemingway, WordNet.  
- **Google Cloud Natural Language** (если останется бесплатный лимит).  

## 5. Модель данных  
```json
{
  "User": {
    "id": "string",
    "email": "string",
    "oauth_provider": "google|email",
    "progress_stats": {
      "grammar_score": "number",
      "readability_score": "number"
    }
  },
  "TextDocument": {
    "user_id": "string",
    "content": "string",
    "analysis_results": {
      "errors": "array",
      "synonyms_suggested": "array"
    }
  }
}