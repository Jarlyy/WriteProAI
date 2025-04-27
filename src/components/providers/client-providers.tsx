"use client";

import { ReactNode } from "react";
import { ConfirmDialogProvider } from "../ui/confirm-dialog-provider";

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <ConfirmDialogProvider>
      {children}
    </ConfirmDialogProvider>
  );
}
