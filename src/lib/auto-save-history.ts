import { collection, addDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase-client";

// Интерфейс для метрик читаемости
export interface ReadabilityMetrics {
  fleschKincaid: number;
  colemanLiau: number;
  avgSentenceLength: number;
  avgWordLength: number;
  complexWordsPercentage: number;
  lexicalDiversity: number;
}

// Интерфейс для истории проверок
export interface CheckHistoryItem {
  id?: string;
  userId: string;
  originalText: string;
  correctedText: string;
  errors: any[];
  readabilityScore: number;
  readabilityMetrics?: ReadabilityMetrics;
  timestamp: Date;
  title: string;
}

// Функция для генерации заголовка из текста
export const generateTitle = (text: string): string => {
  // Берем первые 30 символов текста или первое предложение
  const firstSentence = text.split(/[.!?]/, 1)[0].trim();
  if (firstSentence.length <= 30) {
    return firstSentence;
  } else {
    return firstSentence.substring(0, 30) + "...";
  }
};

// Функция для проверки сетевого соединения
export const checkNetworkConnection = async (): Promise<boolean> => {
  try {
    // Проверяем доступность интернета, используя надежный общедоступный URL
    const response = await fetch('https://www.google.com/generate_204', {
      method: 'HEAD',
      mode: 'no-cors', // Используем no-cors для обхода CORS-ограничений
      cache: 'no-cache'
    });

    console.log("Проверка сетевого соединения:", response.type);

    // В режиме no-cors мы не можем проверить статус ответа,
    // но если запрос выполнен без ошибок, значит соединение есть
    return true;
  } catch (error) {
    console.error("Ошибка при проверке сетевого соединения:", error);
    return false;
  }
};

// Функция для сохранения истории через API
export const saveHistoryViaAPI = async (
  historyItem: Omit<CheckHistoryItem, 'timestamp'>
): Promise<boolean> => {
  try {
    console.log("Попытка сохранения истории через API...");

    const response = await fetch('/api/save-history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(historyItem),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Ошибка при сохранении истории через API:", errorData);
      return false;
    }

    const data = await response.json();
    console.log("История успешно сохранена через API, ID документа:", data.id);
    return true;
  } catch (error) {
    console.error("Ошибка при сохранении истории через API:", error);
    return false;
  }
};

// Функция для автоматического сохранения истории проверок
export const autoSaveCheckHistory = async (
  originalText: string,
  correctedText: string,
  errors: any[],
  readabilityScore: number,
  readabilityMetrics?: ReadabilityMetrics
): Promise<boolean> => {
  // Проверяем, авторизован ли пользователь
  console.log("Попытка сохранения истории проверки...");
  console.log("Статус авторизации:", auth.currentUser ? "Авторизован" : "Не авторизован");

  if (!auth.currentUser) {
    console.log("Пользователь не авторизован, история не сохранена");
    return;
  }

  console.log("ID пользователя:", auth.currentUser.uid);

  // Проверяем, не пустой ли текст
  if (!originalText.trim()) {
    console.log("Пустой текст, история не сохранена");
    return;
  }

  try {
    // Преобразуем ошибки в формат, совместимый с Firestore
    const sanitizedErrors = errors.map(error => ({
      message: error.message || "",
      offset: error.offset || 0,
      length: error.length || 0,
      suggestions: Array.isArray(error.suggestions) ? error.suggestions.slice(0, 10) : [],
      ruleId: error.ruleId || ""
    }));

    console.log("Подготовка данных для сохранения в Firestore...");

    const historyItem: CheckHistoryItem = {
      userId: auth.currentUser.uid,
      originalText: originalText.substring(0, 10000), // Ограничиваем длину текста
      correctedText: correctedText.substring(0, 10000), // Ограничиваем длину текста
      errors: sanitizedErrors,
      readabilityScore,
      readabilityMetrics,
      timestamp: new Date(),
      title: generateTitle(originalText)
    };

    console.log("Попытка сохранения в Firestore...");
    console.log("Данные для сохранения:", {
      userId: historyItem.userId,
      title: historyItem.title,
      timestamp: historyItem.timestamp,
      textLength: historyItem.originalText.length,
      errorsCount: historyItem.errors.length
    });

    // Проверяем сетевое соединение перед сохранением
    const isNetworkAvailable = await checkNetworkConnection();
    console.log("Сетевое соединение доступно:", isNetworkAvailable);

    // Если сетевое соединение недоступно, сразу пробуем сохранить через API
    if (!isNetworkAvailable) {
      console.log("Сетевое соединение недоступно, пробуем сохранить через API...");
      return await saveHistoryViaAPI({
        userId: historyItem.userId,
        originalText: historyItem.originalText,
        correctedText: historyItem.correctedText,
        errors: historyItem.errors,
        readabilityScore: historyItem.readabilityScore,
        readabilityMetrics: historyItem.readabilityMetrics,
        title: historyItem.title
      });
    }

    console.log("Попытка создания документа в коллекции checkHistory...");
    console.log("Firestore инициализирован:", !!db);

    try {
      const checkHistoryCollection = collection(db, "checkHistory");
      console.log("Коллекция получена:", !!checkHistoryCollection);

      // Добавляем обработку сетевых ошибок
      try {
        const docRef = await addDoc(checkHistoryCollection, historyItem);
        console.log("История проверки автоматически сохранена, ID документа:", docRef.id);

        // Проверяем, что документ действительно создан
        console.log("Документ успешно создан в коллекции checkHistory");
        return true; // Возвращаем успешный результат
      } catch (networkError: any) {
        // Проверяем, является ли ошибка сетевой
        if (networkError.code === 'unavailable' ||
            networkError.message?.includes('network') ||
            networkError.message?.includes('connection') ||
            networkError.name === 'FirebaseError') {
          console.error("Сетевая ошибка при сохранении:", networkError);
          console.log("Попытка повторного сохранения через 2 секунды...");

          // Пробуем сохранить через API как запасной вариант
          console.log("Попытка сохранения через API как запасной вариант...");

          try {
            const apiSuccess = await saveHistoryViaAPI({
              userId: historyItem.userId,
              originalText: historyItem.originalText,
              correctedText: historyItem.correctedText,
              errors: historyItem.errors,
              readabilityScore: historyItem.readabilityScore,
              readabilityMetrics: historyItem.readabilityMetrics,
              title: historyItem.title
            });

            if (apiSuccess) {
              console.log("Сохранение через API успешно");
              return true;
            } else {
              console.log("Сохранение через API не удалось, пробуем еще раз через Firestore...");

              // Пробуем сохранить еще раз через 2 секунды
              setTimeout(async () => {
                try {
                  const retryDocRef = await addDoc(checkHistoryCollection, historyItem);
                  console.log("Повторное сохранение успешно, ID документа:", retryDocRef.id);
                } catch (retryError) {
                  console.error("Ошибка при повторном сохранении:", retryError);
                }
              }, 2000);
            }
          } catch (apiError) {
            console.error("Ошибка при сохранении через API:", apiError);

            // Пробуем сохранить еще раз через 2 секунды
            setTimeout(async () => {
              try {
                const retryDocRef = await addDoc(checkHistoryCollection, historyItem);
                console.log("Повторное сохранение успешно, ID документа:", retryDocRef.id);
              } catch (retryError) {
                console.error("Ошибка при повторном сохранении:", retryError);
              }
            }, 2000);
          }

          return false; // Возвращаем неуспешный результат
        } else {
          // Если ошибка не сетевая, пробрасываем ее дальше
          console.error("Ошибка при создании документа:", networkError);
          throw networkError;
        }
      }
    } catch (error) {
      console.error("Ошибка при создании документа:", error);
      throw error; // Пробрасываем ошибку дальше для обработки
    }
  } catch (error) {
    console.error("Ошибка при автоматическом сохранении истории:", error);
  }
};
