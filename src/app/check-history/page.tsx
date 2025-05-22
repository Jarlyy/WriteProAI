"use client";

import { CheckHistoryList } from "../../components/firestore/check-history";
import { useAuth } from "../../contexts/auth-context";
import { AppLayout } from "../../components/app-layout";

export default function CheckHistoryPage() {

  return (
    <AppLayout
      title="История проверок"
      breadcrumbs={[
        { label: "Главная", href: "/" },
        { label: "История" }
      ]}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="mb-4">
          <p className="text-gray-600 dark:text-gray-400">
            Здесь сохраняются все проверенные вами тексты. История проверок сохраняется автоматически при каждой проверке текста.
          </p>
        </div>
        <CheckHistoryList />
      </div>
    </AppLayout>
  );
}
