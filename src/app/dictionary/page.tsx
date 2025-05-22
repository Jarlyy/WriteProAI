"use client";

import { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { Plus, Trash2, X } from "lucide-react";
import { useAuth } from "../../contexts/auth-context";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../lib/firebase-client";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { AppLayout } from "../../components/app-layout";

// Интерфейс для элемента словаря
interface DictionaryItem {
  id?: string;
  userId: string;
  word: string;
  createdAt: Date;
}

export default function DictionaryPage() {
  const { user: memoizedUser } = useAuth();

  const [dictionary, setDictionary] = useState<DictionaryItem[]>([]);
  const [newWord, setNewWord] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isClearDictionaryDialogOpen, setIsClearDictionaryDialogOpen] = useState(false);

  // Загрузка словаря пользователя
  useEffect(() => {
    const loadDictionary = async () => {
      if (!memoizedUser) {
        setDictionary([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const dictionaryQuery = query(
          collection(db, "dictionary"),
          where("userId", "==", memoizedUser.uid)
        );

        const querySnapshot = await getDocs(dictionaryQuery);
        const dictionaryItems: DictionaryItem[] = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          // Преобразуем timestamp в Date
          const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);

          dictionaryItems.push({
            id: doc.id,
            userId: data.userId,
            word: data.word || "",
            createdAt: createdAt
          });
        });

        // Сортируем по дате добавления (от новых к старым)
        dictionaryItems.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setDictionary(dictionaryItems);

        // Сохраняем словарь в localStorage для использования в других компонентах
        const words = dictionaryItems.map(item => item.word.toLowerCase());
        localStorage.setItem('userDictionary', JSON.stringify(words));

        // Также сохраняем в sessionStorage для отладки
        sessionStorage.setItem('userDictionary', JSON.stringify(words));

        // Выводим подробную информацию для отладки
        console.log('Словарь пользователя сохранен в localStorage и sessionStorage:', words);
        console.log('Количество слов в словаре:', words.length);
        console.log('Содержимое localStorage после сохранения:', localStorage.getItem('userDictionary'));
      } catch (error) {
        console.error("Ошибка при загрузке словаря:", error);
        setError("Не удалось загрузить словарь");
      } finally {
        setIsLoading(false);
      }
    };

    loadDictionary();
  }, [memoizedUser]);

  // Добавление нового слова в словарь
  const addWord = async () => {
    if (!memoizedUser) {
      setError("Необходимо войти в аккаунт для добавления слов в словарь");
      return;
    }

    if (!newWord.trim()) {
      setError("Введите слово для добавления");
      return;
    }

    // Проверяем, есть ли уже такое слово в словаре
    const wordExists = dictionary.some(item => item.word.toLowerCase() === newWord.trim().toLowerCase());
    if (wordExists) {
      setError("Это слово уже есть в словаре");
      return;
    }

    setIsAdding(true);
    setError("");

    try {
      const dictionaryItem = {
        userId: memoizedUser.uid,
        word: newWord.trim(),
        createdAt: new Date()
      };

      const docRef = await addDoc(collection(db, "dictionary"), dictionaryItem);

      // Добавляем новое слово в локальный список
      const updatedDictionary = [
        {
          id: docRef.id,
          ...dictionaryItem
        },
        ...dictionary
      ];

      setDictionary(updatedDictionary);

      // Обновляем localStorage и sessionStorage
      const words = updatedDictionary.map(item => item.word.toLowerCase());

      // Сначала проверим текущее состояние localStorage
      const currentDict = localStorage.getItem('userDictionary');
      console.log('Текущее состояние словаря в localStorage перед обновлением:', currentDict);

      // Обновляем localStorage
      localStorage.setItem('userDictionary', JSON.stringify(words));

      // Проверяем, что словарь действительно обновился
      const updatedDict = localStorage.getItem('userDictionary');
      console.log('Словарь в localStorage после обновления:', updatedDict);

      // Также обновляем sessionStorage для надежности
      sessionStorage.setItem('userDictionary', JSON.stringify(words));

      console.log('Словарь пользователя обновлен в localStorage и sessionStorage после добавления:', words);
      console.log('Количество слов в словаре после добавления:', words.length);

      setNewWord("");
      setSuccess("Слово успешно добавлено в словарь");

      // Скрываем сообщение об успехе через 3 секунды
      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (error) {
      console.error("Ошибка при добавлении слова:", error);
      setError("Не удалось добавить слово в словарь");
    } finally {
      setIsAdding(false);
    }
  };

  // Удаление слова из словаря
  const deleteWord = async (id: string) => {
    if (!memoizedUser) {
      setError("Необходимо войти в аккаунт для удаления слов из словаря");
      return;
    }

    setIsDeleting(true);
    setError("");

    try {
      await deleteDoc(doc(db, "dictionary", id));

      // Удаляем слово из локального списка
      const updatedDictionary = dictionary.filter(item => item.id !== id);
      setDictionary(updatedDictionary);

      // Обновляем localStorage и sessionStorage
      const words = updatedDictionary.map(item => item.word.toLowerCase());

      // Сначала проверим текущее состояние localStorage
      const currentDict = localStorage.getItem('userDictionary');
      console.log('Текущее состояние словаря в localStorage перед удалением:', currentDict);

      // Обновляем localStorage
      localStorage.setItem('userDictionary', JSON.stringify(words));

      // Проверяем, что словарь действительно обновился
      const updatedDict = localStorage.getItem('userDictionary');
      console.log('Словарь в localStorage после удаления:', updatedDict);

      // Также обновляем sessionStorage для надежности
      sessionStorage.setItem('userDictionary', JSON.stringify(words));

      console.log('Словарь пользователя обновлен в localStorage и sessionStorage после удаления:', words);
      console.log('Количество слов в словаре после удаления:', words.length);

      setSuccess("Слово успешно удалено из словаря");

      // Скрываем сообщение об успехе через 3 секунды
      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (error) {
      console.error("Ошибка при удалении слова:", error);
      setError("Не удалось удалить слово из словаря");
    } finally {
      setIsDeleting(false);
    }
  };

  // Очистка всего словаря
  const clearDictionary = async () => {
    if (!memoizedUser) {
      setError("Необходимо войти в аккаунт для очистки словаря");
      return;
    }

    setIsDeleting(true);
    setError("");

    try {
      // Получаем все документы пользователя
      const dictionaryQuery = query(
        collection(db, "dictionary"),
        where("userId", "==", memoizedUser.uid)
      );

      const querySnapshot = await getDocs(dictionaryQuery);

      // Создаем массив промисов для удаления всех документов
      const deletePromises = querySnapshot.docs.map(doc =>
        deleteDoc(doc.ref)
      );

      // Ждем завершения всех операций удаления
      await Promise.all(deletePromises);

      // Очищаем словарь в состоянии
      setDictionary([]);

      // Сначала проверим текущее состояние localStorage
      const currentDict = localStorage.getItem('userDictionary');
      console.log('Текущее состояние словаря в localStorage перед очисткой:', currentDict);

      // Очищаем localStorage
      localStorage.setItem('userDictionary', JSON.stringify([]));

      // Проверяем, что словарь действительно очистился
      const updatedDict = localStorage.getItem('userDictionary');
      console.log('Словарь в localStorage после очистки:', updatedDict);

      // Также очищаем sessionStorage для надежности
      sessionStorage.setItem('userDictionary', JSON.stringify([]));

      console.log('Словарь пользователя очищен в localStorage и sessionStorage');

      setSuccess("Словарь успешно очищен");

      // Скрываем сообщение об успехе через 3 секунды
      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (error) {
      console.error("Ошибка при очистке словаря:", error);
      setError("Не удалось очистить словарь");
    } finally {
      setIsDeleting(false);
      setIsClearDictionaryDialogOpen(false);
    }
  };

  return (
    <AppLayout
      title="Словарь исключений"
      breadcrumbs={[
        { label: "Главная", href: "/" },
        { label: "Словарь" }
      ]}
    >
      {/* Диалог подтверждения очистки словаря */}
      <ConfirmDialog
        isOpen={isClearDictionaryDialogOpen}
        title="Очистка словаря"
        message="Вы уверены, что хотите очистить весь словарь? Это действие нельзя отменить."
        confirmText="Да, очистить"
        cancelText="Отмена"
        onConfirm={clearDictionary}
        onCancel={() => setIsClearDictionaryDialogOpen(false)}
      />

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="mb-4">
            <p className="text-gray-600 dark:text-gray-400">
              Здесь вы можете добавить слова, которые не будут считаться ошибками при проверке текста.
              Это полезно для специальных терминов, имен собственных и других слов, которые не должны исправляться.
            </p>
          </div>

            {!memoizedUser && (
              <div className="text-center py-8">
                <p className="mb-4">Войдите в аккаунт, чтобы просмотреть словарь исключений</p>
                <Button asChild>
                  <Link href="/auth">Войти</Link>
                </Button>
              </div>
            )}

            {/* Сообщения об ошибках и успешных операциях */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 mb-4">
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-3 mb-4">
                <p className="text-green-600 dark:text-green-400 text-sm">{success}</p>
              </div>
            )}

            {/* Форма добавления нового слова */}
            {memoizedUser && (
              <div className="mb-6">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newWord}
                    onChange={(e) => setNewWord(e.target.value)}
                    placeholder="Введите слово для добавления"
                    className="flex-grow px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    disabled={isAdding}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addWord();
                      }
                    }}
                  />
                  <Button
                    onClick={addWord}
                    disabled={isAdding || !newWord.trim()}
                    className="flex items-center gap-2"
                  >
                    {isAdding ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Добавление...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Добавить
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Список слов в словаре */}
            {isLoading ? (
              <div className="text-center py-8">
                <div className="inline-block h-6 w-6 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-2 text-gray-600 dark:text-gray-400">Загрузка словаря...</p>
              </div>
            ) : (
              <div>
                {dictionary.length > 0 ? (
                  <>
                    <div className="flex justify-end mb-4">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setIsClearDictionaryDialogOpen(true)}
                        disabled={isDeleting}
                        className="flex items-center gap-2"
                      >
                        {isDeleting ? (
                          <>
                            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Очистка...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4" />
                            Очистить словарь
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {dictionary.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-md"
                        >
                          <span className="text-black dark:text-white">{item.word}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteWord(item.id)}
                            disabled={isDeleting}
                            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p>В вашем словаре пока нет слов</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      Добавьте слова, которые не должны считаться ошибками при проверке текста
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
    </AppLayout>
  );
}
