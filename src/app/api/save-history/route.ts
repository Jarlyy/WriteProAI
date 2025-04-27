import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Инициализируем Firebase Admin SDK
if (!admin.apps.length) {
  try {
    // Проверяем, есть ли переменные окружения
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      : undefined;

    const projectId = process.env.FIREBASE_PROJECT_ID || "writeproai-deb22";

    // Если есть переменные окружения, используем их
    if (privateKey && process.env.FIREBASE_CLIENT_EMAIL) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey
        }),
      });
    } else {
      // Иначе используем сервисный аккаунт по умолчанию (для локальной разработки)
      admin.initializeApp({
        projectId
      });
    }
    console.log('Firebase Admin SDK initialized');
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
  }
}

// Получаем экземпляр Firestore
const adminDb = admin.firestore();

export async function POST(request: NextRequest) {
  try {
    // Получаем данные из запроса
    const data = await request.json();

    // Проверяем наличие необходимых полей
    if (!data.userId || !data.originalText) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Создаем документ в коллекции checkHistory
    const docRef = await adminDb.collection('checkHistory').add({
      ...data,
      timestamp: new Date()
    });

    return NextResponse.json(
      { success: true, id: docRef.id },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error saving history:', error);

    return NextResponse.json(
      { error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
