"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase-client";

// Создаем контекст авторизации
interface AuthContextType {
  user: User | null;
  loading: boolean;
}

// Создаем глобальную переменную для кэширования состояния пользователя
let cachedUser: User | null = null;
let authStateChangeListenerInitialized = false;

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

// Хук для использования контекста авторизации
export const useAuth = () => useContext(AuthContext);

// Провайдер контекста авторизации
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(cachedUser);
  const [loading, setLoading] = useState(!authStateChangeListenerInitialized);

  useEffect(() => {
    // Если слушатель уже инициализирован и у нас есть кэшированный пользователь,
    // мы можем сразу использовать его без ожидания
    if (authStateChangeListenerInitialized && cachedUser) {
      setUser(cachedUser);
      setLoading(false);
      return;
    }

    console.log("Инициализация AuthProvider...");

    // Отслеживаем состояние авторизации
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log("Состояние авторизации изменилось:", currentUser ? "Авторизован" : "Не авторизован");

      // Обновляем кэш и состояние
      cachedUser = currentUser;
      authStateChangeListenerInitialized = true;

      setUser(currentUser);
      setLoading(false);
    });

    // Отписываемся при размонтировании компонента
    return () => {
      // Не сбрасываем кэш при размонтировании, чтобы сохранить состояние между переходами страниц
      unsubscribe();
    };
  }, []);

  // Мемоизируем значение контекста, чтобы избежать ненужных ререндеров
  const contextValue = React.useMemo(() => ({
    user,
    loading
  }), [user, loading]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}
