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
          // Вычисляем новое смещение и длину для подсветки только двух букв
          const lastLetterOffset = match.offset - 1;
          const spaceLength = textAfter.match(/^\s*/)[0].length;

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

    return NextResponse.json({
      ...data,
      matches: modifiedMatches,
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