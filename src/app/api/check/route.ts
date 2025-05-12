import { NextResponse } from 'next/server';

// Интерфейсы для Yandex Speller API
interface YandexSpellerError {
  code: number;      // Код ошибки (1 - орфография, 2 - повтор, 3 - капитализация)
  pos: number;       // Позиция ошибки в тексте
  row: number;       // Номер строки
  col: number;       // Номер столбца
  len: number;       // Длина слова с ошибкой
  word: string;      // Слово с ошибкой
  s: string[];       // Варианты исправления
}

// Интерфейс для ошибок в формате LanguageTool (для совместимости)
interface LanguageToolMatch {
  message: string;
  offset: number;
  length: number;
  replacements?: { value: string }[];
  context?: {
    text: string;
    offset: number;
  };
  rule?: {
    id: string;
    description?: string;
  };
}

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    // Вызов Yandex Speller API
    const response = await fetch('https://speller.yandex.net/services/spellservice.json/checkText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        text,
        lang: 'ru',
        options: '4',  // Игнорировать URL и email
        format: 'plain'
      })
    });

    if (!response.ok) {
      throw new Error('Ошибка при вызове Yandex Speller API');
    }

    // Получаем результаты от Yandex Speller
    const spellerErrors: YandexSpellerError[] = await response.json();

    // Получаем детальные метрики читаемости
    const readabilityMetrics = calculateDetailedReadabilityMetrics(text);
    const readabilityScore = readabilityMetrics.score;

    // Преобразуем ошибки Yandex Speller в формат, совместимый с LanguageTool
    const matches: LanguageToolMatch[] = spellerErrors.map(error => {
      // Формируем сообщение об ошибке в зависимости от кода ошибки
      let message = '';
      let ruleId = '';

      switch (error.code) {
        case 1: // Орфографическая ошибка
          message = `Возможно найдена ошибка: "${error.word}"`;
          ruleId = 'SPELLING_RULE';
          break;
        case 2: // Повтор слова
          message = `Повтор слова: "${error.word}"`;
          ruleId = 'REPEATED_WORDS';
          break;
        case 3: // Неверное употребление прописных и строчных букв
          message = `Неверное употребление прописных и строчных букв: "${error.word}"`;
          ruleId = 'CAPITALIZATION';
          break;
        default:
          message = `Ошибка в слове: "${error.word}"`;
          ruleId = 'UNKNOWN_ERROR';
      }

      // Создаем контекст для ошибки
      const contextStart = Math.max(0, error.pos - 20);
      const contextEnd = Math.min(text.length, error.pos + error.len + 20);
      const contextText = text.substring(contextStart, contextEnd);

      // Преобразуем варианты исправления в формат LanguageTool
      const replacements = error.s.map(suggestion => ({ value: suggestion }));

      return {
        message,
        offset: error.pos,
        length: error.len,
        replacements,
        context: {
          text: contextText,
          offset: contextStart
        },
        rule: {
          id: ruleId,
          description: 'Проверка орфографии и пунктуации'
        }
      };
    });

    // Проверяем запятые в тексте (Yandex Speller не проверяет пунктуацию)
    // Для этого можно использовать регулярные выражения для поиска распространенных ошибок с запятыми
    const commaMatches = checkCommasWithRegex(text);

    // Объединяем все найденные ошибки
    const allMatches = [...matches, ...commaMatches];

    return NextResponse.json({
      matches: allMatches,
      readabilityScore: readabilityScore,
      readabilityMetrics: {
        fleschKincaid: readabilityMetrics.fleschKincaid,
        colemanLiau: readabilityMetrics.colemanLiau,
        avgSentenceLength: readabilityMetrics.avgSentenceLength,
        avgWordLength: readabilityMetrics.avgWordLength,
        complexWordsPercentage: readabilityMetrics.complexWordsPercentage,
        lexicalDiversity: readabilityMetrics.lexicalDiversity
      }
    });
  } catch (error) {
    console.error('Ошибка при проверке текста:', error);
    return NextResponse.json(
      {
        error: 'Ошибка при проверке текста',
        matches: [],
        readabilityScore: 0,
        readabilityMetrics: {
          fleschKincaid: 0,
          colemanLiau: 0,
          avgSentenceLength: 0,
          avgWordLength: 0,
          complexWordsPercentage: 0,
          lexicalDiversity: 0
        }
      },
      { status: 500 }
    );
  }
}

// Функция для проверки запятых с помощью регулярных выражений
function checkCommasWithRegex(text: string): LanguageToolMatch[] {
  const commaErrors: LanguageToolMatch[] = [];

  // Массив правил для проверки запятых
  const commaRules = [
    // Запятая перед "но"
    {
      regex: /(\S+)(\s+)(но)(\s+)(\S+)/gi,
      errorMessage: 'Пропущена запятая перед союзом "но"',
      ruleId: 'COMMA_BEFORE_CONJUNCTION'
    },
    // Запятая перед "что"
    {
      regex: /(\S+)(\s+)(что)(\s+)(\S+)/gi,
      errorMessage: 'Пропущена запятая перед союзом "что"',
      ruleId: 'COMMA_BEFORE_CONJUNCTION'
    },
    // Запятая перед "который"
    {
      regex: /(\S+)(\s+)(который|которая|которое|которые)(\s+)(\S+)/gi,
      errorMessage: 'Пропущена запятая перед союзным словом',
      ruleId: 'COMMA_BEFORE_CONJUNCTION'
    },
    // Запятая перед "если"
    {
      regex: /(\S+)(\s+)(если)(\s+)(\S+)/gi,
      errorMessage: 'Пропущена запятая перед союзом "если"',
      ruleId: 'COMMA_BEFORE_CONJUNCTION'
    },
    // Запятая перед "потому что"
    {
      regex: /(\S+)(\s+)(потому что)(\s+)(\S+)/gi,
      errorMessage: 'Пропущена запятая перед союзом "потому что"',
      ruleId: 'COMMA_BEFORE_CONJUNCTION'
    },
    // Запятая перед "чтобы"
    {
      regex: /(\S+)(\s+)(чтобы)(\s+)(\S+)/gi,
      errorMessage: 'Пропущена запятая перед союзом "чтобы"',
      ruleId: 'COMMA_BEFORE_CONJUNCTION'
    },
    // Запятая перед "когда"
    {
      regex: /(\S+)(\s+)(когда)(\s+)(\S+)/gi,
      errorMessage: 'Пропущена запятая перед союзом "когда"',
      ruleId: 'COMMA_BEFORE_CONJUNCTION'
    }
  ];

  // Создаем множество для отслеживания уже найденных ошибок
  const foundErrorOffsets = new Set();

  // Проверяем каждое правило
  commaRules.forEach(rule => {
    let match: RegExpExecArray | null;
    while ((match = rule.regex.exec(text)) !== null) {
      // Проверяем, есть ли уже запятая перед союзом
      const beforeMatch = text.substring(0, match.index + match[1].length);

      // Проверяем, не обнаружили ли мы уже ошибку с таким смещением
      if (foundErrorOffsets.has(match.index)) {
        continue;
      }

      // Проверяем, находится ли слово в начале предложения
      const textBefore = text.substring(0, match.index).trim();
      const isStartOfSentence =
        match.index === 0 ||
        textBefore === "" ||
        /[.!?]\s*$/.test(textBefore) ||
        /[—–-]\s*$/.test(textBefore);

      // Для союзов в начале предложения запятая не нужна
      if (isStartOfSentence) {
        continue;
      }

      // Если перед союзом нет запятой, добавляем ошибку
      if (!beforeMatch.endsWith(',')) {
        // Вычисляем позицию для подсветки - последняя буква первого слова и пробел
        const wordBeforeOffset = match.index;
        const wordBeforeLength = match[1].length;
        const spaceLength = match[2].length;

        // Добавляем смещение в множество найденных ошибок
        foundErrorOffsets.add(wordBeforeOffset);

        // Вычисляем позицию для подсветки - только две буквы между которыми должна быть запятая
        const lastLetterOffset = match.index + wordBeforeLength - 1;

        // Получаем контекст для ошибки
        const contextStart = Math.max(0, lastLetterOffset - 20);
        const contextEnd = Math.min(text.length, lastLetterOffset + 20);
        const contextText = text.substring(contextStart, contextEnd);

        // Создаем ошибку с подсветкой только двух букв
        commaErrors.push({
          message: rule.errorMessage,
          offset: lastLetterOffset,
          length: 1 + spaceLength + 1,
          replacements: [{ value: match[1].slice(-1) + ', ' + match[3].slice(0, 1) }],
          context: {
            text: contextText,
            offset: contextStart
          },
          rule: {
            id: rule.ruleId,
            description: 'Проверка запятых в предложении'
          }
        });
      }
    }
  });

  return commaErrors;
}

// Интерфейс для результатов оценки читаемости
interface ReadabilityMetrics {
  score: number;           // Общая оценка читаемости (от 0 до 1)
  fleschKincaid: number;   // Индекс Флеша-Кинкейда (адаптированный для русского)
  colemanLiau: number;     // Индекс Колмана-Лиау
  avgSentenceLength: number; // Средняя длина предложения (в словах)
  avgWordLength: number;   // Средняя длина слова (в символах)
  complexWordsPercentage: number; // Процент сложных слов
  lexicalDiversity: number; // Лексическое разнообразие
}

function calculateReadabilityScore(text: string): number {
  // Получаем детальные метрики читаемости
  const metrics = calculateDetailedReadabilityMetrics(text);

  // Возвращаем общую оценку (для обратной совместимости)
  return metrics.score;
}

function calculateDetailedReadabilityMetrics(text: string): ReadabilityMetrics {
  // Если текст пустой, возвращаем нулевые метрики
  if (!text || text.trim() === '') {
    return {
      score: 0,
      fleschKincaid: 0,
      colemanLiau: 0,
      avgSentenceLength: 0,
      avgWordLength: 0,
      complexWordsPercentage: 0,
      lexicalDiversity: 0
    };
  }

  // Нормализуем текст (удаляем лишние пробелы, приводим к нижнему регистру)
  const normalizedText = text.trim().toLowerCase();

  // Разбиваем текст на предложения
  // Учитываем различные знаки конца предложения и сохраняем непустые предложения
  const sentences = normalizedText
    .split(/[.!?…]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  // Разбиваем текст на слова (учитываем только буквенные слова)
  const words = normalizedText
    .replace(/[^а-яёa-z\s-]/gi, ' ')  // Заменяем все небуквенные символы на пробелы
    .split(/\s+/)
    .filter(w => w.length > 0);

  // Считаем количество слогов в каждом слове
  const syllablesByWord = words.map(word => countSyllables(word));
  const totalSyllables = syllablesByWord.reduce((sum, count) => sum + count, 0);

  // Считаем количество символов в каждом слове
  const charsByWord = words.map(word => word.length);
  const totalChars = charsByWord.reduce((sum, count) => sum + count, 0);

  // Считаем количество сложных слов (слова с 4+ слогами)
  const complexWords = syllablesByWord.filter(count => count >= 4).length;

  // Вычисляем основные метрики
  const sentenceCount = Math.max(1, sentences.length);
  const wordCount = Math.max(1, words.length);
  const avgSentenceLength = wordCount / sentenceCount;
  const avgWordLength = totalChars / wordCount;
  const avgSyllablesPerWord = totalSyllables / wordCount;
  const complexWordsPercentage = (complexWords / wordCount) * 100;

  // Вычисляем лексическое разнообразие (отношение уникальных слов к общему количеству)
  const uniqueWords = new Set(words).size;
  const lexicalDiversity = uniqueWords / wordCount;

  // Вычисляем индекс Флеша-Кинкейда (адаптированный для русского языка)
  // Формула: 206.835 - (1.3 * avgSentenceLength) - (60.1 * avgSyllablesPerWord)
  const fleschKincaid = Math.max(0, Math.min(100,
    206.835 - (1.3 * avgSentenceLength) - (60.1 * avgSyllablesPerWord)
  ));

  // Вычисляем индекс Колмана-Лиау
  // Формула: 5.89 * (totalChars / wordCount) - 29.5 * (sentenceCount / wordCount) - 15.8
  const colemanLiau = Math.max(0, Math.min(100,
    5.89 * avgWordLength - 29.5 * (sentenceCount / wordCount) - 15.8 + 50
  ));

  // Вычисляем общую оценку читаемости (от 0 до 1)
  // Комбинируем различные метрики с весами
  const fleschWeight = 0.4;
  const colemanWeight = 0.3;
  const diversityWeight = 0.15;
  const complexityWeight = 0.15;

  // Нормализуем метрики к диапазону [0, 1]
  const normalizedFlesch = fleschKincaid / 100;
  const normalizedColeman = colemanLiau / 100;
  const normalizedDiversity = Math.min(1, lexicalDiversity * 2); // Умножаем на 2, т.к. обычно < 0.5
  const normalizedComplexity = 1 - (complexWordsPercentage / 100); // Инвертируем, т.к. меньше сложных слов = лучше

  // Вычисляем взвешенную сумму
  const score = (
    normalizedFlesch * fleschWeight +
    normalizedColeman * colemanWeight +
    normalizedDiversity * diversityWeight +
    normalizedComplexity * complexityWeight
  );

  // Возвращаем все метрики
  return {
    score,
    fleschKincaid,
    colemanLiau,
    avgSentenceLength,
    avgWordLength,
    complexWordsPercentage,
    lexicalDiversity
  };
}

// Функция для подсчета слогов в слове
function countSyllables(word: string): number {
  // Адаптировано для русского языка
  if (!word) return 0;

  // Удаляем все небуквенные символы
  word = word.toLowerCase().replace(/[^а-яёa-z]/g, '');

  // Для русских слов
  if (/[а-яё]/.test(word)) {
    // Считаем гласные буквы
    const vowels = word.match(/[аеёиоуыэюя]/g);
    return vowels ? vowels.length : 1;
  }

  // Для английских слов (на случай, если в тексте есть английские слова)
  // Считаем гласные, но учитываем дифтонги и немые e в конце
  word = word.replace(/(?:[^laeiouy]|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const syllables = word.match(/[aeiouy]{1,2}/g);
  return syllables ? syllables.length : 1;
}