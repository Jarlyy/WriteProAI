"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Textarea } from "../components/ui/textarea";
import { Button } from "../components/ui/button";
import { Moon, Sun, Copy, Check, LogOut, X, Trash2, FileText, Clock, Home, User } from "lucide-react";
import { SaveText } from "../components/firestore/save-text";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase-client";
import { ConfirmDialog } from "../components/ui/confirm-dialog";
import { autoSaveCheckHistory } from "../lib/auto-save-history";
import { useAuth } from "../contexts/auth-context";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";

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

export default function HomePage() {
  const [text, setText] = useState("");
  const [checkedText, setCheckedText] = useState("");
  const [correctedText, setCorrectedText] = useState("");
  const [errors, setErrors] = useState([]);
  const [commaErrors, setCommaErrors] = useState([]);
  const [spellingErrors, setSpellingErrors] = useState([]);
  const [semanticErrors, setSemanticErrors] = useState([]);
  const [otherErrors, setOtherErrors] = useState([]);
  const [readabilityScore, setReadabilityScore] = useState(0);
  const [readabilityMetrics, setReadabilityMetrics] = useState({
    fleschKincaid: 0,
    colemanLiau: 0,
    avgSentenceLength: 0,
    avgWordLength: 0,
    complexWordsPercentage: 0,
    lexicalDiversity: 0
  });
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isSignOutDialogOpen, setIsSignOutDialogOpen] = useState(false);

  // Используем контекст авторизации с мемоизацией для предотвращения ненужных ререндеров
  const { user, loading: authLoading } = useAuth();

  // Мемоизируем пользователя, чтобы избежать ненужных ререндеров
  const memoizedUser = useMemo(() => user, [user?.uid]);

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

  // Состояние аутентификации отслеживается через контекст AuthProvider

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

  // Функция для очистки текста с подтверждением
  const clearText = () => {
    if (text.trim() === "") return; // Не показываем подтверждение, если текст пустой

    // Используем простое подтверждение через window.confirm для избежания проблем с провайдером
    if (window.confirm("Вы уверены, что хотите очистить текст? Все несохраненные данные будут потеряны.")) {
      setText("");
      setCheckedText("");
      setCorrectedText("");
      setErrors([]);
      setCommaErrors([]);
      setSpellingErrors([]);
      setSemanticErrors([]);
      setOtherErrors([]);
      setReadabilityScore(0);
      setReadabilityMetrics({
        fleschKincaid: 0,
        colemanLiau: 0,
        avgSentenceLength: 0,
        avgWordLength: 0,
        complexWordsPercentage: 0,
        lexicalDiversity: 0
      });
    }
  };

  // Функция для быстрой очистки текста без подтверждения
  const quickClearText = () => {
    setText("");
    setCheckedText("");
    setCorrectedText("");
    setErrors([]);
    setCommaErrors([]);
    setSpellingErrors([]);
    setSemanticErrors([]);
    setOtherErrors([]);
    setReadabilityScore(0);
    setReadabilityMetrics({
      fleschKincaid: 0,
      colemanLiau: 0,
      avgSentenceLength: 0,
      avgWordLength: 0,
      complexWordsPercentage: 0,
      lexicalDiversity: 0
    });
  };

  // Функция для открытия диалога подтверждения выхода
  const handleSignOutClick = () => {
    setIsSignOutDialogOpen(true);
  };

  // Функция для подтверждения выхода из аккаунта
  const confirmSignOut = async () => {
    try {
      if (auth) {
        await signOut(auth);
        console.log("Пользователь вышел из системы");
      }
    } catch (error) {
      console.error("Ошибка при выходе из аккаунта:", error);
    } finally {
      setIsSignOutDialogOpen(false);
    }
  };

  // Функция для отмены выхода из аккаунта
  const cancelSignOut = () => {
    setIsSignOutDialogOpen(false);
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
             error.ruleId === 'COMMA_BEFORE_PARTICIPLE' ||
             (error.message && (
               error.message.toLowerCase().includes('запятая') ||
               error.message.toLowerCase().includes('деепричастн')
             ))
            )) {
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
           error.ruleId === 'COMMA_BEFORE_PARTICIPLE' ||
           (error.message && (
             error.message.toLowerCase().includes('запятая') ||
             error.message.toLowerCase().includes('деепричастн') ||
             error.message.toLowerCase().includes('причастн') ||
             error.message.toLowerCase().includes('однородн')
           ))
          )) {
        // Для пунктуационных ошибок используем длину, которая уже установлена в API
        // Не используем контекст, так как это может привести к дублированию текста
        return { ...error, length: error.length > 0 ? error.length : 1 };
      }
      return error;
    });

    // Удаляем дубликаты ошибок с одинаковым смещением (offset)
    // Это поможет избежать раздвоения деепричастных оборотов
    const uniqueErrors = [];
    const offsetsSet = new Set();

    errorsForHighlight.forEach(error => {
      // Если ошибка с таким смещением уже есть, пропускаем
      if (!offsetsSet.has(error.offset)) {
        offsetsSet.add(error.offset);
        uniqueErrors.push(error);
      } else {
        console.log('Пропускаем дублирующую ошибку:', {
          message: error.message,
          offset: error.offset,
          length: error.length
        });
      }
    });

    uniqueErrors.sort((a, b) => a.offset - b.offset).forEach(error => {
      result.push(checkedText.slice(lastPos, error.offset));

      // Определяем класс подсветки в зависимости от типа ошибки
      let highlightClass = "bg-red-200 dark:bg-red-800 text-black dark:text-white font-medium";

      // Проверяем, к какой категории относится ошибка
      const errorMessage = error.message.toLowerCase();
      const errorOffset = error.offset;

      // Ищем ошибку в соответствующих массивах по смещению (offset)
      // Для пунктуационных ошибок используем желтый цвет
      const isPunctuation = commaErrors.some(e => e.offset === errorOffset && e.message === error.message);
      if (isPunctuation) {
        // Проверяем, является ли это ошибкой с запятой
        const isCommaError = error.message.toLowerCase().includes('запятая');

        if (isCommaError) {
          // Для ошибок с запятыми используем специальный стиль с увеличенным шрифтом
          highlightClass = "bg-yellow-200 dark:bg-yellow-800 text-black dark:text-white font-medium text-lg";
        } else {
          highlightClass = "bg-yellow-200 dark:bg-yellow-800 text-black dark:text-white font-medium";
        }
      }
      // Для орфографических ошибок используем красный цвет (уже установлен по умолчанию)
      else if (spellingErrors.some(e => e.offset === errorOffset && e.message === error.message)) {
        highlightClass = "bg-red-200 dark:bg-red-800 text-black dark:text-white font-medium";
      }
      // Для смысловых ошибок используем фиолетовый цвет
      else if (semanticErrors.some(e => e.offset === errorOffset && e.message === error.message)) {
        highlightClass = "bg-purple-200 dark:bg-purple-800 text-black dark:text-white font-medium";
      }
      // Для других ошибок используем оранжевый цвет
      else if (otherErrors.some(e => e.offset === errorOffset && e.message === error.message)) {
        highlightClass = "bg-orange-200 dark:bg-orange-800 text-black dark:text-white font-medium";
      }

      // Добавляем отладочную информацию
      if (errorMessage.includes('запятая') && !isPunctuation) {
        console.log('Ошибка с запятой не распознана как пунктуационная:', { message: error.message, offset: error.offset });
      }

      // Добавляем отладочный вывод для проверки текста, который будет подсвечен
      // Убедимся, что мы не выходим за границы текста
      const safeOffset = Math.min(error.offset, checkedText.length);
      const safeLength = Math.min(error.length, checkedText.length - safeOffset);

      // Проверяем, является ли это ошибкой с запятой
      const isCommaError = isPunctuation && error.message.toLowerCase().includes('запятая');

      // Для ошибок с запятыми используем специальную логику подсветки
      // Подсвечиваем только две буквы между которыми должна быть запятая
      const textToHighlight = checkedText.slice(safeOffset, safeOffset + safeLength) || " ";

      console.log('Подсветка текста:', {
        text: textToHighlight,
        offset: safeOffset,
        length: safeLength,
        message: error.message,
        isPunctuation,
        isCommaError
      });

      // Добавляем подсветку
      result.push(
        <span key={error.offset} className={highlightClass}>
          {textToHighlight}
        </span>
      );
      lastPos = safeOffset + safeLength;
    });

    result.push(checkedText.slice(lastPos));
    return result;
  }, [checkedText, errors]);

  const checkText = async () => {
    // Проверяем, авторизован ли пользователь
    console.log("Проверка авторизации перед проверкой текста...");
    console.log("Статус авторизации:", auth.currentUser ? "Авторизован" : "Не авторизован");

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

      // Разделяем ошибки на категории: пунктуационные, орфографические, смысловые и другие

      // 1. Пунктуационные ошибки (запятые, точки, тире и т.д.)
      const commaErrorsList = allErrors.filter(error => {
        // Проверяем сообщение об ошибке и ID правила
        const message = error.message.toLowerCase();

        // Наши собственные правила для запятых
        if (error.ruleId === 'COMMA_BEFORE_CONJUNCTION' ||
            error.ruleId === 'COMMA_BEFORE_PARTICIPLE') {
          return true;
        }

        // Правила LanguageTool для пунктуации
        if (error.ruleId === 'PUNCTUATION' ||
            error.ruleId === 'COMMA_PARENTHESIS_WHITESPACE' ||
            error.ruleId === 'WHITESPACE_RULE' ||
            error.ruleId?.includes('PUNCT')) {
          return true;
        }

        // Проверка по ключевым словам в сообщении
        const punctuationKeywords = [
          'запятая', 'запятую', 'запятые', 'запятыми',
          'точка', 'точку', 'точки',
          'тире', 'двоеточие', 'кавычки',
          'пунктуация', 'пунктуационн',
          'деепричастн', 'причастн',
          'скобк', 'скобок'
        ];

        return punctuationKeywords.some(keyword => message.includes(keyword));
      });

      // 2. Орфографические ошибки (ошибки в написании слов)
      const spellingErrorsList = allErrors.filter(error => {
        const message = error.message.toLowerCase();

        // Проверяем ID правила
        if (error.ruleId === 'MORFOLOGIK_RULE_RU_RU' ||
            error.ruleId === 'SPELLING_RULE' ||
            error.ruleId === 'TYPOS' ||
            error.ruleId?.includes('SPELL')) {
          return true;
        }

        // Проверка по ключевым словам в сообщении
        const spellingKeywords = [
          'опечатка', 'правильно:', 'проверьте написание',
          'орфографическ', 'пишется', 'написание',
          'возможно найдена ошибка', 'возможно, найдена ошибка'
        ];

        return spellingKeywords.some(keyword => message.includes(keyword));
      });

      // 3. Смысловые ошибки (стиль, согласование, лексика)
      const semanticErrorsList = allErrors.filter(error => {
        const message = error.message.toLowerCase();

        // Проверяем ID правила
        if (error.ruleId === 'AGREEMENT_RULE' ||
            error.ruleId === 'STYLE_RULE' ||
            error.ruleId?.includes('STYLE') ||
            error.ruleId?.includes('SEMANTICS') ||
            error.ruleId?.includes('LOGIC')) {
          return true;
        }

        // Проверка по ключевым словам в сообщении
        const semanticKeywords = [
          'согласу', 'согласов', 'не согласуется',
          'стил', 'стиль', 'стилистическ',
          'повтор', 'тавтолог',
          'плеоназм', 'избыточн',
          'лексическ', 'смысл',
          'падеж', 'склонен', 'спряжен',
          'род', 'число', 'времен'
        ];

        return semanticKeywords.some(keyword => message.includes(keyword)) &&
               !commaErrorsList.includes(error) &&
               !spellingErrorsList.includes(error);
      });

      // 4. Другие ошибки (все остальные)
      const otherErrorsList = allErrors.filter(error =>
        !commaErrorsList.includes(error) &&
        !spellingErrorsList.includes(error) &&
        !semanticErrorsList.includes(error)
      );

      // Выводим количество ошибок каждого типа для отладки
      console.log('Всего ошибок:', allErrors.length);
      console.log('Пунктуационных ошибок:', commaErrorsList.length);
      console.log('Орфографических ошибок:', spellingErrorsList.length);
      console.log('Смысловых ошибок:', semanticErrorsList.length);
      console.log('Других ошибок:', otherErrorsList.length);

      // Выводим первые несколько ошибок каждого типа для отладки
      if (commaErrorsList.length > 0) {
        console.log('Примеры пунктуационных ошибок:', commaErrorsList.slice(0, 3).map(e => ({ message: e.message, ruleId: e.ruleId })));
      }
      if (spellingErrorsList.length > 0) {
        console.log('Примеры орфографических ошибок:', spellingErrorsList.slice(0, 3).map(e => ({ message: e.message, ruleId: e.ruleId })));
      }

      setErrors(allErrors);
      setCommaErrors(commaErrorsList);
      setSpellingErrors(spellingErrorsList);
      setSemanticErrors(semanticErrorsList);
      setOtherErrors(otherErrorsList);
      // Округляем значение читаемости до целого числа
      setReadabilityScore(Math.round(data.readabilityScore * 100));

      // Сохраняем детальные метрики читаемости
      if (data.readabilityMetrics) {
        // Ограничиваем лексическое разнообразие до 100%
        const lexicalDiversity = Math.min(100, Math.round(data.readabilityMetrics.lexicalDiversity * 100));

        const updatedMetrics = {
          fleschKincaid: Math.round(data.readabilityMetrics.fleschKincaid),
          colemanLiau: Math.round(data.readabilityMetrics.colemanLiau),
          avgSentenceLength: Math.round(data.readabilityMetrics.avgSentenceLength * 10) / 10,
          avgWordLength: Math.round(data.readabilityMetrics.avgWordLength * 10) / 10,
          complexWordsPercentage: Math.round(data.readabilityMetrics.complexWordsPercentage),
          lexicalDiversity: lexicalDiversity
        };

        setReadabilityMetrics(updatedMetrics);
      }

      // Генерируем исправленный текст
      const corrected = generateCorrectedText(text, allErrors);
      setCorrectedText(corrected);

      // Автоматически сохраняем историю проверки
      console.log("Попытка автоматического сохранения истории проверки...");
      console.log("Статус авторизации перед сохранением (из контекста):", user ? "Авторизован" : "Не авторизован");
      console.log("Статус авторизации перед сохранением (из auth):", auth.currentUser ? "Авторизован" : "Не авторизован");

      // Используем пользователя из контекста
      if (user) {
        console.log("Вызов функции autoSaveCheckHistory (пользователь из контекста)...");
        try {
          // Создаем объект метрик читаемости из данных API
          const metricsToSave = data.readabilityMetrics ? {
            fleschKincaid: Math.round(data.readabilityMetrics.fleschKincaid),
            colemanLiau: Math.round(data.readabilityMetrics.colemanLiau),
            avgSentenceLength: Math.round(data.readabilityMetrics.avgSentenceLength * 10) / 10,
            avgWordLength: Math.round(data.readabilityMetrics.avgWordLength * 10) / 10,
            complexWordsPercentage: Math.round(data.readabilityMetrics.complexWordsPercentage),
            lexicalDiversity: Math.min(1, data.readabilityMetrics.lexicalDiversity) // Сохраняем в диапазоне [0, 1]
          } : undefined;

          await autoSaveCheckHistory(
            text,
            corrected,
            allErrors,
            Math.round(data.readabilityScore * 100),
            metricsToSave
          );
          console.log("Функция autoSaveCheckHistory выполнена успешно");
        } catch (saveError) {
          console.error("Ошибка при сохранении истории:", saveError);
        }
      } else {
        console.log("Пользователь не авторизован (из контекста), история не сохранена");
      }
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
      setSemanticErrors([]);
      setOtherErrors([]);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Диалог подтверждения выхода */}
      <ConfirmDialog
        isOpen={isSignOutDialogOpen}
        title="Выход из аккаунта"
        message="Вы уверены, что хотите выйти из аккаунта?"
        confirmText="Да, выйти"
        cancelText="Отмена"
        onConfirm={confirmSignOut}
        onCancel={cancelSignOut}
      />

      {/* Шапка страницы */}
      <header className="bg-blue-600 dark:bg-blue-800 text-white py-4 shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            {/* Логотип */}
            <h1 className="text-3xl font-bold">WriteProAI</h1>

            {/* Правая часть шапки с фиксированной структурой */}
            <div className="flex items-center">
              {/* Навигационные вкладки с фиксированной шириной */}
              <div className="flex items-center space-x-1 w-[280px] justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="text-white bg-white/20 hover:bg-white/30 transition-all duration-300 flex items-center rounded-lg px-3 py-2"
                >
                  <Link href="/">
                    <Home className="h-4 w-4 mr-2" />
                    Главная
                  </Link>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="text-white hover:bg-white/10 transition-all duration-300 flex items-center rounded-lg px-3 py-2"
                >
                  <Link href="/saved-texts">
                    <FileText className="h-4 w-4 mr-2" />
                    Избранное
                  </Link>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="text-white hover:bg-white/10 transition-all duration-300 flex items-center rounded-lg px-3 py-2"
                >
                  <Link href="/check-history">
                    <Clock className="h-4 w-4 mr-2" />
                    История
                  </Link>
                </Button>
              </div>

              {/* Блок авторизации и темы */}
              <div className="flex items-center ml-8">
                {memoizedUser ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="focus:outline-none">
                        {memoizedUser.photoURL ? (
                          <img
                            src={memoizedUser.photoURL}
                            alt="User avatar"
                            className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-gray-800 cursor-pointer hover:opacity-90 transition-opacity"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-400 dark:bg-blue-500 flex items-center justify-center text-white font-semibold text-sm uppercase cursor-pointer hover:opacity-90 transition-opacity">
                            {memoizedUser.email ? memoizedUser.email.substring(0, 2) : "??"}
                          </div>
                        )}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>Мой аккаунт</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {memoizedUser.email && (
                        <DropdownMenuLabel className="font-normal text-xs truncate">
                          {memoizedUser.email}
                        </DropdownMenuLabel>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleSignOutClick} className="text-red-500 dark:text-red-400 cursor-pointer">
                        <LogOut className="h-4 w-4 mr-2" />
                        Выйти
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="text-white hover:bg-white/10 transition-all duration-300 flex items-center rounded-lg px-3 py-2"
                  >
                    <Link href="/auth">
                      <User className="h-4 w-4 mr-2" />
                      Войти
                    </Link>
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleTheme}
                  className="text-white hover:bg-white/10 transition-all duration-300 flex items-center rounded-lg p-2 ml-2"
                  aria-label="Переключить тему"
                >
                  {isDarkMode ? (
                    <Sun className="h-5 w-5 text-yellow-400 transition-transform hover:rotate-45" />
                  ) : (
                    <Moon className="h-5 w-5 text-white transition-transform hover:-rotate-12" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Основное содержимое */}
      <main className="flex-grow py-6">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-2xl font-bold mb-2 text-black dark:text-white">Проверка письменных работ</h2>

          <div className="grid gap-3">
            <div className="relative">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Введите текст для проверки орфографии, пунктуации и читаемости... Например: 'Я хотел пойти в кино но у меня не было времени.'"
                className="min-h-[300px] p-4 text-lg border-2 border-blue-400/50 dark:border-blue-600/50 rounded-xl shadow-md focus:border-blue-600 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50 dark:focus:ring-blue-600/50 focus:shadow-lg transition-all duration-300 bg-white dark:bg-gray-900 resize-y"
                style={{
                  boxShadow: 'inset 0 0 6px rgba(0, 0, 0, 0.1)'
                }}
              />
              {text && (
                <button
                  type="button"
                  onClick={quickClearText}
                  className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none bg-white dark:bg-gray-800 rounded-full p-1"
                  title="Очистить текст"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex flex-col items-center gap-2 my-4">
              <Button
                onClick={checkText}
                className="w-64 py-5 text-lg font-semibold bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 rounded-xl"
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
              <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20 space-y-4">
                <h2 className="font-semibold mb-2 text-black dark:text-white">Читаемость текста:</h2>

                {/* Общая оценка читаемости */}
                <div className="space-y-2">
                  <div className="flex justify-between text-black dark:text-white">
                    <span>Общая оценка читаемости</span>
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

                {/* Детальные метрики */}
                <details className="mt-2">
                  <summary className="cursor-pointer font-semibold text-black dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    Детальные метрики читаемости
                  </summary>
                  <div className="mt-3 space-y-4">
                    {/* Индекс Флеша-Кинкейда */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-black dark:text-white">
                        <span className="text-sm">Индекс Флеша-Кинкейда</span>
                        <span className="text-sm">{readabilityMetrics.fleschKincaid}</span>
                      </div>
                      <div className="relative pt-1">
                        <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 dark:bg-green-600 rounded-full transition-all duration-500"
                            style={{ width: `${readabilityMetrics.fleschKincaid}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Чем выше значение, тем легче читается текст. Учитывает длину предложений и слогов.
                      </div>
                    </div>

                    {/* Индекс Колмана-Лиау */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-black dark:text-white">
                        <span className="text-sm">Индекс Колмана-Лиау</span>
                        <span className="text-sm">{readabilityMetrics.colemanLiau}</span>
                      </div>
                      <div className="relative pt-1">
                        <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 dark:bg-purple-600 rounded-full transition-all duration-500"
                            style={{ width: `${readabilityMetrics.colemanLiau}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Оценивает читаемость на основе количества символов, слов и предложений.
                      </div>
                    </div>

                    {/* Средняя длина предложения */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-black dark:text-white">
                        <span className="text-sm">Средняя длина предложения</span>
                        <span className="text-sm">{readabilityMetrics.avgSentenceLength} слов</span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Оптимальная длина: 15-20 слов. {
                          readabilityMetrics.avgSentenceLength > 25
                            ? 'Рекомендуется сократить длину предложений для улучшения читаемости.'
                            : readabilityMetrics.avgSentenceLength < 8
                              ? 'Предложения слишком короткие, текст может казаться отрывистым.'
                              : 'Хорошая длина предложений для легкого восприятия.'
                        }
                      </div>
                    </div>

                    {/* Средняя длина слова */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-black dark:text-white">
                        <span className="text-sm">Средняя длина слова</span>
                        <span className="text-sm">{readabilityMetrics.avgWordLength} символов</span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {
                          readabilityMetrics.avgWordLength > 7
                            ? 'В тексте много длинных слов. Попробуйте заменить их более короткими синонимами.'
                            : 'Хорошая средняя длина слов для легкого восприятия.'
                        }
                      </div>
                    </div>

                    {/* Процент сложных слов */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-black dark:text-white">
                        <span className="text-sm">Процент сложных слов</span>
                        <span className="text-sm">{readabilityMetrics.complexWordsPercentage}%</span>
                      </div>
                      <div className="relative pt-1">
                        <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-red-500 dark:bg-red-600 rounded-full transition-all duration-500"
                            style={{ width: `${readabilityMetrics.complexWordsPercentage}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Сложные слова - слова с 4 и более слогами. {
                          readabilityMetrics.complexWordsPercentage > 15
                            ? 'Рекомендуется уменьшить количество сложных слов.'
                            : 'Хороший баланс простых и сложных слов.'
                        }
                      </div>
                    </div>

                    {/* Лексическое разнообразие */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-black dark:text-white">
                        <span className="text-sm">Лексическое разнообразие</span>
                        <span className="text-sm">{Math.min(100, readabilityMetrics.lexicalDiversity)}%</span>
                      </div>
                      <div className="relative pt-1">
                        <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-yellow-500 dark:bg-yellow-600 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, readabilityMetrics.lexicalDiversity)}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Отношение уникальных слов к общему количеству. {
                          readabilityMetrics.lexicalDiversity < 40
                            ? 'Рекомендуется использовать более разнообразную лексику.'
                            : readabilityMetrics.lexicalDiversity > 80
                              ? 'Очень высокое лексическое разнообразие. Возможно, стоит использовать больше повторений ключевых терминов.'
                              : 'Хороший уровень лексического разнообразия.'
                        }
                      </div>
                    </div>
                  </div>
                </details>
              </div>
            )}

            {checkedText && (
              <div className="space-y-4">
                {errors.length === 0 ? (
                  <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-900/20 mb-4">
                    <h2 className="font-semibold mb-2 text-black dark:text-white text-center text-xl">Ошибок не найдено</h2>
                  </div>
                ) : (
                  <>
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
                    <ul className="list-disc pl-5 space-y-3 text-black dark:text-white">
                      {commaErrors.map((error, index) => (
                        <li key={index}>
                          <div className="mb-1">{error.message}</div>

                          {/* Контекст ошибки */}
                          {error.context && error.context.text && (
                            <div className="bg-white dark:bg-gray-800 p-2 rounded border border-yellow-200 dark:border-yellow-800 text-sm">
                              <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Контекст:</span>
                              <div className="font-mono">
                                {(() => {
                                  // Получаем контекст и позицию ошибки
                                  const contextText = error.context.text;
                                  const errorPosition = error.offset - error.context.offset;

                                  // Находим позицию для вставки запятой
                                  // Это будет после последней буквы первого слова
                                  const commaPosition = errorPosition + 1;

                                  // Разделяем текст на части: до запятой, запятая, после запятой
                                  const beforeComma = contextText.substring(0, commaPosition);
                                  const afterComma = contextText.substring(commaPosition);

                                  return (
                                    <>
                                      <span>{beforeComma}</span>
                                      <span className="text-red-500 dark:text-red-400 font-bold">,</span>
                                      <span>{afterComma}</span>
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          )}

                          {error.suggestions.length > 0 && (
                            <span className="text-sm text-black dark:text-white mt-1 block">
                              Рекомендуется: {error.suggestions.slice(0, 5).join(', ')}
                              {error.suggestions.length > 5 && ` и ещё ${error.suggestions.length - 5}...`}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {semanticErrors.length > 0 && (
                  <div className="border rounded-lg p-4 bg-purple-50 dark:bg-purple-900/20">
                    <h2 className="font-semibold mb-2 text-black dark:text-white">Смысловые и стилистические ошибки:</h2>
                    <ul className="list-disc pl-5 space-y-1 text-black dark:text-white">
                      {semanticErrors.map((error, index) => (
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
                          <span className="text-sm text-black dark:text-white">Орфографические ошибки</span>
                        </div>
                        <div className="flex items-center">
                          <span className="inline-block w-4 h-4 bg-purple-200 dark:bg-purple-800 mr-2 rounded"></span>
                          <span className="text-sm text-black dark:text-white">Смысловые ошибки</span>
                        </div>
                        <div className="flex items-center">
                          <span className="inline-block w-4 h-4 bg-orange-200 dark:bg-orange-800 mr-2 rounded"></span>
                          <span className="text-sm text-black dark:text-white">Другие ошибки</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {correctedText && (
                  <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-900/20">
                    <div className="flex justify-between items-center mb-2">
                      <h2 className="font-semibold text-black dark:text-white">Исправленный текст:</h2>
                      <div className="flex items-center space-x-2">
                        <SaveText
                          text={text}
                          correctedText={correctedText}
                          errors={errors}
                          readabilityScore={readabilityScore}
                          readabilityMetrics={readabilityMetrics}
                        />
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
                </>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
