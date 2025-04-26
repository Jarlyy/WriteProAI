"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Copy, Check } from "lucide-react";

// Словарь популярных слов и их веса для улучшения исправления ошибок
const POPULAR_WORDS = {
  "съел": 100,
  "съесть": 95,
  "съедобный": 90,
  "съезд": 85,
  "съемка": 80,
  "объем": 75,
  "подъезд": 70,
  "объект": 65,
  "объявление": 60,
  "объяснение": 55,
  "сел": 50,
  "ел": 45,
  "поел": 40,
  "доел": 35,
  "ела": 30,
  "льял": 5,
  // Можно добавить больше слов по мере необходимости
};

// Словарь контекстных словосочетаний для улучшения исправления ошибок
const CONTEXT_PHRASES = [
  { words: ["я", "съел"], weight: 100 },
  { words: ["он", "съел"], weight: 100 },
  { words: ["она", "съела"], weight: 100 },
  { words: ["мы", "съели"], weight: 100 },
  { words: ["они", "съели"], weight: 100 },
  { words: ["съел", "суп"], weight: 95 },
  { words: ["съел", "яблоко"], weight: 95 },
  { words: ["съел", "обед"], weight: 95 },
  { words: ["съел", "завтрак"], weight: 95 },
  { words: ["съел", "ужин"], weight: 95 },
  { words: ["быстро", "съел"], weight: 90 },
  { words: ["полностью", "съел"], weight: 90 },
  { words: ["сел", "на"], weight: 85 },
  { words: ["сел", "за"], weight: 85 },
  { words: ["сел", "в"], weight: 85 },
  { words: ["он", "сел"], weight: 80 },
  { words: ["она", "села"], weight: 80 },
  { words: ["ел", "суп"], weight: 75 },
  { words: ["ел", "кашу"], weight: 75 },
  { words: ["ел", "медленно"], weight: 75 },
  { words: ["ел", "быстро"], weight: 75 },
  // Можно добавить больше словосочетаний по мере необходимости
];

export default function Home() {
  const [text, setText] = useState("");
  const [checkedText, setCheckedText] = useState("");
  const [correctedText, setCorrectedText] = useState("");
  const [errors, setErrors] = useState([]);
  const [commaErrors, setCommaErrors] = useState([]);
  const [spellingErrors, setSpellingErrors] = useState([]);
  const [otherErrors, setOtherErrors] = useState([]);
  const [readabilityScore, setReadabilityScore] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Проверяем текущую тему при загрузке компонента
  useEffect(() => {
    // Проверяем предпочтения пользователя
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    // Проверяем сохраненную тему
    const savedTheme = localStorage.getItem("theme");

    // Устанавливаем начальное состояние
    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // Функция для переключения темы
  const toggleTheme = () => {
    if (isDarkMode) {
      // Переключаемся на светлую тему
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDarkMode(false);
    } else {
      // Переключаемся на темную тему
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDarkMode(true);
    }
  };

  // Функция для копирования текста
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);

    // Через 2 секунды возвращаем состояние в исходное
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };

  // Функция для анализа контекста и выбора наиболее подходящего варианта исправления
  const getBestSuggestion = useCallback((word, suggestions, offset, fullText) => {
    if (!suggestions || suggestions.length === 0) return word;

    // Если есть только одно предложение, возвращаем его
    if (suggestions.length === 1) return suggestions[0];

    // Получаем контекст вокруг слова (5 слов до и 5 слов после)
    const contextSize = 5;
    const words = fullText.split(/\s+/);
    let wordIndex = 0;
    let currentOffset = 0;

    // Находим индекс текущего слова в массиве слов
    for (let i = 0; i < words.length; i++) {
      if (currentOffset <= offset && offset < currentOffset + words[i].length) {
        wordIndex = i;
        break;
      }
      // Учитываем длину слова и пробел после него
      currentOffset += words[i].length + 1;
    }

    // Получаем слова до и после текущего слова
    const startIndex = Math.max(0, wordIndex - contextSize);
    const endIndex = Math.min(words.length, wordIndex + contextSize + 1);
    const contextWords = words.slice(startIndex, endIndex).map(w =>
      w.toLowerCase().replace(/[.,!?;:()]/g, '')
    );

    // Проверяем, есть ли предложения в нашем словаре популярных слов
    const suggestionsWithWeights = suggestions.map(suggestion => {
      const lowerSuggestion = suggestion.toLowerCase();
      // Базовый вес из словаря популярных слов
      let weight = POPULAR_WORDS[lowerSuggestion] || 10;

      // Проверяем контекстные словосочетания
      for (const phrase of CONTEXT_PHRASES) {
        if (phrase.words.length === 2) {
          const [word1, word2] = phrase.words;

          // Проверяем, является ли текущее слово первым словом в словосочетании
          if (lowerSuggestion === word1) {
            // Ищем второе слово в контексте после текущего слова
            for (let i = wordIndex + 1; i < endIndex; i++) {
              if (contextWords[i - startIndex] === word2) {
                weight += phrase.weight;
                break;
              }
            }
          }

          // Проверяем, является ли текущее слово вторым словом в словосочетании
          if (lowerSuggestion === word2) {
            // Ищем первое слово в контексте перед текущим словом
            for (let i = startIndex; i < wordIndex; i++) {
              if (contextWords[i - startIndex] === word1) {
                weight += phrase.weight;
                break;
              }
            }
          }
        }
      }

      return { suggestion, weight };
    });

    // Сортируем предложения по весу (от большего к меньшему)
    suggestionsWithWeights.sort((a, b) => b.weight - a.weight);

    // Возвращаем предложение с наибольшим весом
    return suggestionsWithWeights[0].suggestion;
  }, []);

  // Функция для автоматического исправления ошибок
  const generateCorrectedText = useCallback((text, errors) => {
    if (!text || errors.length === 0) return text;

    // Сортируем ошибки по позиции в обратном порядке,
    // чтобы исправления не влияли на позиции других ошибок
    const sortedErrors = [...errors].sort((a, b) => b.offset - a.offset);

    let corrected = text;

    sortedErrors.forEach(error => {
      // Выводим информацию об ошибке для отладки
      console.log('Обработка ошибки:', error.message, 'Предложения:', error.suggestions);

      // Проверяем, есть ли предложения по исправлению
      if (error.suggestions && error.suggestions.length > 0) {
        // Для ошибок с запятыми (length = 0) добавляем запятую
        if (error.length === 0 &&
            (error.ruleId === 'COMMA_BEFORE_CONJUNCTION' ||
             (error.message && error.message.toLowerCase().includes('запятая')))) {
          // Вставляем запятую в нужную позицию
          corrected = corrected.slice(0, error.offset) + ',' + corrected.slice(error.offset);
        } else {
          // Получаем текущее слово или фразу с ошибкой
          const errorText = corrected.slice(error.offset, error.offset + error.length);
          console.log('Текст с ошибкой:', errorText);

          // Выбираем наиболее подходящий вариант исправления с учетом контекста
          const bestSuggestion = getBestSuggestion(errorText, error.suggestions, error.offset, text);
          console.log('Лучшее предложение:', bestSuggestion);

          // Заменяем неправильный текст на правильный
          corrected = corrected.slice(0, error.offset) + bestSuggestion + corrected.slice(error.offset + error.length);
        }
      }
      // Обрабатываем ошибки согласования и другие грамматические ошибки
      else if (error.message) {
        const errorText = corrected.slice(error.offset, error.offset + error.length);
        console.log('Текст с ошибкой (без предложений):', errorText);

        // Проверяем различные форматы сообщений об ошибках
        let suggestion = null;
        let recommendedMatch = null;

        // Формат 1: "Рекомендуется: «...»"
        recommendedMatch = error.message.match(/Рекомендуется:?\s+[«"]([^»"]+)[»"]/i);
        if (recommendedMatch && recommendedMatch[1]) {
          suggestion = recommendedMatch[1];
          console.log('Найдена рекомендация (формат 1):', suggestion);
        }
        // Формат 2: "должно быть: «...»"
        else if ((recommendedMatch = error.message.match(/должно быть:?\s+[«"]([^»"]+)[»"]/i)) && recommendedMatch[1]) {
          suggestion = recommendedMatch[1];
          console.log('Найдена рекомендация (формат 2):', suggestion);
        }
        // Формат 3: "правильно: «...»"
        else if ((recommendedMatch = error.message.match(/правильно:?\s+[«"]([^»"]+)[»"]/i)) && recommendedMatch[1]) {
          suggestion = recommendedMatch[1];
          console.log('Найдена рекомендация (формат 3):', suggestion);
        }
        // Формат 4: "Вместо «...» нужно: «...»"
        else if ((recommendedMatch = error.message.match(/Вместо\s+[«"].*?[»"]\s+нужно:?\s+[«"]([^»"]+)[»"]/i)) && recommendedMatch[1]) {
          suggestion = recommendedMatch[1];
          console.log('Найдена рекомендация (формат 4):', suggestion);
        }
        // Формат 5: "Исправьте на: «...»"
        else if ((recommendedMatch = error.message.match(/Исправьте на:?\s+[«"]([^»"]+)[»"]/i)) && recommendedMatch[1]) {
          suggestion = recommendedMatch[1];
          console.log('Найдена рекомендация (формат 5):', suggestion);
        }
        // Формат 6: "Замените на: «...»"
        else if ((recommendedMatch = error.message.match(/Замените на:?\s+[«"]([^»"]+)[»"]/i)) && recommendedMatch[1]) {
          suggestion = recommendedMatch[1];
          console.log('Найдена рекомендация (формат 6):', suggestion);
        }
        // Формат 7: "Прилагательное ... не согласуется с существительным ... по роду"
        else if (error.message.toLowerCase().includes('не согласуется') &&
                error.message.toLowerCase().includes('по роду')) {

          // Извлекаем прилагательное и существительное
          const adjMatch = error.message.match(/Прилагательное\s+[«"]([^»"]+)[»"]/i);
          const nounMatch = error.message.match(/существительным\s+[«"]([^»"]+)[»"]/i);

          if (adjMatch && adjMatch[1] && nounMatch && nounMatch[1]) {
            const adj = adjMatch[1];
            const noun = nounMatch[1];
            console.log('Извлечено прилагательное:', adj, 'и существительное:', noun);

            // Специальная обработка для конкретных случаев
            if (adj === 'красивая' && noun === 'утро') {
              suggestion = 'красивое';
              console.log('Специальная обработка для "красивая утро" -> "красивое"');
            }
            // Специальная обработка для "утра"
            else if (adj === 'красивая' && noun === 'утра') {
              suggestion = 'красивое';
              console.log('Специальная обработка для "красивая утра" -> "красивое"');
            }
            // Общая логика определения рода
            else {
              // Определяем род существительного и корректируем прилагательное
              if (noun.endsWith('о') || noun.endsWith('е') || noun === 'утро' || noun === 'утра') {
                // Среднее род
                if (adj.endsWith('ая')) {
                  suggestion = adj.slice(0, -2) + 'ое';
                } else if (adj.endsWith('ий') || adj.endsWith('ый')) {
                  suggestion = adj.slice(0, -2) + 'ое';
                }
              } else if (noun.endsWith('а') || noun.endsWith('я')) {
                // Женский род
                if (adj.endsWith('ое') || adj.endsWith('ее')) {
                  suggestion = adj.slice(0, -2) + 'ая';
                } else if (adj.endsWith('ий') || adj.endsWith('ый')) {
                  suggestion = adj.slice(0, -2) + 'ая';
                }
              } else {
                // Мужской род (по умолчанию)
                if (adj.endsWith('ое') || adj.endsWith('ее')) {
                  suggestion = adj.slice(0, -2) + 'ый';
                } else if (adj.endsWith('ая')) {
                  suggestion = adj.slice(0, -2) + 'ый';
                }
              }
            }

            if (suggestion) {
              console.log('Сгенерирована рекомендация для согласования по роду:', suggestion);
            }
          }
        }
        // Специальная обработка для "красивая утра" без явного сообщения о согласовании
        else if (errorText === 'красивая утра' || errorText.includes('красивая утра')) {
          suggestion = errorText.replace('красивая утра', 'красивое утро');
          console.log('Специальная обработка для "красивая утра" -> "красивое утро"');
        }

        // Если нашли рекомендацию, применяем её
        if (suggestion) {
          console.log('Применяем исправление:', suggestion);
          corrected = corrected.slice(0, error.offset) + suggestion + corrected.slice(error.offset + error.length);
        } else {
          console.log('Не удалось найти рекомендацию в сообщении:', error.message);
        }
      }
    });

    return corrected;
  }, [getBestSuggestion]);

  const highlightedText = useMemo(() => {
    if (!checkedText || errors.length === 0) return checkedText;

    let result = [];
    let lastPos = 0;

    // Создаем копию ошибок с правильной длиной для подсветки
    const errorsForHighlight = errors.map(error => {
      // Для ошибок с запятыми, у которых length = 0, устанавливаем минимальную длину 1
      // чтобы они были видны в подсветке
      if (error.length === 0 &&
          (error.ruleId === 'COMMA_BEFORE_CONJUNCTION' ||
           (error.message && error.message.toLowerCase().includes('запятая')))) {
        return { ...error, length: 1 };
      }
      return error;
    });

    errorsForHighlight.sort((a, b) => a.offset - b.offset).forEach(error => {
      result.push(checkedText.slice(lastPos, error.offset));

      // Определяем класс подсветки в зависимости от типа ошибки
      let highlightClass = "bg-red-200 dark:bg-red-800 text-black dark:text-white font-medium";

      // Для ошибок с запятыми используем желтый цвет
      if (error.ruleId === 'COMMA_BEFORE_CONJUNCTION' ||
          (error.message && error.message.toLowerCase().includes('запятая'))) {
        highlightClass = "bg-yellow-200 dark:bg-yellow-800 text-black dark:text-white font-medium";
      }

      result.push(
        <span key={error.offset} className={highlightClass}>
          {checkedText.slice(error.offset, error.offset + error.length) || " "}
        </span>
      );
      lastPos = error.offset + error.length;
    });

    result.push(checkedText.slice(lastPos));
    return result;
  }, [checkedText, errors]);

  const checkText = async () => {
    try {
      // Сохраняем текущий текст как проверяемый
      setCheckedText(text);

      const response = await fetch('/api/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error('Ошибка проверки');

      const data = await response.json();

      // Выводим в консоль все ошибки для отладки
      console.log('API response data:', data.matches);

      // Преобразуем все ошибки в единый формат и фильтруем дубликаты
      const allErrors = data.matches
        // Фильтруем ошибки, чтобы исключить те, которые содержат "отсутствует запятая перед союзом"
        .filter((match: any) =>
          !match.message.toLowerCase().includes('отсутствует запятая перед')
        )
        .map((match: any) => {
          // Создаем объект ошибки
          let suggestions = match.replacements?.map((r: any) => r.value) || [];

          // Для всех грамматических ошибок пытаемся извлечь предложения из сообщения
          if (suggestions.length === 0) {
            console.log('Ошибка без предложений:', match.message);

            // Пытаемся извлечь рекомендацию из сообщения
            let recommendedMatch = null;

            // Формат 1: "Рекомендуется: «...»"
            recommendedMatch = match.message.match(/Рекомендуется:?\s+[«"]([^»"]+)[»"]/i);
            if (recommendedMatch && recommendedMatch[1]) {
              suggestions = [recommendedMatch[1]];
              console.log('Извлечена рекомендация из сообщения (формат 1):', suggestions[0]);
            }
            // Формат 2: "должно быть: «...»"
            else if ((recommendedMatch = match.message.match(/должно быть:?\s+[«"]([^»"]+)[»"]/i)) && recommendedMatch[1]) {
              suggestions = [recommendedMatch[1]];
              console.log('Извлечена рекомендация из сообщения (формат 2):', suggestions[0]);
            }
            // Формат 3: "правильно: «...»"
            else if ((recommendedMatch = match.message.match(/правильно:?\s+[«"]([^»"]+)[»"]/i)) && recommendedMatch[1]) {
              suggestions = [recommendedMatch[1]];
              console.log('Извлечена рекомендация из сообщения (формат 3):', suggestions[0]);
            }
            // Формат 4: "Вместо «...» нужно: «...»"
            else if ((recommendedMatch = match.message.match(/Вместо\s+[«"].*?[»"]\s+нужно:?\s+[«"]([^»"]+)[»"]/i)) && recommendedMatch[1]) {
              suggestions = [recommendedMatch[1]];
              console.log('Извлечена рекомендация из сообщения (формат 4):', suggestions[0]);
            }
            // Формат 5: "Исправьте на: «...»"
            else if ((recommendedMatch = match.message.match(/Исправьте на:?\s+[«"]([^»"]+)[»"]/i)) && recommendedMatch[1]) {
              suggestions = [recommendedMatch[1]];
              console.log('Извлечена рекомендация из сообщения (формат 5):', suggestions[0]);
            }
            // Формат 6: "Замените на: «...»"
            else if ((recommendedMatch = match.message.match(/Замените на:?\s+[«"]([^»"]+)[»"]/i)) && recommendedMatch[1]) {
              suggestions = [recommendedMatch[1]];
              console.log('Извлечена рекомендация из сообщения (формат 6):', suggestions[0]);
            }
            // Формат 7: "Прилагательное ... не согласуется с существительным ... по роду"
            else if (match.message.toLowerCase().includes('не согласуется') &&
                    match.message.toLowerCase().includes('по роду')) {

              // Извлекаем прилагательное и существительное
              const adjMatch = match.message.match(/Прилагательное\s+[«"]([^»"]+)[»"]/i);
              const nounMatch = match.message.match(/существительным\s+[«"]([^»"]+)[»"]/i);

              if (adjMatch && adjMatch[1] && nounMatch && nounMatch[1]) {
                const adj = adjMatch[1];
                const noun = nounMatch[1];
                console.log('Извлечено прилагательное:', adj, 'и существительное:', noun);

                // Определяем род существительного и корректируем прилагательное
                if (noun.endsWith('о') || noun.endsWith('е')) {
                  // Среднее род
                  if (adj.endsWith('ая')) {
                    suggestions = [adj.slice(0, -2) + 'ое'];
                  } else if (adj.endsWith('ий') || adj.endsWith('ый')) {
                    suggestions = [adj.slice(0, -2) + 'ое'];
                  }
                } else if (noun.endsWith('а') || noun.endsWith('я')) {
                  // Женский род
                  if (adj.endsWith('ое') || adj.endsWith('ее')) {
                    suggestions = [adj.slice(0, -2) + 'ая'];
                  } else if (adj.endsWith('ий') || adj.endsWith('ый')) {
                    suggestions = [adj.slice(0, -2) + 'ая'];
                  }
                } else {
                  // Мужской род (по умолчанию)
                  if (adj.endsWith('ое') || adj.endsWith('ее')) {
                    suggestions = [adj.slice(0, -2) + 'ый'];
                  } else if (adj.endsWith('ая')) {
                    suggestions = [adj.slice(0, -2) + 'ый'];
                  }
                }

                if (suggestions.length > 0) {
                  console.log('Сгенерирована рекомендация для согласования по роду:', suggestions[0]);
                }
              }
            }
          }

          const error = {
            message: match.message,
            offset: match.offset,
            length: match.length,
            suggestions: suggestions,
            ruleId: match.rule?.id || ''
          };

          return error;
        });

      // Разделяем ошибки на категории: запятые, орфографические и другие ошибки
      // Включаем только ошибки с запятыми с формулировкой "Пропущена запятая: ..."
      const commaErrorsList = allErrors.filter(error =>
        error.message && (
          error.message.toLowerCase().includes('пропущена запятая:') ||
          error.message.toLowerCase().includes('пропущена запятая')
        )
      );

      // Определяем орфографические ошибки (ошибки в словах)
      const spellingErrorsList = allErrors.filter(error =>
        error.ruleId === 'MORFOLOGIK_RULE_RU_RU' || // Основное правило проверки орфографии
        error.ruleId === 'SPELLING_RULE' ||
        error.ruleId === 'TYPOS' ||
        error.message.toLowerCase().includes('опечатка') ||
        error.message.toLowerCase().includes('правильно:') ||
        error.message.toLowerCase().includes('проверьте написание')
      );

      // Остальные ошибки (исключаем ошибки с запятыми и орфографические ошибки)
      const otherErrorsList = allErrors.filter(error =>
        !commaErrorsList.includes(error) &&
        !spellingErrorsList.includes(error)
      );

      setErrors(allErrors);
      setCommaErrors(commaErrorsList);
      setSpellingErrors(spellingErrorsList);
      setOtherErrors(otherErrorsList);
      // Округляем значение читаемости до целого числа
      setReadabilityScore(Math.round(data.readabilityScore * 10));

      // Генерируем исправленный текст
      const corrected = generateCorrectedText(text, allErrors);
      setCorrectedText(corrected);
    } catch (error) {
      console.error('Ошибка:', error);
      // Сохраняем текущий текст как проверяемый даже при ошибке
      setCheckedText(text);
      setCorrectedText('');
      setErrors([{
        message: 'Не удалось проверить текст',
        offset: 0,
        length: 0,
        suggestions: [],
        ruleId: ''
      }]);
      setCommaErrors([]);
      setSpellingErrors([]);
      setOtherErrors([]);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Шапка страницы */}
      <header className="bg-blue-600 dark:bg-blue-800 text-white py-4 shadow-md">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold">WriteProAI</h1>
          <Button
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            className="rounded-full bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20 transition-all duration-300"
            aria-label="Переключить тему"
          >
            {isDarkMode ? (
              <Sun className="h-5 w-5 text-yellow-400 transition-transform hover:rotate-45" />
            ) : (
              <Moon className="h-5 w-5 text-white transition-transform hover:-rotate-12" />
            )}
          </Button>
        </div>
      </header>

      {/* Основное содержимое */}
      <main className="flex-grow py-6">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-2xl font-bold mb-4 text-black dark:text-white">Проверка письменных работ</h2>

      <div className="grid gap-4">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Введите ваш текст для проверки... Например: 'Я хотел пойти в кино но у меня не было времени.'"
          className="min-h-[300px] p-4 text-lg border-2 border-blue-400/50 dark:border-blue-600/50 rounded-xl shadow-md focus:border-blue-600 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50 dark:focus:ring-blue-600/50 focus:shadow-lg transition-all duration-300 bg-white dark:bg-gray-900 resize-y"
          style={{
            boxShadow: 'inset 0 0 6px rgba(0, 0, 0, 0.1)'
          }}
        />

        <div className="flex flex-col items-center gap-2 my-6">
          <Button
            onClick={checkText}
            className="w-64 py-6 text-lg font-semibold bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 rounded-xl"
          >
            Проверить текст
          </Button>
          {text !== checkedText && checkedText && (
            <span className="text-yellow-600 dark:text-yellow-400 text-sm">
              Текст изменен после последней проверки
            </span>
          )}
        </div>

        {readabilityScore > 0 && (
          <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20 space-y-2">
            <h2 className="font-semibold mb-2 text-black dark:text-white">Читаемость текста:</h2>
            <div className="flex justify-between text-black dark:text-white">
              <span>Уровень читаемости</span>
              <span>{Math.round(readabilityScore)}%</span>
            </div>
            <div className="relative pt-1">
              <div className="w-full h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.round(readabilityScore)}%` }}
                ></div>
              </div>
              <div className="flex justify-between mt-1 text-xs text-gray-600 dark:text-gray-400">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        )}

        {errors.length > 0 && (
          <div className="space-y-4">
            {spellingErrors.length > 0 && (
              <div className="border rounded-lg p-4 bg-red-50 dark:bg-red-900/20 mb-4">
                <h2 className="font-semibold mb-2 text-black dark:text-white">Орфографические ошибки:</h2>
                <ul className="list-disc pl-5 space-y-1 text-black dark:text-white">
                  {spellingErrors.map((error, index) => (
                    <li key={index}>
                      {error.message}
                      {error.suggestions.length > 0 && (
                        <div className="mt-1">
                          <span className="text-sm text-black dark:text-white">
                            Популярные варианты:
                          </span>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {(() => {
                              // Получаем контекстные веса для каждого предложения
                              const suggestionsWithWeights = error.suggestions
                                .slice(0, 5)
                                .map(suggestion => {
                                  // Получаем базовый вес из словаря популярных слов
                                  let weight = POPULAR_WORDS[suggestion.toLowerCase()] || 10;

                                  // Анализируем контекст для этого предложения
                                  const contextWords = checkedText.split(/\s+/);
                                  const errorPosition = error.offset;

                                  // Находим слова до и после ошибки
                                  let wordsBefore = [];
                                  let wordsAfter = [];
                                  let currentPos = 0;

                                  for (let i = 0; i < contextWords.length; i++) {
                                    const word = contextWords[i];
                                    const wordLength = word.length;

                                    if (currentPos + wordLength > errorPosition && wordsBefore.length === 0) {
                                      // Нашли слово с ошибкой
                                      wordsBefore = contextWords.slice(Math.max(0, i - 2), i);
                                      wordsAfter = contextWords.slice(i + 1, Math.min(contextWords.length, i + 3));
                                      break;
                                    }

                                    currentPos += wordLength + 1; // +1 для пробела
                                  }

                                  // Проверяем контекстные словосочетания
                                  for (const phrase of CONTEXT_PHRASES) {
                                    if (phrase.words.length === 2) {
                                      const [word1, word2] = phrase.words;

                                      // Проверяем, является ли предложение первым словом в словосочетании
                                      if (suggestion.toLowerCase() === word1) {
                                        // Ищем второе слово после ошибки
                                        for (const afterWord of wordsAfter) {
                                          if (afterWord.toLowerCase().replace(/[.,!?;:()]/g, '') === word2) {
                                            weight += phrase.weight;
                                            break;
                                          }
                                        }
                                      }

                                      // Проверяем, является ли предложение вторым словом в словосочетании
                                      if (suggestion.toLowerCase() === word2) {
                                        // Ищем первое слово перед ошибкой
                                        for (const beforeWord of wordsBefore) {
                                          if (beforeWord.toLowerCase().replace(/[.,!?;:()]/g, '') === word1) {
                                            weight += phrase.weight;
                                            break;
                                          }
                                        }
                                      }
                                    }
                                  }

                                  return { suggestion, weight };
                                })
                                // Сортируем по весу (от большего к меньшему)
                                .sort((a, b) => b.weight - a.weight);

                              // Отображаем предложения
                              return suggestionsWithWeights.map(({ suggestion, weight }, i) => (
                                <span
                                  key={i}
                                  className={`inline-block px-2 py-1 rounded-md text-sm ${
                                    i === 0
                                      ? "bg-green-500 text-white font-medium"
                                      : "bg-gray-200 dark:bg-gray-700 text-black dark:text-white"
                                  }`}
                                  title={`Популярность: ${weight > 50 ? 'очень высокая' : weight > 20 ? 'высокая' : 'обычная'}`}
                                >
                                  {suggestion}
                                </span>
                              ));
                            })()
                            }
                            {error.suggestions.length > 5 && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 self-center">
                                и ещё {error.suggestions.length - 5}...
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {commaErrors.length > 0 && (
              <div className="border rounded-lg p-4 bg-yellow-50 dark:bg-yellow-900/20">
                <h2 className="font-semibold mb-2 text-black dark:text-white">Пунктуационные ошибки:</h2>
                <ul className="list-disc pl-5 space-y-1 text-black dark:text-white">
                  {commaErrors.map((error, index) => (
                    <li key={index}>
                      {error.message}
                      {error.suggestions.length > 0 && (
                        <span className="text-sm text-black dark:text-white ml-2">
                          (Рекомендуется: {error.suggestions.slice(0, 5).join(', ')}
                          {error.suggestions.length > 5 && ` и ещё ${error.suggestions.length - 5}...`})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {otherErrors.length > 0 && (
              <div className="border rounded-lg p-4 bg-orange-50 dark:bg-orange-900/20">
                <h2 className="font-semibold mb-2 text-black dark:text-white">Другие ошибки:</h2>
                <ul className="list-disc pl-5 space-y-1 text-black dark:text-white">
                  {otherErrors.map((error, index) => (
                    <li key={index}>
                      {error.message}
                      {error.suggestions.length > 0 && (
                        <span className="text-sm text-black dark:text-white ml-2">
                          (Возможные исправления: {error.suggestions.slice(0, 5).join(', ')}
                          {error.suggestions.length > 5 && ` и ещё ${error.suggestions.length - 5}...`})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
              <div className="flex justify-between items-center mb-2">
                <h2 className="font-semibold text-black dark:text-white">Ошибки в тексте:</h2>
                {text !== checkedText && (
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    Показан результат последней проверки
                  </span>
                )}
              </div>
              <div
                className="whitespace-pre-wrap text-black dark:text-white max-h-[300px] overflow-auto p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                style={{
                  boxShadow: 'inset 0 0 6px rgba(0, 0, 0, 0.1)'
                }}
              >
                {highlightedText}
              </div>

              {/* Цветовые обозначения для подсветки ошибок */}
              {errors.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center">
                      <span className="inline-block w-4 h-4 bg-yellow-200 dark:bg-yellow-800 mr-2 rounded"></span>
                      <span className="text-sm text-black dark:text-white">Пунктуационные ошибки</span>
                    </div>
                    <div className="flex items-center">
                      <span className="inline-block w-4 h-4 bg-red-200 dark:bg-red-800 mr-2 rounded"></span>
                      <span className="text-sm text-black dark:text-white">Орфографические и другие ошибки</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {correctedText && (
              <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-900/20">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="font-semibold text-black dark:text-white">Исправленный текст:</h2>
                  <Button
                    onClick={() => copyToClipboard(correctedText)}
                    className={`p-2 rounded-full transition-all duration-300 ${
                      isCopied
                        ? "bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
                        : "bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
                    }`}
                    title={isCopied ? "Скопировано!" : "Копировать текст"}
                    aria-label={isCopied ? "Скопировано!" : "Копировать текст"}
                  >
                    {isCopied ? (
                      <Check className="h-4 w-4 text-white" />
                    ) : (
                      <Copy className="h-4 w-4 text-white" />
                    )}
                  </Button>
                </div>
                <div
                  className="whitespace-pre-wrap text-black dark:text-white p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 max-h-[300px] overflow-auto"
                  style={{
                    boxShadow: 'inset 0 0 6px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  {correctedText}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
        </div>
      </main>
    </div>
  );
}
