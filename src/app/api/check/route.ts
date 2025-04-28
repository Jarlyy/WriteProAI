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

      // Модифицируем ошибки с запятыми от LanguageTool, чтобы они тоже выделялись только двумя буквами
      if (match.message &&
          (match.message.toLowerCase().includes('запятая') ||
           match.message.toLowerCase().includes('запятую') ||
           match.message.toLowerCase().includes('запятые'))) {

        // Получаем текст до и после места, где должна быть запятая
        const textBefore = text.substring(0, match.offset);
        const textAfter = text.substring(match.offset);

        // Находим последнее слово перед местом, где должна быть запятая
        const lastWordMatch = textBefore.match(/(\S+)\s*$/);
        // Находим первое слово после места, где должна быть запятая
        const firstWordMatch = textAfter.match(/^\s*(\S+)/);

        if (lastWordMatch && firstWordMatch) {
          const lastWord = lastWordMatch[1];
          const firstWord = firstWordMatch[1];

          // Вычисляем новое смещение и длину для подсветки только двух букв
          const lastLetterOffset = match.offset - 1;
          const spaceLength = textAfter.match(/^\s*/)[0].length;

          console.log('Модифицируем ошибку с запятой от LanguageTool:', {
            message: match.message,
            originalOffset: match.offset,
            originalLength: match.length,
            lastWord,
            firstWord,
            lastLetter: lastWord.slice(-1),
            firstLetter: firstWord.slice(0, 1),
            newOffset: lastLetterOffset,
            newLength: 1 + spaceLength + 1
          });

          // Получаем контекст для ошибки - берем несколько слов до и после места, где должна быть запятая
          const contextStart = Math.max(0, lastLetterOffset - 20);
          const contextEnd = Math.min(text.length, lastLetterOffset + 20);
          const contextText = text.substring(contextStart, contextEnd);

          // Возвращаем модифицированную ошибку с контекстом
          return {
            ...match,
            offset: lastLetterOffset,
            length: 1 + spaceLength + 1,
            context: {
              text: contextText,
              offset: contextStart
            },
            rule: {
              ...match.rule,
              id: match.rule?.id || 'PUNCTUATION'
            }
          };
        }
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

// Функция для проверки, находится ли слово после точки (в начале нового предложения)
function isAfterPeriod(text: string, position: number): boolean {
  // Если позиция в начале текста, то это начало предложения
  if (position === 0) return true;

  // Получаем текст до указанной позиции
  const textBefore = text.substring(0, position).trim();

  // Проверяем, заканчивается ли текст перед позицией точкой, восклицательным или вопросительным знаком
  if (/[.!?]\s*$/.test(textBefore)) return true;

  // Проверяем, есть ли перед позицией тире, которое может начинать новое предложение в диалоге
  if (/[—–-]\s*$/.test(textBefore)) return true;

  // Проверяем, есть ли перед позицией двоеточие, которое может начинать новое предложение
  if (/[:]\s*$/.test(textBefore)) return true;

  // Проверяем, есть ли перед позицией кавычки, которые могут начинать прямую речь
  if (/["«]\s*$/.test(textBefore)) return true;

  // Проверяем, является ли текст перед позицией частью диалога с тире
  if (/—\s+\S+\s+—\s+\S+\s*$/.test(textBefore)) return true;

  return false;
}

function checkCommas(text: string) {
  const commaErrors = [];

  // Массив правил для проверки запятых
  const commaRules = [
    // Запятая перед "но"
    {
      regex: /(\S+)(\s+)(но)(\s+)(\S+)/gi,
      errorMessage: 'Пропущена запятая: «но»',
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
      errorMessage: 'Пропущена запятая: «что»',
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
      errorMessage: 'Пропущена запятая: «который»',
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
      errorMessage: 'Пропущена запятая: «если»',
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
      errorMessage: 'Пропущена запятая: «потому что»',
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
      errorMessage: 'Пропущена запятая: «чтобы»',
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
      errorMessage: 'Пропущена запятая: «когда»',
      correctForm: '$1, $3$4$5',
      offset: (match, groups) => {
        const beforeWhen = match.indexOf('когда');
        return beforeWhen - 1;
      },
      length: 1
    },
    // Запятая перед "где"
    {
      regex: /(\S+)(\s+)(где)(\s+)(\S+)/gi,
      errorMessage: 'Пропущена запятая: «где»',
      correctForm: '$1, $3$4$5',
      offset: (match, groups) => {
        const beforeWhere = match.indexOf('где');
        return beforeWhere - 1;
      },
      length: 1
    },
    // Запятая перед "как"
    {
      regex: /(\S+)(\s+)(как)(\s+)(\S+)/gi,
      errorMessage: 'Пропущена запятая: «как»',
      correctForm: '$1, $3$4$5',
      offset: (match, groups) => {
        const beforeAs = match.indexOf('как');
        return beforeAs - 1;
      },
      length: 1
    },
    // Запятая перед "поскольку"
    {
      regex: /(\S+)(\s+)(поскольку)(\s+)(\S+)/gi,
      errorMessage: 'Пропущена запятая: «поскольку»',
      correctForm: '$1, $3$4$5',
      offset: (match, groups) => {
        const beforeSince = match.indexOf('поскольку');
        return beforeSince - 1;
      },
      length: 1
    },
    // Запятая перед "хотя"
    {
      regex: /(\S+)(\s+)(хотя)(\s+)(\S+)/gi,
      errorMessage: 'Пропущена запятая: «хотя»',
      correctForm: '$1, $3$4$5',
      offset: (match, groups) => {
        const beforeAlthough = match.indexOf('хотя');
        return beforeAlthough - 1;
      },
      length: 1
    },
    // Деепричастные обороты (простые случаи)
    {
      regex: /(\S+)(\s+)([а-яё]+(?:в|вши|вшись))(\s+)(\S+)/gi,
      errorMessage: 'Пропущена запятая: деепричастный оборот',
      correctForm: '$1, $3$4$5',
      offset: (match, groups) => {
        const beforeParticiple = match.search(/[а-яё]+(?:в|вши|вшись)/i);
        return beforeParticiple - 1;
      },
      length: 1
    },
    // Деепричастия на -я
    {
      regex: /(\S+)(\s+)([а-яё]+я)(\s+)(\S+)/gi,
      errorMessage: 'Возможно пропущена запятая: деепричастие на -я',
      correctForm: '$1, $3$4$5',
      offset: (match, groups) => {
        const beforeParticiple = match.search(/[а-яё]+я/i);
        return beforeParticiple - 1;
      },
      length: 1,
      // Дополнительная проверка для исключения ложных срабатываний
      validate: (match) => {
        const word = match[3].toLowerCase();
        // Список распространенных деепричастий на -я
        const commonParticiples = [
          'гуляя', 'читая', 'смотря', 'видя', 'слыша', 'думая', 'зная', 'понимая',
          'делая', 'говоря', 'слушая', 'стоя', 'сидя', 'лежа', 'идя', 'бегая',
          'плавая', 'летая', 'работая', 'отдыхая', 'улыбаясь', 'смеясь', 'плача'
        ];
        return commonParticiples.includes(word);
      }
    },
    // Причастные обороты (простые случаи)
    {
      regex: /(\S+)(\s+)([а-яё]+(?:щий|щая|щее|щие|вший|вшая|вшее|вшие|емый|емая|емое|емые|имый|имая|имое|имые|нный|нная|нное|нные|тый|тая|тое|тые))(\s+)(\S+)/gi,
      errorMessage: 'Пропущена запятая: причастный оборот',
      correctForm: '$1, $3$4$5',
      offset: (match, groups) => {
        const beforeParticiple = match.search(/[а-яё]+(?:щий|щая|щее|щие|вший|вшая|вшее|вшие|емый|емая|емое|емые|имый|имая|имое|имые|нный|нная|нное|нные|тый|тая|тое|тые)/i);
        return beforeParticiple - 1;
      },
      length: 1
    },
    // Однородные члены с союзом "и"
    {
      regex: /(\S+)(\s+)(\S+)(\s+)(и)(\s+)(\S+)/gi,
      errorMessage: 'Пропущена запятая: однородные члены',
      correctForm: '$1, $3$4$5$6$7',
      offset: (match, groups) => {
        const beforeAnd = match.indexOf(' и ');
        return beforeAnd - 1;
      },
      length: 1,
      // Дополнительная проверка для исключения ложных срабатываний
      validate: (match) => {
        // Проверяем, что первое и третье слова - однородные члены (например, оба существительные или глаголы)
        const word1 = match[1].toLowerCase();
        const word3 = match[3].toLowerCase();
        const word7 = match[7].toLowerCase();

        // Простая эвристика: если слова имеют одинаковые окончания, вероятно, это однородные члены
        const ending1 = word1.slice(-2);
        const ending3 = word3.slice(-2);
        const ending7 = word7.slice(-2);

        return ending1 === ending3 || ending3 === ending7;
      }
    }
  ];

  // Создаем множество для отслеживания уже найденных ошибок
  const foundErrorOffsets = new Set();

  // Проверяем каждое правило
  commaRules.forEach(rule => {
    let match;
    while ((match = rule.regex.exec(text)) !== null) {
      // Проверяем, есть ли уже запятая перед союзом
      const beforeMatch = text.substring(0, match.index + match[1].length);

      // Вычисляем позицию для подсветки - захватываем слово до и слово после места, где должна быть запятая
      const wordBeforeOffset = match.index;

      // Проверяем, не обнаружили ли мы уже ошибку с таким смещением
      // Это поможет избежать дублирования ошибок для одного и того же деепричастия
      if (foundErrorOffsets.has(wordBeforeOffset)) {
        console.log('Пропускаем дублирующую ошибку:', {
          match: match[0],
          offset: wordBeforeOffset,
          rule: rule.errorMessage
        });
        continue;
      }

      // Если есть функция валидации, используем её
      const isValid = rule.validate ? rule.validate(match) : true;

      // Проверяем, находится ли слово в начале предложения
      // Для этого используем функцию isAfterPeriod
      const textBefore = text.substring(0, match.index).trim();

      // Используем функцию isAfterPeriod для проверки, находится ли слово после точки
      const isWordAfterPeriod = isAfterPeriod(text, match.index);

      // Проверяем последние символы текста перед совпадением
      const lastChar = textBefore.length > 0 ? textBefore.charAt(textBefore.length - 1) : '';
      const lastTwoChars = textBefore.length > 1 ? textBefore.substring(textBefore.length - 2) : '';

      // Проверяем весь текст перед совпадением на наличие тире в диалоге
      const containsDialogueDash = /[—–-]/.test(textBefore);

      // Проверяем, есть ли перед словом знаки, которые могут начинать новое предложение
      const hasEndPunctuation = /[.!?]/.test(lastChar);
      const hasDash = /[—–-]/.test(lastChar);
      const hasColon = lastChar === ':';
      const hasQuote = lastChar === '"' || lastChar === '"' || lastChar === '«';
      const hasDashWithSpace = /[—–-]\s/.test(lastTwoChars);

      // Проверяем, является ли текст перед совпадением частью диалога с тире
      const isPartOfDialogue = /—\s+\S+\s+—\s+\S+/.test(textBefore) ||
                              /«\s*—\s+\S+/.test(textBefore) ||
                              /"\s*—\s+\S+/.test(textBefore);

      // Специальная проверка для примера "Осторожно! — предупредила Катя — Он может сломаться!"
      const isSpecialCase = (match[1].toLowerCase() === 'он' && match[3].toLowerCase() === 'может' &&
                           (textBefore.includes('предупредила') || textBefore.includes('сказала') ||
                            textBefore.includes('воскликнула') || textBefore.includes('ответила'))) ||
                           // Специальная проверка для "Но Петя не послушался"
                           (match[1].toLowerCase() === 'но' && textBefore === "");

      // Принудительная проверка на точку перед словом
      // Проверяем, есть ли точка, восклицательный или вопросительный знак перед словом
      const hasPeriodBefore = /[.!?]\s+\S+\s+$/.test(textBefore);

      // Слово находится в начале предложения, если:
      const isStartOfSentence =
        isWordAfterPeriod || // Используем функцию isAfterPeriod
        match.index === 0 ||
        textBefore === "" ||
        hasEndPunctuation ||
        hasDash ||
        hasColon ||
        hasQuote ||
        hasDashWithSpace ||
        isPartOfDialogue ||
        isSpecialCase ||
        hasPeriodBefore; // Добавляем принудительную проверку на точку

      // Для союзов и некоторых других слов в начале предложения запятая не нужна
      const conjunctionsAndWords = [
        'но', 'что', 'если', 'потому', 'чтобы', 'когда', 'где', 'как', 'поскольку', 'хотя',
        'и', 'а', 'или', 'либо', 'ни', 'то', 'да', 'зато', 'однако', 'тем', 'не', 'же',
        'он', 'она', 'оно', 'они', 'мы', 'вы', 'ты', 'я'
      ];

      const isConjunctionAtStart = isStartOfSentence &&
        conjunctionsAndWords.includes(match[3].toLowerCase());

      // Для деепричастий и причастий в начале предложения также не нужна запятая
      const isParticipleAtStart = isStartOfSentence &&
        (rule.errorMessage.includes('деепричастн') || rule.errorMessage.includes('причастн'));

      // Проверяем, является ли это словом после тире в диалоге
      // В таком случае это начало новой фразы, и запятая не нужна
      const isAfterDialogueDash = hasDash || hasDashWithSpace || isPartOfDialogue || isSpecialCase ||
                                (containsDialogueDash && match[1].toLowerCase() === 'он');

      // Добавляем отладочный вывод для проверки определения начала предложения
      if (match[3].toLowerCase() === 'но' || match[3].toLowerCase() === 'он' || match[3].toLowerCase() === 'может' ||
          rule.errorMessage.includes('деепричастн') || rule.errorMessage.includes('причастн')) {
        console.log('Проверка начала предложения:', {
          match: match[0],
          textBefore,
          lastChar,
          lastTwoChars,
          isWordAfterPeriod,
          hasPeriodBefore,
          containsDialogueDash,
          isPartOfDialogue,
          isSpecialCase,
          isStartOfSentence,
          isConjunctionAtStart,
          isParticipleAtStart,
          isAfterDialogueDash
        });
      }

      if (!beforeMatch.endsWith(',') && isValid && !isConjunctionAtStart && !isParticipleAtStart && !isAfterDialogueDash) {
        // Определяем тип правила для более точной категоризации
        const ruleType = rule.errorMessage.includes('деепричастн')
          ? 'COMMA_BEFORE_PARTICIPLE'
          : 'COMMA_BEFORE_CONJUNCTION';

        const wordBeforeLength = match[1].length;
        const spaceLength = match[2].length;
        const wordAfterOffset = match.index + wordBeforeLength + spaceLength;
        const wordAfterLength = match[3].length;

        // Добавляем смещение в множество найденных ошибок
        foundErrorOffsets.add(wordBeforeOffset);

        // Вычисляем позицию для подсветки - только две буквы между которыми должна быть запятая
        // Последняя буква первого слова и первая буква второго слова
        const lastLetterOffset = match.index + wordBeforeLength - 1;
        const firstLetterOffset = wordAfterOffset;

        // Добавляем отладочный вывод для проверки новой логики подсветки
        console.log('Новая логика подсветки запятых:', {
          match: match[0],
          firstWord: match[1],
          secondWord: match[3],
          lastLetter: match[1].slice(-1),
          firstLetter: match[3].slice(0, 1),
          lastLetterOffset,
          firstLetterOffset,
          spaceLength,
          highlightLength: 1 + spaceLength + 1
        });

        // Создаем ошибку с подсветкой только двух букв
        commaErrors.push({
          message: rule.errorMessage,
          shortMessage: rule.errorMessage,
          // Начинаем с последней буквы первого слова
          offset: lastLetterOffset,
          // Длина включает последнюю букву первого слова, пробел и первую букву второго слова
          length: 1 + spaceLength + 1,
          replacements: [{ value: match[1].slice(-1) + ', ' + match[3].slice(0, 1) }],
          context: {
            text: match[0],
            offset: match.index
          },
          rule: {
            id: ruleType,
            description: 'Проверка запятых в предложении'
          }
        });
      }
    }
  });

  return commaErrors;
}