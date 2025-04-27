"use client";

import { useState, useEffect } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../lib/firebase-client";
import { Button } from "../../components/ui/button";

// Проверяем инициализацию Firebase при монтировании компонента
console.log("SaveText компонент: Firestore и Auth доступны?", {
  dbAvailable: Boolean(db),
  authAvailable: Boolean(auth)
});

interface SaveTextProps {
  text: string;
  correctedText: string;
  errors?: any[]; // Добавляем массив ошибок
}

export function SaveText({ text, correctedText, errors = [] }: SaveTextProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const saveToFirestore = async () => {
    console.log("Начало сохранения в Firestore");

    // Проверяем, что мы в браузере и Firebase инициализирован
    if (!db || !auth) {
      console.error("Firebase не инициализирован", { db, auth });
      setError("Firebase не инициализирован");
      return;
    }

    // Проверяем, авторизован ли пользователь
    const user = auth.currentUser;
    if (!user) {
      console.error("Пользователь не авторизован");
      setError("Вы должны войти в систему, чтобы сохранить текст");
      return;
    }
    console.log("Пользователь авторизован:", user.email);

    // Проверяем, есть ли текст для сохранения
    if (!text) {
      console.error("Нет текста для сохранения");
      setError("Нет текста для сохранения");
      return;
    }
    console.log("Текст для сохранения:", text.substring(0, 50) + "...");

    setSaving(true);
    setError("");

    try {
      // Оптимизация: сохраняем только необходимые данные
      // Если текст слишком длинный, сохраняем только первые 10000 символов
      const maxTextLength = 10000;
      const truncatedOriginalText = text.length > maxTextLength
        ? text.substring(0, maxTextLength) + "..."
        : text;

      const truncatedCorrectedText = correctedText && correctedText.length > maxTextLength
        ? correctedText.substring(0, maxTextLength) + "..."
        : correctedText || "";

      // Создаем документ с оптимизированными данными
      const docData = {
        userId: user.uid,
        userEmail: user.email,
        originalText: truncatedOriginalText,
        correctedText: truncatedCorrectedText,
        createdAt: serverTimestamp(),
        // Добавляем метаданные для быстрого поиска и фильтрации
        textLength: text.length,
        hasCorrections: Boolean(correctedText),
        saveDate: new Date().toISOString().split('T')[0], // Формат YYYY-MM-DD
        errorsCount: errors.length, // Добавляем количество ошибок
      };

      console.log("Сохраняем документ в Firestore:", { userId: user.uid, textLength: text.length });

      // Сохраняем текст в Firestore
      const docRef = await addDoc(collection(db, "texts"), docData);
      console.log("Документ успешно сохранен с ID:", docRef.id);

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error: any) {
      console.error("Ошибка при сохранении в Firestore:", error);
      setError(error.message || "Ошибка при сохранении");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Button
        onClick={saveToFirestore}
        disabled={saving || !text}
        className={`${
          saved ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"
        } text-white transition-colors`}
      >
        {saving ? "Сохранение..." : saved ? "Добавлено!" : "Добавить в избранное"}
      </Button>

      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  );
}
