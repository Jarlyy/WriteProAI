"use client";

import { useState, useMemo } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export default function Home() {
  const [text, setText] = useState("");
  const [errors, setErrors] = useState([]);
  const [readabilityScore, setReadabilityScore] = useState(0);

  const highlightedText = useMemo(() => {
    if (!text || errors.length === 0) return text;
    
    let result = [];
    let lastPos = 0;
    
    errors.sort((a, b) => a.offset - b.offset).forEach(error => {
      result.push(text.slice(lastPos, error.offset));
      result.push(
        <span key={error.offset} className="bg-red-200 dark:bg-red-800">
          {text.slice(error.offset, error.offset + error.length)}
        </span>
      );
      lastPos = error.offset + error.length;
    });
    
    result.push(text.slice(lastPos));
    return result;
  }, [text, errors]);

  const checkText = async () => {
    try {
      const response = await fetch('/api/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error('Ошибка проверки');

      const data = await response.json();
      setErrors(data.matches.map((match: any) => ({
        message: match.message,
        offset: match.offset,
        length: match.length,
        suggestions: match.replacements?.map((r: any) => r.value) || []
      })));
      setReadabilityScore(data.readabilityScore * 10);
    } catch (error) {
      console.error('Ошибка:', error);
      setErrors([{
        message: 'Не удалось проверить текст',
        offset: 0,
        length: 0
      }]);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">Проверка письменных работ</h1>
      
      <div className="grid gap-4">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Введите ваш текст для проверки..."
          className="min-h-[200px]"
        />

        <Button onClick={checkText} className="w-full sm:w-auto">
          Проверить текст
        </Button>

        {readabilityScore > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Читаемость текста:</span>
              <span>{readabilityScore}%</span>
            </div>
            <Progress value={readabilityScore} />
          </div>
        )}

        {errors.length > 0 && (
          <div className="space-y-4">
            <div className="border rounded-lg p-4 bg-red-50 dark:bg-red-900/20">
              <h2 className="font-semibold mb-2">Найдены ошибки:</h2>
              <ul className="list-disc pl-5 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>
                    {error.message}
                    {error.suggestions.length > 0 && (
                      <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                        (Возможные исправления: {error.suggestions.join(', ')})
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
              <h2 className="font-semibold mb-2">Текст с подсветкой ошибок:</h2>
              <div className="whitespace-pre-wrap">
                {highlightedText}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
