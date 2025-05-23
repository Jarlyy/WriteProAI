"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { collection, addDoc, query, where, orderBy, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db, auth } from "../../lib/firebase-client";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";
import { Trash2, Clock } from "lucide-react";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { useAuth } from "../../contexts/auth-context";

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

// Компонент для сохранения истории проверок
export function SaveCheckHistory({
  originalText,
  correctedText,
  errors,
  readabilityScore,
  readabilityMetrics
}: {
  originalText: string;
  correctedText: string;
  errors: any[];
  readabilityScore: number;
  readabilityMetrics?: ReadabilityMetrics;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [title, setTitle] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Функция для генерации заголовка из текста
  const generateTitle = (text: string) => {
    // Берем первые 30 символов текста или первое предложение
    const firstSentence = text.split(/[.!?]/, 1)[0].trim();
    if (firstSentence.length <= 30) {
      return firstSentence;
    } else {
      return firstSentence.substring(0, 30) + "...";
    }
  };

  // Открываем диалог для сохранения
  const handleSaveClick = () => {
    // Генерируем заголовок из текста
    setTitle(generateTitle(originalText));
    setIsDialogOpen(true);
  };

  // Сохраняем историю проверки
  const saveHistory = async () => {
    if (!auth.currentUser) {
      alert("Необходимо войти в аккаунт для сохранения истории проверок");
      return;
    }

    setIsSaving(true);

    try {
      const historyItem: CheckHistoryItem = {
        userId: auth.currentUser.uid,
        originalText,
        correctedText,
        errors,
        readabilityScore,
        readabilityMetrics,
        timestamp: new Date(),
        title: title || generateTitle(originalText)
      };

      await addDoc(collection(db, "checkHistory"), historyItem);
      setIsSaved(true);

      // Сбрасываем состояние через 2 секунды
      setTimeout(() => {
        setIsSaved(false);
      }, 2000);
    } catch (error) {
      console.error("Ошибка при сохранении истории проверки:", error);
      alert("Не удалось сохранить историю проверки");
    } finally {
      setIsSaving(false);
      setIsDialogOpen(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleSaveClick}
        className={`p-2 rounded-full transition-all duration-300 ${
          isSaved
            ? "bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
            : "bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
        }`}
        title={isSaved ? "Сохранено в историю!" : "Сохранить в историю"}
        aria-label={isSaved ? "Сохранено в историю!" : "Сохранить в историю"}
        disabled={isSaving}
      >
        <Clock className="h-4 w-4 text-white" />
      </Button>

      {/* Диалог для ввода заголовка */}
      <ConfirmDialog
        isOpen={isDialogOpen}
        title="Сохранить в историю"
        message={
          <div className="space-y-4">
            <p>Введите заголовок для этой проверки:</p>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Заголовок проверки"
              maxLength={50}
            />
          </div>
        }
        confirmText="Сохранить"
        cancelText="Отмена"
        onConfirm={saveHistory}
        onCancel={() => setIsDialogOpen(false)}
      />
    </>
  );
}

// Компонент для отображения истории проверок
export function CheckHistoryList() {
  const [history, setHistory] = useState<CheckHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClearHistoryDialogOpen, setIsClearHistoryDialogOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Мемоизируем пользователя, чтобы избежать ненужных ререндеров
  const memoizedUser = useMemo(() => user, [user?.uid]);

  // Загружаем историю проверок при монтировании компонента и при изменении пользователя
  useEffect(() => {
    // Если авторизация все еще загружается, ждем
    if (authLoading) {
      console.log("Авторизация загружается, ожидаем...");
      return;
    }

    const loadHistory = async () => {
      console.log("Попытка загрузки истории проверок...");
      console.log("Статус авторизации из контекста:", memoizedUser ? "Авторизован" : "Не авторизован");
      console.log("Статус авторизации из auth:", auth.currentUser ? "Авторизован" : "Не авторизован");

      // Используем пользователя из контекста
      if (!memoizedUser) {
        console.log("Пользователь не авторизован (из контекста), история не загружена");
        setLoading(false);
        return;
      }

      console.log("ID пользователя для загрузки истории (из контекста):", memoizedUser.uid);

      try {
        console.log("Создание запроса к Firestore...");
        const historyQuery = query(
          collection(db, "checkHistory"),
          where("userId", "==", memoizedUser.uid),
          orderBy("timestamp", "desc")
        );
        console.log("Запрос создан успешно");

        console.log("Выполнение запроса к коллекции checkHistory...");
        const querySnapshot = await getDocs(historyQuery);
        console.log("Получено документов:", querySnapshot.size);

        const historyItems: CheckHistoryItem[] = [];

        querySnapshot.forEach((doc) => {
          console.log("Обработка документа с ID:", doc.id);
          try {
            const data = doc.data();

            // Проверяем наличие необходимых полей
            if (!data.timestamp || !data.userId || !data.originalText) {
              console.error("Документ с ID", doc.id, "имеет неверный формат:", data);
              return;
            }

            // Преобразуем timestamp в Date
            const timestamp = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);

            // Создаем объект с безопасными данными
            const safeItem: CheckHistoryItem = {
              id: doc.id,
              userId: data.userId,
              originalText: data.originalText || "",
              correctedText: data.correctedText || "",
              errors: Array.isArray(data.errors) ? data.errors : [],
              readabilityScore: typeof data.readabilityScore === 'number' ? data.readabilityScore : 0,
              readabilityMetrics: data.readabilityMetrics || {
                fleschKincaid: 0,
                colemanLiau: 0,
                avgSentenceLength: 0,
                avgWordLength: 0,
                complexWordsPercentage: 0,
                lexicalDiversity: 0
              },
              timestamp: timestamp,
              title: data.title || "Без названия"
            };

            historyItems.push(safeItem);
          } catch (error) {
            console.error("Ошибка при обработке документа с ID", doc.id, ":", error);
          }
        });

        console.log("Загружено элементов истории:", historyItems.length);
        setHistory(historyItems);
      } catch (error) {
        console.error("Ошибка при загрузке истории проверок:", error);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [memoizedUser, authLoading]);

  // Функции для удаления отдельных записей удалены, оставлена только функция очистки всей истории

  // Функция для открытия диалога подтверждения очистки истории
  const handleClearHistoryClick = () => {
    setIsClearHistoryDialogOpen(true);
  };

  // Функция для очистки всей истории
  const clearAllHistory = async () => {
    if (!memoizedUser) return;

    try {
      setIsClearing(true);

      // Получаем все документы пользователя
      const historyQuery = query(
        collection(db, "checkHistory"),
        where("userId", "==", memoizedUser.uid)
      );

      const querySnapshot = await getDocs(historyQuery);

      // Создаем массив промисов для удаления всех документов
      const deletePromises = querySnapshot.docs.map(doc =>
        deleteDoc(doc.ref)
      );

      // Ждем завершения всех операций удаления
      await Promise.all(deletePromises);

      // Очищаем историю в состоянии
      setHistory([]);
      console.log("История проверок успешно очищена");
    } catch (error) {
      console.error("Ошибка при очистке истории проверок:", error);
      alert("Не удалось очистить историю проверок");
    } finally {
      setIsClearing(false);
      setIsClearHistoryDialogOpen(false);
    }
  };

  // Функция для просмотра деталей проверки
  const viewHistoryItem = (id: string) => {
    router.push(`/check-history/${id}`);
  };

  if (authLoading) {
    return <div className="text-center py-8">Проверка авторизации...</div>;
  }

  if (loading) {
    return <div className="text-center py-8">Загрузка истории проверок...</div>;
  }

  if (!memoizedUser) {
    return (
      <div className="text-center py-8">
        <p className="mb-4">Войдите в аккаунт, чтобы просмотреть историю проверок</p>
        <Button asChild>
          <Link href="/auth">Войти</Link>
        </Button>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8">
        <p>У вас пока нет сохраненных проверок</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          История проверок сохраняется автоматически при каждой проверке текста
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto w-full">
      <div className="flex justify-end mb-4">
        <Button
          variant="destructive"
          size="sm"
          onClick={handleClearHistoryClick}
          disabled={isClearing}
          className="flex items-center gap-2"
        >
          {isClearing ? (
            <>
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Очистка...
            </>
          ) : (
            <>
              <Trash2 className="h-4 w-4" />
              Очистить историю
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-4">
        {history.map((item) => (
          <div
            key={item.id}
            onClick={() => viewHistoryItem(item.id!)}
            className="border rounded-lg p-3 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-all cursor-pointer"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-base hover:text-blue-600 dark:hover:text-blue-400 transition-colors">{item.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {item.timestamp.toLocaleDateString()} {item.timestamp.toLocaleTimeString()}
                </p>
                <div className="mt-2 flex items-center">
                  <span className="text-sm mr-4">
                    Читаемость: {item.readabilityScore}%
                  </span>
                  <span className="text-sm">
                    Ошибок: {item.errors.length}
                  </span>
                </div>
              </div>
              {/* Кнопка с иконкой внешней ссылки удалена */}
            </div>
            <div className="mt-2">
              <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                {item.originalText}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Диалог подтверждения очистки истории */}
      <ConfirmDialog
        isOpen={isClearHistoryDialogOpen}
        title="Очистка истории проверок"
        message="Вы уверены, что хотите очистить всю историю проверок? Это действие нельзя будет отменить, и все записи будут безвозвратно удалены."
        confirmText="Да, очистить всё"
        cancelText="Отмена"
        onConfirm={clearAllHistory}
        onCancel={() => setIsClearHistoryDialogOpen(false)}
      />
    </div>
  );
}
