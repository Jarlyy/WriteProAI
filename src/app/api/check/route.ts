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
    
    return NextResponse.json({
      ...data,
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