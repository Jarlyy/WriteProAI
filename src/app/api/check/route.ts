import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    // Реальный вызов LanguageTool API
    const response = await fetch('https://api.languagetool.org/v2/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        text,
        language: 'ru',
        enabledOnly: 'false'
      })
    });

    if (!response.ok) {
      throw new Error('Ошибка при вызове LanguageTool API');
    }

    const data = await response.json();

    // Добавляем базовую оценку читаемости
    const readabilityScore = calculateReadabilityScore(text);

    // Добавляем проверку запятых
    const commaErrors = checkCommas(text);

    // Модифицируем сообщения об ошибках
    const modifiedMatches = data.matches.map(match => {
      // Заменяем "Возможно найдена орфографическая ошибка" на "Возможно найдена ошибка"
      if (match.message && match.message.includes('Возможно найдена орфографическая ошибка')) {
        return {
          ...match,
          message: match.message.replace('Возможно найдена орфографическая ошибка', 'Возможно найдена ошибка')
        };
      }
      return match;
    });

    // Объединяем ошибки от LanguageTool и нашей проверки запятых
    const allMatches = [
      ...modifiedMatches,
      ...commaErrors
    ];

    return NextResponse.json({
      ...data,
      matches: allMatches,
      readabilityScore
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Ошибка при проверке текста' },
      { status: 500 }
    );
  }
}

function calculateReadabilityScore(text: string): number {
  // Простая реализация оценки читаемости
  const words = text.split(/\s+/).length;
  const sentences = text.split(/[.!?]+/).length;
  const avgWordsPerSentence = words / Math.max(1, sentences);

  // Шкала от 1 до 10 (чем выше - тем лучше)
  return Math.min(10, Math.max(1, 10 - (avgWordsPerSentence / 5)));
}

function checkCommas(text: string) {
  const commaErrors = [];

  // Массив правил для проверки запятых
  const commaRules = [
    // Запятая перед "но"
    {
      regex: /(\S+)(\s+)(но)(\s+)(\S+)/gi,
      errorMessage: 'Отсутствует запятая перед союзом "но"',
      correctForm: '$1, $3$4$5',
      offset: (match, groups) => {
        const beforeBut = match.indexOf('но');
        return beforeBut - 1;
      },
      length: 1
    },
    // Запятая перед "что"
    {
      regex: /(\S+)(\s+)(что)(\s+)(\S+)/gi,
      errorMessage: 'Возможно, отсутствует запятая перед союзом "что"',
      correctForm: '$1, $3$4$5',
      offset: (match, groups) => {
        const beforeWhat = match.indexOf('что');
        return beforeWhat - 1;
      },
      length: 1
    },
    // Запятая перед "который"
    {
      regex: /(\S+)(\s+)(который|которая|которое|которые)(\s+)(\S+)/gi,
      errorMessage: 'Отсутствует запятая перед союзным словом "который"',
      correctForm: '$1, $3$4$5',
      offset: (match, groups) => {
        const beforeWord = match.search(/который|которая|которое|которые/i);
        return beforeWord - 1;
      },
      length: 1
    },
    // Запятая перед "если"
    {
      regex: /(\S+)(\s+)(если)(\s+)(\S+)/gi,
      errorMessage: 'Отсутствует запятая перед союзом "если"',
      correctForm: '$1, $3$4$5',
      offset: (match, groups) => {
        const beforeIf = match.indexOf('если');
        return beforeIf - 1;
      },
      length: 1
    },
    // Запятая перед "потому что"
    {
      regex: /(\S+)(\s+)(потому что)(\s+)(\S+)/gi,
      errorMessage: 'Отсутствует запятая перед союзом "потому что"',
      correctForm: '$1, $3$4$5',
      offset: (match, groups) => {
        const beforeBecause = match.indexOf('потому');
        return beforeBecause - 1;
      },
      length: 1
    },
    // Запятая перед "чтобы"
    {
      regex: /(\S+)(\s+)(чтобы)(\s+)(\S+)/gi,
      errorMessage: 'Отсутствует запятая перед союзом "чтобы"',
      correctForm: '$1, $3$4$5',
      offset: (match, groups) => {
        const beforeInOrder = match.indexOf('чтобы');
        return beforeInOrder - 1;
      },
      length: 1
    },
    // Запятая перед "когда"
    {
      regex: /(\S+)(\s+)(когда)(\s+)(\S+)/gi,
      errorMessage: 'Отсутствует запятая перед союзом "когда"',
      correctForm: '$1, $3$4$5',
      offset: (match, groups) => {
        const beforeWhen = match.indexOf('когда');
        return beforeWhen - 1;
      },
      length: 1
    }
  ];

  // Проверяем каждое правило
  commaRules.forEach(rule => {
    let match;
    while ((match = rule.regex.exec(text)) !== null) {
      // Проверяем, есть ли уже запятая перед союзом
      const beforeMatch = text.substring(0, match.index + match[1].length);
      if (!beforeMatch.endsWith(',')) {
        commaErrors.push({
          message: rule.errorMessage,
          shortMessage: rule.errorMessage,
          offset: match.index + match[1].length + match[2].length - 1,
          length: 0,
          replacements: [{ value: ', ' + match[3] }],
          context: {
            text: match[0],
            offset: match.index
          },
          rule: {
            id: 'COMMA_BEFORE_CONJUNCTION',
            description: 'Проверка запятых перед союзами'
          }
        });
      }
    }
  });

  return commaErrors;
}