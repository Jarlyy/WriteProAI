"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "../../../lib/firebase-client";
import { Button } from "../../../components/ui/button";
import { Moon, Sun, FileText, Home, ArrowLeft, Copy, Check, Clock, User, LogOut, BookOpen } from "lucide-react";
import { signOut } from "firebase/auth";
import { ConfirmDialog } from "../../../components/ui/confirm-dialog";
import { CheckHistoryItem, ReadabilityMetrics } from "../../../components/firestore/check-history";
import { useAuth } from "../../../contexts/auth-context";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";

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
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            {/* Логотип */}
            <h1 className="text-3xl font-bold">WriteProAI</h1>

            {/* Правая часть шапки с фиксированной структурой */}
            <div className="flex items-center">
              {/* Навигационные вкладки с фиксированной шириной */}
              <div className="flex items-center space-x-1 w-[350px] justify-center">
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
                  className="text-white bg-white/20 hover:bg-white/30 transition-all duration-300 flex items-center rounded-lg px-3 py-2"
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

              {/* Блок авторизации и темы */}
              <div className="flex items-center ml-12">
                {user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="focus:outline-none">
                        {user.photoURL ? (
                          <img
                            src={user.photoURL}
                            alt="User avatar"
                            className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-gray-800 cursor-pointer hover:opacity-90 transition-opacity"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-400 dark:bg-blue-500 flex items-center justify-center text-white font-semibold text-sm uppercase cursor-pointer hover:opacity-90 transition-opacity">
                            {user.displayName && !user.providerData?.[0]?.providerId?.includes('google')
                              ? user.displayName.split(' ').map(name => name[0]).join('').substring(0, 2).toUpperCase()
                              : user.email
                                ? user.email.substring(0, 2).toUpperCase()
                                : "??"}
                          </div>
                        )}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>Мой аккаунт</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {user.displayName && (
                        <DropdownMenuLabel className="font-normal text-sm truncate">
                          {user.displayName}
                        </DropdownMenuLabel>
                      )}
                      {user.email && (
                        <DropdownMenuLabel className="font-normal text-xs truncate text-gray-500 dark:text-gray-400">
                          {user.email}
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
                <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20 space-y-4">
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

                  {/* Детальные метрики читаемости */}
                  <div className="mt-4">
                    <h4 className="font-semibold text-sm mb-2 text-black dark:text-white">Детальные метрики:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Индекс Флеша-Кинкейда</div>
                        <div className="text-lg font-semibold text-black dark:text-white">
                          {historyItem.readabilityMetrics?.fleschKincaid ? historyItem.readabilityMetrics.fleschKincaid.toFixed(1) : "0.0"}
                        </div>
                      </div>
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Индекс Колман-Лиау</div>
                        <div className="text-lg font-semibold text-black dark:text-white">
                          {historyItem.readabilityMetrics?.colemanLiau ? historyItem.readabilityMetrics.colemanLiau.toFixed(1) : "0.0"}
                        </div>
                      </div>
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Средняя длина предложения</div>
                        <div className="text-lg font-semibold text-black dark:text-white">
                          {historyItem.readabilityMetrics?.avgSentenceLength ? historyItem.readabilityMetrics.avgSentenceLength.toFixed(1) : "0.0"} слов
                        </div>
                      </div>
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Средняя длина слова</div>
                        <div className="text-lg font-semibold text-black dark:text-white">
                          {historyItem.readabilityMetrics?.avgWordLength ? historyItem.readabilityMetrics.avgWordLength.toFixed(1) : "0.0"} символов
                        </div>
                      </div>
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Сложные слова</div>
                        <div className="text-lg font-semibold text-black dark:text-white">
                          {historyItem.readabilityMetrics?.complexWordsPercentage ? (historyItem.readabilityMetrics.complexWordsPercentage * 100).toFixed(1) : "0.0"}%
                        </div>
                      </div>
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Лексическое разнообразие</div>
                        <div className="text-lg font-semibold text-black dark:text-white">
                          {historyItem.readabilityMetrics?.lexicalDiversity
                            ? Math.min(100, (historyItem.readabilityMetrics.lexicalDiversity * 100)).toFixed(1)
                            : "0.0"}%
                        </div>
                      </div>
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
                  {historyItem.errors && Array.isArray(historyItem.errors) && historyItem.errors.length > 0 ? (
                    <ul className="list-disc pl-5 space-y-1 text-black dark:text-white">
                      {historyItem.errors.map((error, index) => (
                        <li key={index}>
                          {error && typeof error === 'object' && error.message ? error.message :
                           typeof error === 'string' ? error : 'Неизвестная ошибка'}
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
