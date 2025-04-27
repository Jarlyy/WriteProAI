"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "../../../lib/firebase-client";
import { Button } from "../../../components/ui/button";
import { Moon, Sun, FileText, Home, ArrowLeft, Copy, Check } from "lucide-react";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { ConfirmDialog } from "../../../components/ui/confirm-dialog";
import { CheckHistoryItem } from "../../../components/firestore/check-history";
import { useAuth } from "../../../contexts/auth-context";

export default function CheckHistoryDetailPage() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSignOutDialogOpen, setIsSignOutDialogOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState<CheckHistoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Используем контекст авторизации
  const { user, loading: authLoading } = useAuth();

  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

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

  // Загружаем данные истории проверки
  useEffect(() => {
    // Если авторизация все еще загружается, ждем
    if (authLoading) {
      console.log("Авторизация загружается, ожидаем...");
      return;
    }

    const loadHistoryItem = async () => {
      console.log("Загрузка данных истории проверки...");
      console.log("Статус авторизации из контекста:", user ? "Авторизован" : "Не авторизован");

      if (!user) {
        console.log("Пользователь не авторизован (из контекста), история не загружена");
        setError("Необходимо войти в аккаунт для просмотра истории проверок");
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, "checkHistory", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          try {
            const data = docSnap.data();

            // Проверяем наличие необходимых полей
            if (!data.timestamp || !data.userId || !data.originalText) {
              setError("Запись имеет неверный формат");
              setLoading(false);
              return;
            }

            // Проверяем, принадлежит ли запись текущему пользователю
            if (data.userId !== user.uid) {
              setError("У вас нет доступа к этой записи");
              setLoading(false);
              return;
            }

            // Преобразуем timestamp в Date
            const timestamp = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);

            // Создаем объект с безопасными данными
            const safeItem: CheckHistoryItem = {
              id: docSnap.id,
              userId: data.userId,
              originalText: data.originalText || "",
              correctedText: data.correctedText || "",
              errors: Array.isArray(data.errors) ? data.errors : [],
              readabilityScore: typeof data.readabilityScore === 'number' ? data.readabilityScore : 0,
              timestamp: timestamp,
              title: data.title || "Без названия"
            };

            setHistoryItem(safeItem);
          } catch (error) {
            console.error("Ошибка при обработке документа:", error);
            setError("Ошибка при загрузке записи");
            setLoading(false);
            return;
          }
        } else {
          setError("Запись не найдена");
        }
      } catch (error) {
        console.error("Ошибка при загрузке записи:", error);
        setError("Не удалось загрузить запись");
      } finally {
        setLoading(false);
      }
    };

    loadHistoryItem();
  }, [id, user, authLoading]);

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

  // Функция для копирования текста
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);

    // Через 2 секунды возвращаем состояние в исходное
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };

  // Функция для возврата к списку истории
  const goBack = () => {
    router.push("/check-history");
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
        <div className="container mx-auto px-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold">WriteProAI</h1>
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-white hover:bg-white/10 transition-all duration-300 flex items-center rounded-lg px-3 py-2"
            >
              <a href="/">
                <Home className="h-4 w-4 mr-2" />
                Главная
              </a>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-white hover:bg-white/10 transition-all duration-300 flex items-center rounded-lg px-3 py-2"
            >
              <a href="/saved-texts">
                <FileText className="h-4 w-4 mr-2" />
                Мои тексты
              </a>
            </Button>

            {user ? (
              <div className="flex items-center space-x-3">
                <span className="text-white text-sm">{user.email}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOutClick}
                  className="text-white hover:bg-white/10 transition-all duration-300 flex items-center rounded-lg px-3 py-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Выйти
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="text-white hover:bg-white/10 transition-all duration-300 flex items-center rounded-lg px-3 py-2"
              >
                <a href="/auth">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-2 transform rotate-180"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Войти
                </a>
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="text-white hover:bg-white/10 transition-all duration-300 flex items-center rounded-lg p-2"
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
      </header>

      {/* Основное содержимое */}
      <main className="flex-grow py-6">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={goBack}
              className="flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад к истории
            </Button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            {loading ? (
              <div className="text-center py-8">Загрузка данных...</div>
            ) : error ? (
              <div className="text-center py-8 text-red-600 dark:text-red-400">
                {error}
              </div>
            ) : historyItem ? (
              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold">{historyItem.title}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {historyItem.timestamp.toLocaleDateString()} {historyItem.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => copyToClipboard(historyItem.correctedText)}
                      className={`p-2 rounded-full transition-all duration-300 ${
                        isCopied
                          ? "bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
                          : "bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
                      }`}
                      title={isCopied ? "Скопировано!" : "Копировать исправленный текст"}
                      aria-label={isCopied ? "Скопировано!" : "Копировать исправленный текст"}
                    >
                      {isCopied ? (
                        <Check className="h-4 w-4 text-white" />
                      ) : (
                        <Copy className="h-4 w-4 text-white" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Информация о читаемости */}
                <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20 space-y-2">
                  <h3 className="font-semibold mb-2 text-black dark:text-white">Читаемость текста:</h3>
                  <div className="flex justify-between text-black dark:text-white">
                    <span>Уровень читаемости</span>
                    <span>{Math.round(historyItem.readabilityScore)}%</span>
                  </div>
                  <div className="relative pt-1">
                    <div className="w-full h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.round(historyItem.readabilityScore)}%` }}
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

                {/* Исходный текст */}
                <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50">
                  <h3 className="font-semibold mb-2 text-black dark:text-white">Исходный текст:</h3>
                  <div
                    className="whitespace-pre-wrap text-black dark:text-white p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 max-h-[300px] overflow-auto"
                    style={{
                      boxShadow: 'inset 0 0 6px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    {historyItem.originalText}
                  </div>
                </div>

                {/* Исправленный текст */}
                <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-900/20">
                  <h3 className="font-semibold mb-2 text-black dark:text-white">Исправленный текст:</h3>
                  <div
                    className="whitespace-pre-wrap text-black dark:text-white p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 max-h-[300px] overflow-auto"
                    style={{
                      boxShadow: 'inset 0 0 6px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    {historyItem.correctedText}
                  </div>
                </div>

                {/* Информация об ошибках */}
                <div className="border rounded-lg p-4 bg-red-50 dark:bg-red-900/20">
                  <h3 className="font-semibold mb-2 text-black dark:text-white">Найденные ошибки:</h3>
                  {historyItem.errors.length > 0 ? (
                    <ul className="list-disc pl-5 space-y-1 text-black dark:text-white">
                      {historyItem.errors.map((error, index) => (
                        <li key={index}>
                          {error.message}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-black dark:text-white">Ошибок не найдено</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">Запись не найдена</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
