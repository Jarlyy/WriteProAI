// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBdtVjp7Fo351qPpqD3AwyvRH0G28dlFlw",
  authDomain: "writeproai-deb22.firebaseapp.com",
  projectId: "writeproai-deb22",
  storageBucket: "writeproai-deb22.appspot.com", // Исправлено с .firebasestorage.app на .appspot.com
  messagingSenderId: "458314990329",
  appId: "1:458314990329:web:d9af33ea1f9f2dbac55828",
  measurementId: "G-0GDYBBFGHD"
};

// Инициализируем Firebase с типами
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth } from 'firebase/auth';
import { Analytics } from 'firebase/analytics';

let firebaseApp: FirebaseApp;
let db: Firestore;
let auth: Auth;
let analytics: Analytics | null = null;

// Проверяем, что мы в браузере
if (typeof window !== 'undefined') {
  try {
    console.log("Инициализация Firebase...");

    // Проверяем, инициализировано ли уже приложение
    if (getApps().length) {
      console.log("Firebase уже инициализирован, получаем существующий экземпляр");
      firebaseApp = getApp();
    } else {
      console.log("Инициализируем новый экземпляр Firebase");
      firebaseApp = initializeApp(firebaseConfig);
    }

    // Инициализируем Firestore
    db = getFirestore(firebaseApp);
    console.log("Firestore инициализирован");

    // Инициализируем Auth
    auth = getAuth(firebaseApp);
    console.log("Auth инициализирован");

    // Инициализируем Analytics только если доступен
    try {
      analytics = getAnalytics(firebaseApp);
      console.log("Analytics инициализирован");
    } catch (e) {
      console.log("Analytics не инициализирован:", e);
    }
  } catch (error) {
    console.error('Ошибка при инициализации Firebase:', error);
  }
} else {
  // Для серверного рендеринга создаем пустые объекты
  console.log("Серверный рендеринг, создаем заглушки для Firebase");

  // Если приложение уже инициализировано, используем его
  if (getApps().length) {
    firebaseApp = getApp();
    db = getFirestore(firebaseApp);
    auth = getAuth(firebaseApp);
  } else {
    // Иначе инициализируем новое приложение
    firebaseApp = initializeApp(firebaseConfig);
    db = getFirestore(firebaseApp);
    auth = getAuth(firebaseApp);
  }
}

export { firebaseApp, db, auth, analytics };
