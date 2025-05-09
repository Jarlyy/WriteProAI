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

    // Добавляем базовую оценку читаемости
    const readabilityScore = calculateReadabilityScore(text);

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
      readabilityScore
    });
  } catch (error) {
    console.error('Ошибка при проверке текста:', error);
    return NextResponse.json(
      {
        error: 'Ошибка при проверке текста',
        matches: [],
        readabilityScore: 0
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

function calculateReadabilityScore(text: string): number {
  // Простая реализация оценки читаемости
  const words = text.split(/\s+/).length;
  const sentences = text.split(/[.!?]+/).length;
  const avgWordsPerSentence = words / Math.max(1, sentences);

  // Шкала от 1 до 10 (чем выше - тем лучше)
  return Math.min(10, Math.max(1, 10 - (avgWordsPerSentence / 5)));
}