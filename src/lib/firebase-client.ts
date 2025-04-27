// Этот файл используется только на клиенте
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore, collection } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";
import { getAnalytics, Analytics } from "firebase/analytics";

// Конфигурация Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBdtVjp7Fo351qPpqD3AwyvRH0G28dlFlw",
  authDomain: "writeproai-deb22.firebaseapp.com",
  projectId: "writeproai-deb22",
  storageBucket: "writeproai-deb22.appspot.com",
  messagingSenderId: "458314990329",
  appId: "1:458314990329:web:d9af33ea1f9f2dbac55828",
  measurementId: "G-0GDYBBFGHD"
};

// Инициализируем Firebase
let firebaseApp: FirebaseApp;
let db: Firestore;
let auth: Auth;
let analytics: Analytics | null = null;

// Проверяем, что мы в браузере
if (typeof window !== 'undefined') {
  try {
    console.log("Инициализация Firebase на клиенте...");

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

    // Проверяем, что Firestore инициализирован корректно
    try {
      const testCollection = collection(db, "test");
      console.log("Тестовая коллекция получена:", !!testCollection);
      console.log("Firestore инициализирован корректно");
    } catch (error) {
      console.error("Ошибка при проверке инициализации Firestore:", error);
    }

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
}

export { firebaseApp, db, auth, analytics };
