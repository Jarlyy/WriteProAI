"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, query, where, orderBy, getDocs, limit, doc, deleteDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { db, auth } from "../../lib/firebase-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, Moon, Sun, FileText, Home, LogOut, Clock, User, BookOpen } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { Button } from "../../components/ui/button";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { useAuth } from "../../contexts/auth-context";

// Проверяем инициализацию Firebase при монтировании компонента
console.log("SavedTextsPage: Firestore и Auth доступны?", {
  dbAvailable: Boolean(db),
  authAvailable: Boolean(auth)
});

interface SavedText {
  id: string;
  originalText: string;
  correctedText: string;
  createdAt: any;
  saveDate?: string;
  textLength?: number;
  hasCorrections?: boolean;
  errorsCount?: number; // Количество ошибок
  readabilityScore?: number; // Оценка читаемости
  errors?: any[]; // Массив ошибок
  readabilityMetrics?: any; // Метрики читаемости
  title?: string; // Заголовок
}

export default function SavedTextsPage() {
  const [texts, setTexts] = useState<SavedText[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [textToDelete, setTextToDelete] = useState<string | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isSignOutDialogOpen, setIsSignOutDialogOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Используем контекст авторизации с мемоизацией для предотвращения ненужных ререндеров
  const { user, loading: authLoading } = useAuth();

  // Инициализируем роутер для навигации
  const router = useRouter();

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

  // Используем контекст авторизации вместо слушателя onAuthStateChanged
  useEffect(() => {
    // Если авторизация все еще загружается, ждем
    if (authLoading) {
      console.log("Авторизация загружается, ожидаем...");
      return;
    }

    console.log("Статус авторизации из контекста:", memoizedUser ? "Авторизован" : "Не авторизован");

    if (memoizedUser) {
      // Сначала проверяем, есть ли кэшированные данные
      try {
        const cachedData = localStorage.getItem(`savedTexts_${memoizedUser.uid}`);
        if (cachedData) {
          const { texts, timestamp } = JSON.parse(cachedData);
          // Используем кэшированные данные, если они не старше 5 минут
          if (Date.now() - timestamp < 300000) {
            console.log('Используем кэшированные данные');
            setTexts(texts);
            setLoading(false);

            // Загружаем свежие данные в фоне
            setTimeout(() => {
              fetchTexts(memoizedUser.uid, true);
            }, 1000);
            return;
          }
        }
      } catch (e) {
        console.warn('Не удалось загрузить кэшированные тексты:', e);
      }

      // Если кэша нет или он устарел, загружаем данные из Firestore
      fetchTexts(memoizedUser.uid);
    } else {
      setLoading(false);
    }
  }, [memoizedUser, authLoading]);

  // Функция для открытия диалога подтверждения удаления
  const handleDeleteClick = (textId: string) => {
    setTextToDelete(textId);
    setIsConfirmDialogOpen(true);
  };

  // Функция для подтверждения удаления
  const handleConfirmDelete = () => {
    if (textToDelete) {
      deleteText(textToDelete);
    }
    setIsConfirmDialogOpen(false);
  };

  // Функция для отмены удаления
  const handleCancelDelete = () => {
    setTextToDelete(null);
    setIsConfirmDialogOpen(false);
  };

  // Функция для просмотра деталей сохраненного текста
  const viewSavedText = (textId: string) => {
    router.push(`/saved-texts/${textId}`);
  };

  // Функция для удаления текста
  const deleteText = async (textId: string) => {
    if (!db || !user) {
      setError("Не удалось удалить текст: Firebase не инициализирован или пользователь не авторизован");
      return;
    }

    try {
      setDeleting(textId);
      setTextToDelete(null); // Сбрасываем ID текста для удаления

      // Удаляем документ из Firestore
      const textRef = doc(db, "texts", textId);
      await deleteDoc(textRef);

      // Обновляем список текстов
      setTexts(prevTexts => prevTexts.filter(text => text.id !== textId));

      // Обновляем кэш в localStorage
      try {
        const cachedData = localStorage.getItem(`savedTexts_${user.uid}`);
        if (cachedData) {
          const { timestamp } = JSON.parse(cachedData);
          localStorage.setItem(`savedTexts_${user.uid}`, JSON.stringify({
            timestamp,
            texts: texts.filter(text => text.id !== textId)
          }));
        }
      } catch (e) {
        console.warn('Не удалось обновить кэш:', e);
      }

      console.log("Текст успешно удален:", textId);
    } catch (error: any) {
      console.error("Ошибка при удалении текста:", error);

      // Более понятные сообщения об ошибках для пользователя
      let errorMessage = "Произошла ошибка при удалении текста";

      if (error.code === "permission-denied") {
        errorMessage = "Недостаточно прав для удаления текста. Пожалуйста, проверьте правила безопасности в Firebase.";
        console.log("Рекомендация: Обновите правила безопасности Firestore, чтобы разрешить удаление документов.");
      } else if (error.code === "not-found") {
        errorMessage = "Текст не найден. Возможно, он был уже удален.";
      } else if (error.code === "unauthenticated") {
        errorMessage = "Вы не авторизованы. Пожалуйста, войдите в систему снова.";
      } else {
        errorMessage = `Не удалось удалить текст: ${error.message}`;
      }

      setError(errorMessage);

      // Автоматически сбрасываем ошибку через 5 секунд
      setTimeout(() => {
        setError("");
      }, 5000);
    } finally {
      setDeleting(null);
    }
  };

  // Функция для получения сохраненных текстов
  const fetchTexts = async (userId: string, isBackgroundFetch = false) => {
    // Проверяем, что мы в браузере и Firebase инициализирован
    if (!db) {
      setError("Firebase не инициализирован");
      setLoading(false);
      return;
    }

    try {
      // Устанавливаем loading только если это не фоновая загрузка
      if (!isBackgroundFetch) {
        setLoading(true);
      }
      setError("");

      // Оптимизация: ограничиваем количество загружаемых документов
      const limitCount = 20; // Загружаем только последние 20 документов

      // Создаем запрос к Firestore с ограничением и индексами
      const q = query(
        collection(db, "texts"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc"),
        limit(limitCount)
      );

      // Выполняем запрос
      const querySnapshot = await getDocs(q);

      // Преобразуем результаты запроса в массив объектов
      // Используем более эффективный метод map вместо forEach
      const fetchedTexts: SavedText[] = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          originalText: data.originalText || "",
          correctedText: data.correctedText || "",
          createdAt: data.createdAt ? new Date(data.createdAt.toDate()) : new Date(),
          // Добавляем дополнительные метаданные для UI
          saveDate: data.saveDate || new Date().toISOString().split('T')[0],
          textLength: data.textLength || data.originalText?.length || 0,
          hasCorrections: data.hasCorrections || false,
          errorsCount: data.errorsCount || (Array.isArray(data.errors) ? data.errors.length : 0), // Добавляем количество ошибок
          readabilityScore: typeof data.readabilityScore === 'number' ? data.readabilityScore : 0, // Добавляем оценку читаемости
          errors: Array.isArray(data.errors) ? data.errors : [], // Добавляем ошибки
          readabilityMetrics: data.readabilityMetrics || null, // Добавляем метрики читаемости
          title: data.title || data.originalText?.substring(0, 30) + (data.originalText?.length > 30 ? "..." : "") // Добавляем заголовок или генерируем его из текста
        };
      });

      setTexts(fetchedTexts);

      // Сохраняем данные в localStorage для быстрого доступа при следующей загрузке
      if (fetchedTexts.length > 0) {
        try {
          localStorage.setItem(`savedTexts_${userId}`, JSON.stringify({
            timestamp: Date.now(),
            texts: fetchedTexts
          }));
        } catch (e) {
          console.warn('Не удалось сохранить тексты в localStorage:', e);
        }
      }
    } catch (error: any) {
      console.error("Ошибка при получении текстов из Firestore:", error);
      setError(error.message);

      // В случае ошибки пытаемся загрузить данные из localStorage
      try {
        const cachedData = localStorage.getItem(`savedTexts_${userId}`);
        if (cachedData) {
          const { texts, timestamp } = JSON.parse(cachedData);
          // Используем кэшированные данные, если они не старше 1 часа
          if (Date.now() - timestamp < 3600000) {
            setTexts(texts);
            setError("Загружены кэшированные данные. " + error.message);
          }
        }
      } catch (e) {
        console.warn('Не удалось загрузить кэшированные тексты:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
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
          <div className="flex items-center">
            {/* Логотип */}
            <h1 className="text-3xl font-bold mr-6">WriteProAI</h1>

            {/* Навигационные вкладки рядом с логотипом */}
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="text-white hover:bg-white/10 transition-all duration-300 flex items-center rounded-lg px-3 py-2"
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
                className="text-white bg-white/20 hover:bg-white/30 transition-all duration-300 flex items-center rounded-lg px-3 py-2"
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

              <Button
                variant="ghost"
                size="sm"
                asChild
                className="text-white hover:bg-white/10 transition-all duration-300 flex items-center rounded-lg px-3 py-2"
              >
                <Link href="/dictionary">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Словарь
                </Link>
              </Button>
            </div>

            {/* Правая часть шапки */}
            <div className="flex items-center ml-auto">

              {/* Блок авторизации и темы */}
              <div className="flex items-center ml-12">
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
                            {memoizedUser.displayName && !memoizedUser.providerData?.[0]?.providerId?.includes('google')
                              ? memoizedUser.displayName.split(' ').map(name => name[0]).join('').substring(0, 2).toUpperCase()
                              : memoizedUser.email
                                ? memoizedUser.email.substring(0, 2).toUpperCase()
                                : "??"}
                          </div>
                        )}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>Мой аккаунт</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {memoizedUser.displayName && (
                        <DropdownMenuLabel className="font-normal text-sm truncate">
                          {memoizedUser.displayName}
                        </DropdownMenuLabel>
                      )}
                      {memoizedUser.email && (
                        <DropdownMenuLabel className="font-normal text-xs truncate text-gray-500 dark:text-gray-400">
                          {memoizedUser.email}
                        </DropdownMenuLabel>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/account" className="flex items-center cursor-pointer">
                          <User className="h-4 w-4 mr-2" />
                          Настройки аккаунта
                        </Link>
                      </DropdownMenuItem>
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="mb-4">
              <h1 className="text-2xl font-bold mb-2">Избранные тексты</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Здесь хранятся все добавленные вами в избранное тексты. Вы можете добавить текст в избранное после проверки на главной странице.
              </p>
            </div>

          {!memoizedUser && (
            <div className="text-center py-8">
              <p className="mb-4">Войдите в аккаунт, чтобы просмотреть избранные тексты</p>
              <Button asChild>
                <Link href="/auth">Войти</Link>
              </Button>
            </div>
          )}

          {loading && <p className="text-black dark:text-white">Загрузка...</p>}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Ошибка</h3>
                  <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {user && !loading && texts.length === 0 && (
            <p className="text-black dark:text-white">У вас пока нет избранных текстов.</p>
          )}

          {user && !loading && texts.length > 0 && (
            <div className="space-y-6">
              {texts.map((text) => (
                <div
                  id={`text-${text.id}`}
                  key={text.id}
                  onClick={() => viewSavedText(text.id)}
                  className="border rounded-lg p-4 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-all cursor-pointer"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-grow">
                      <h3 className="font-semibold text-lg hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        {text.title || text.originalText.substring(0, 30) + (text.originalText.length > 30 ? "..." : "")}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {text.saveDate || text.createdAt.toLocaleDateString()}
                      </p>
                      <div className="mt-2 flex items-center">
                        <span className="text-sm mr-4">
                          Читаемость: {text.readabilityScore || 0}%
                        </span>
                        <span className="text-sm">
                          Ошибок: {text.errorsCount || 0}
                        </span>
                      </div>
                    </div>
                    <div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Предотвращаем всплытие события
                          handleDeleteClick(text.id);
                        }}
                        disabled={deleting === text.id}
                        className={`p-1.5 rounded-full transition-colors ${
                          deleting === text.id
                            ? "bg-gray-200 dark:bg-gray-700 cursor-not-allowed"
                            : "bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50"
                        }`}
                        title="Удалить текст"
                        aria-label="Удалить текст"
                      >
                        <Trash2 className={`h-4 w-4 ${
                          deleting === text.id
                            ? "text-gray-400 dark:text-gray-500"
                            : "text-red-500 dark:text-red-400"
                        }`} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-2">
                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                      {text.originalText}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        </div>

        {/* Модальное окно подтверждения удаления */}
        <ConfirmDialog
          isOpen={isConfirmDialogOpen}
          title="Подтверждение удаления"
          message="Вы точно хотите удалить этот текст из избранного? Это действие нельзя будет отменить, и текст будет безвозвратно удален."
          confirmText="Да, удалить"
          cancelText="Отмена"
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      </main>
    </div>
  );
}
