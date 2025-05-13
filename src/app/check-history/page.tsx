"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { CheckHistoryList } from "../../components/firestore/check-history";
import { Button } from "../../components/ui/button";
import { Moon, Sun, FileText, Home, Clock, LogOut, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "../../lib/firebase-client";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { useAuth } from "../../contexts/auth-context";

export default function CheckHistoryPage() {
  const [isDarkMode, setIsDarkMode] = useState(false);
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
              <div className="flex items-center space-x-1 w-[280px] justify-center">
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
              <h1 className="text-2xl font-bold mb-2">История проверок</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Здесь сохраняются все проверенные вами тексты. История проверок сохраняется автоматически при каждой проверке текста.
              </p>
            </div>
            <CheckHistoryList />
          </div>
        </div>
      </main>
    </div>
  );
}
