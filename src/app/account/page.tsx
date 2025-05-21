"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  updateProfile,
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
  sendEmailVerification,
  signOut
} from "firebase/auth";
import { auth } from "../../lib/firebase-client";
import { useAuth } from "../../contexts/auth-context";
import { Button } from "../../components/ui/button";
import { Separator } from "../../components/ui/separator";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import {
  Moon,
  Sun,
  User as UserIcon,
  Mail,
  Key,
  LogOut,
  Trash2,
  ArrowLeft,
  Check,
  AlertCircle,
  Home,
  FileText,
  Clock,
  BookOpen
} from "lucide-react";

export default function AccountPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSignOutDialogOpen, setIsSignOutDialogOpen] = useState(false);
  const [isDeleteAccountDialogOpen, setIsDeleteAccountDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  // Проверяем текущую тему при загрузке страницы
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
      setIsDarkMode(isDark);
    }
  }, []);

  // Заполняем поля данными пользователя при загрузке
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      setEmail(user.email || "");
    }
  }, [user]);

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

  // Функция для обновления профиля
  const updateUserProfile = async () => {
    if (!user) return;

    try {
      setError("");
      setSuccess("");

      await updateProfile(user, {
        displayName: displayName
      });

      setSuccess("Профиль успешно обновлен");
    } catch (error: any) {
      console.error("Ошибка при обновлении профиля:", error);
      setError(`Ошибка при обновлении профиля: ${error.message}`);
    }
  };

  // Функция для обновления email
  const updateUserEmail = async () => {
    if (!user || !email) return;

    try {
      setError("");
      setSuccess("");

      if (email !== user.email) {
        if (!currentPassword) {
          setError("Для изменения email необходимо ввести текущий пароль");
          return;
        }

        // Повторная аутентификация пользователя
        const credential = EmailAuthProvider.credential(
          user.email || "",
          currentPassword
        );
        await reauthenticateWithCredential(user, credential);

        // Обновление email
        await updateEmail(user, email);

        // Отправка письма для подтверждения нового email
        await sendEmailVerification(user);

        setSuccess("Email успешно обновлен. Пожалуйста, проверьте почту для подтверждения нового адреса.");
      }
    } catch (error: any) {
      console.error("Ошибка при обновлении email:", error);

      if (error.code === 'auth/invalid-credential') {
        setError("Неверный пароль. Пожалуйста, проверьте введенные данные.");
      } else if (error.code === 'auth/email-already-in-use') {
        setError("Этот email уже используется другим аккаунтом.");
      } else if (error.code === 'auth/invalid-email') {
        setError("Неверный формат email.");
      } else {
        setError(`Ошибка при обновлении email: ${error.message}`);
      }
    }
  };

  // Функция для обновления пароля
  const updateUserPassword = async () => {
    if (!user) return;

    try {
      setError("");
      setSuccess("");

      if (!currentPassword) {
        setError("Необходимо ввести текущий пароль");
        return;
      }

      if (newPassword !== confirmPassword) {
        setError("Новый пароль и подтверждение не совпадают");
        return;
      }

      if (newPassword.length < 6) {
        setError("Новый пароль должен содержать не менее 6 символов");
        return;
      }

      // Повторная аутентификация пользователя
      const credential = EmailAuthProvider.credential(
        user.email || "",
        currentPassword
      );
      await reauthenticateWithCredential(user, credential);

      // Обновление пароля
      await updatePassword(user, newPassword);

      // Очищаем поля пароля
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setSuccess("Пароль успешно обновлен");
    } catch (error: any) {
      console.error("Ошибка при обновлении пароля:", error);

      if (error.code === 'auth/invalid-credential') {
        setError("Неверный текущий пароль. Пожалуйста, проверьте введенные данные.");
      } else if (error.code === 'auth/weak-password') {
        setError("Пароль слишком слабый. Используйте не менее 6 символов.");
      } else {
        setError(`Ошибка при обновлении пароля: ${error.message}`);
      }
    }
  };

  // Функция для удаления аккаунта
  const deleteUserAccount = async () => {
    if (!user) return;

    try {
      if (!currentPassword) {
        setError("Для удаления аккаунта необходимо ввести текущий пароль");
        setIsDeleteAccountDialogOpen(false);
        return;
      }

      // Повторная аутентификация пользователя
      const credential = EmailAuthProvider.credential(
        user.email || "",
        currentPassword
      );
      await reauthenticateWithCredential(user, credential);

      // Удаление аккаунта
      await deleteUser(user);

      // Перенаправление на главную страницу
      router.push('/');
    } catch (error: any) {
      console.error("Ошибка при удалении аккаунта:", error);

      if (error.code === 'auth/invalid-credential') {
        setError("Неверный пароль. Пожалуйста, проверьте введенные данные.");
      } else {
        setError(`Ошибка при удалении аккаунта: ${error.message}`);
      }

      setIsDeleteAccountDialogOpen(false);
    }
  };

  // Функция для выхода из аккаунта
  const confirmSignOut = async () => {
    try {
      if (auth) {
        await signOut(auth);
        router.push('/');
      }
    } catch (error) {
      console.error("Ошибка при выходе из аккаунта:", error);
    } finally {
      setIsSignOutDialogOpen(false);
    }
  };

  // Если загрузка, показываем индикатор загрузки
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="bg-blue-600 dark:bg-blue-800 text-white py-4 shadow-md">
          <div className="container mx-auto px-4 flex justify-between items-center">
            <h1 className="text-3xl font-bold">WriteProAI</h1>
          </div>
        </header>
        <main className="flex-grow flex items-center justify-center">
          <div>Загрузка...</div>
        </main>
      </div>
    );
  }

  // Если пользователь не авторизован, перенаправляем на страницу авторизации
  if (!user) {
    router.push('/auth');
    return null;
  }

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
        onCancel={() => setIsSignOutDialogOpen(false)}
      />

      {/* Диалог подтверждения удаления аккаунта */}
      <ConfirmDialog
        isOpen={isDeleteAccountDialogOpen}
        title="Удаление аккаунта"
        message="Вы уверены, что хотите удалить свой аккаунт? Это действие невозможно отменить."
        confirmText="Да, удалить аккаунт"
        cancelText="Отмена"
        onConfirm={deleteUserAccount}
        onCancel={() => setIsDeleteAccountDialogOpen(false)}
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
                {user && (
                  <div className="mr-2">
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
                  </div>
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
          <div className="mb-6">
            <Button
              variant="outline"
              size="sm"
              asChild
              className="flex items-center"
            >
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Вернуться на главную
              </Link>
            </Button>
          </div>

          <h2 className="text-2xl font-bold mb-6 text-black dark:text-white">Настройки аккаунта</h2>

          {/* Вкладки настроек */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
            <button
              className={`py-2 px-4 font-medium ${
                activeTab === "profile"
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                  : "text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
              }`}
              onClick={() => setActiveTab("profile")}
            >
              Профиль
            </button>
            <button
              className={`py-2 px-4 font-medium ${
                activeTab === "email"
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                  : "text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
              }`}
              onClick={() => setActiveTab("email")}
            >
              Email
            </button>
            <button
              className={`py-2 px-4 font-medium ${
                activeTab === "password"
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                  : "text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
              }`}
              onClick={() => setActiveTab("password")}
            >
              Пароль
            </button>
            <button
              className={`py-2 px-4 font-medium ${
                activeTab === "danger"
                  ? "text-red-600 dark:text-red-400 border-b-2 border-red-600 dark:border-red-400"
                  : "text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
              }`}
              onClick={() => setActiveTab("danger")}
            >
              Управление аккаунтом
            </button>
          </div>

          {/* Сообщения об ошибках и успешных операциях */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 mb-4 flex items-start">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2 mt-0.5 flex-shrink-0" />
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-3 mb-4 flex items-start">
              <Check className="h-5 w-5 text-green-600 dark:text-green-400 mr-2 mt-0.5 flex-shrink-0" />
              <p className="text-green-600 dark:text-green-400 text-sm">{success}</p>
            </div>
          )}

          {/* Содержимое вкладки "Профиль" */}
          {activeTab === "profile" && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-medium mb-4 text-black dark:text-white">Информация профиля</h3>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Имя пользователя
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Введите имя пользователя"
                />
              </div>

              <Button onClick={updateUserProfile}>Сохранить изменения</Button>
            </div>
          )}

          {/* Содержимое вкладки "Email" */}
          {activeTab === "email" && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-medium mb-4 text-black dark:text-white">Изменение Email</h3>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Введите новый email"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Текущий пароль (для подтверждения)
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Введите текущий пароль"
                />
              </div>

              <Button onClick={updateUserEmail}>Обновить Email</Button>
            </div>
          )}

          {/* Содержимое вкладки "Пароль" */}
          {activeTab === "password" && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-medium mb-4 text-black dark:text-white">Изменение пароля</h3>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Текущий пароль
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Введите текущий пароль"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Новый пароль
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Введите новый пароль"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Подтверждение нового пароля
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Подтвердите новый пароль"
                />
              </div>

              <Button onClick={updateUserPassword}>Обновить пароль</Button>
            </div>
          )}

          {/* Содержимое вкладки "Управление аккаунтом" */}
          {activeTab === "danger" && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-medium mb-4 text-black dark:text-white">Управление аккаунтом</h3>

              <div className="border border-red-300 dark:border-red-700 rounded-lg p-4 mb-6">
                <h4 className="text-red-600 dark:text-red-400 font-medium mb-2">Выход из аккаунта</h4>
                <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
                  Выйти из текущего аккаунта на всех устройствах.
                </p>
                <Button
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                  onClick={() => setIsSignOutDialogOpen(true)}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Выйти из аккаунта
                </Button>
              </div>

              <div className="border border-red-300 dark:border-red-700 rounded-lg p-4">
                <h4 className="text-red-600 dark:text-red-400 font-medium mb-2">Удаление аккаунта</h4>
                <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
                  Удаление аккаунта приведет к потере всех ваших данных. Это действие невозможно отменить.
                </p>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                    Текущий пароль (для подтверждения)
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Введите текущий пароль"
                  />
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setIsDeleteAccountDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Удалить аккаунт
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
