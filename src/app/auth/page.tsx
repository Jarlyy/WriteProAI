"use client";

import { FirebaseAuth } from "../../components/auth/firebase-auth";
import Link from "next/link";

export default function AuthPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Шапка страницы */}
      <header className="bg-blue-600 dark:bg-blue-800 text-white py-4 shadow-md">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold">WriteProAI</h1>
        </div>
      </header>
      
      {/* Основное содержимое */}
      <main className="flex-grow py-6">
        <div className="container mx-auto px-4 max-w-md">
          <div className="mb-6">
            <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline">
              &larr; Вернуться на главную
            </Link>
          </div>
          
          <h2 className="text-2xl font-bold mb-6 text-black dark:text-white">Аутентификация</h2>
          
          <FirebaseAuth />
        </div>
      </main>
    </div>
  );
}
