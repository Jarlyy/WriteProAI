"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  User
} from "firebase/auth";
import { auth } from "../../lib/firebase-client";
import { Button } from "../../components/ui/button";
import { Separator } from "../../components/ui/separator";

// Проверяем инициализацию Firebase Auth
console.log("FirebaseAuth компонент: Auth доступен?", Boolean(auth));

export function FirebaseAuth() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  // Слушаем изменения состояния аутентификации
  useEffect(() => {
    // Проверяем, что мы в браузере и auth инициализирован
    if (typeof window !== 'undefined' && auth) {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setUser(user);
        setLoading(false);
      });

      // Отписываемся при размонтировании компонента
      return () => unsubscribe();
    } else {
      // Если мы на сервере или auth не инициализирован, просто устанавливаем loading в false
      setLoading(false);
    }
  }, []);

  // Функция для получения понятного сообщения об ошибке
  const getErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
      case 'auth/invalid-credential':
        return 'Неверный email или пароль. Пожалуйста, проверьте введенные данные.';
      case 'auth/user-not-found':
        return 'Пользователь с таким email не найден.';
      case 'auth/wrong-password':
        return 'Неверный пароль.';
      case 'auth/email-already-in-use':
        return 'Этот email уже используется другим аккаунтом.';
      case 'auth/weak-password':
        return 'Пароль слишком слабый. Используйте не менее 6 символов.';
      case 'auth/invalid-email':
        return 'Неверный формат email.';
      case 'auth/popup-closed-by-user':
        return 'Вход через Google отменен. Окно было закрыто.';
      case 'auth/cancelled-popup-request':
        return 'Операция отменена. Было открыто несколько всплывающих окон.';
      case 'auth/popup-blocked':
        return 'Всплывающее окно было заблокировано браузером. Пожалуйста, разрешите всплывающие окна для этого сайта.';
      default:
        return `Произошла ошибка: ${errorCode}`;
    }
  };

  // Функция для входа
  const signIn = async () => {
    if (!auth) return;

    try {
      setError("");
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/'); // Перенаправление на главную страницу после успешного входа
    } catch (error: any) {
      console.error("Sign in error:", error);
      setError(getErrorMessage(error.code));
    }
  };

  // Функция для регистрации
  const signUp = async () => {
    if (!auth) return;

    try {
      setError("");
      await createUserWithEmailAndPassword(auth, email, password);
      router.push('/'); // Перенаправление на главную страницу после успешной регистрации
    } catch (error: any) {
      console.error("Sign up error:", error);
      setError(getErrorMessage(error.code));
    }
  };

  // Функция для входа через Google
  const signInWithGoogle = async () => {
    if (!auth) return;

    try {
      setError("");
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.push('/'); // Перенаправление на главную страницу после успешного входа через Google
    } catch (error: any) {
      console.error("Google sign in error:", error);
      setError(getErrorMessage(error.code));
    }
  };

  // Функция для выхода
  const signOut = async () => {
    if (!auth) return;

    try {
      await firebaseSignOut(auth);
    } catch (error: any) {
      console.error("Sign out error:", error);
      setError(getErrorMessage(error.code));
    }
  };

  // Если загрузка, показываем индикатор загрузки
  if (loading) {
    return <div>Загрузка...</div>;
  }

  // Если пользователь авторизован, показываем информацию о пользователе и кнопку выхода
  if (user) {
    return (
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <p className="mb-2">Вы вошли как: {user.email}</p>
        <Button onClick={signOut} variant="outline">Выйти</Button>
      </div>
    );
  }

  // Если пользователь не авторизован, показываем форму входа/регистрации
  return (
    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
      <h2 className="text-xl font-bold mb-4">{isSignUp ? "Регистрация" : "Вход"}</h2>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 mb-4">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Кнопка входа через Google */}
      <div className="mb-6">
        <Button
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-2 bg-white text-gray-800 hover:bg-gray-100 border border-gray-300"
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Войти через Google
        </Button>
      </div>

      <div className="relative my-6">
        <Separator className="absolute inset-0" />
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-blue-50 dark:bg-blue-900/20 px-2 text-gray-500 dark:text-gray-400">
            или
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block mb-1">Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
          />
        </div>

        <div>
          <label className="block mb-1">Пароль:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
          />
        </div>

        <div className="flex space-x-2">
          <Button onClick={isSignUp ? signUp : signIn}>
            {isSignUp ? "Зарегистрироваться" : "Войти"}
          </Button>

          <Button variant="outline" onClick={() => setIsSignUp(!isSignUp)}>
            {isSignUp ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Зарегистрироваться"}
          </Button>
        </div>
      </div>
    </div>
  );
}
