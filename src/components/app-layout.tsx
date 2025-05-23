"use client";

import { useState, useEffect } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "./ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { Separator } from "./ui/separator";
import { Button } from "./ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./ui/breadcrumb";

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  breadcrumbs?: Array<{
    label: string;
    href?: string;
  }>;
}

export function AppLayout({ children, title, breadcrumbs }: AppLayoutProps) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isPageLoaded, setIsPageLoaded] = useState(false);

  // Проверяем текущую тему при загрузке компонента
  useEffect(() => {
    // Проверяем предпочтения пользователя
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    // Проверяем сохраненную тему
    const savedTheme = localStorage.getItem("theme");

    // Устанавливаем начальное состояние
    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove("dark");
    }

    // Устанавливаем флаг загрузки страницы
    const timer = setTimeout(() => {
      setIsPageLoaded(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

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

  return (
    <SidebarProvider>
      <AppSidebar isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
      <SidebarInset className={`transition-opacity duration-500 ${isPageLoaded ? 'opacity-100' : 'opacity-0'}`}>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-all duration-300 ease-in-out border-b border-border/30 bg-background/80 backdrop-blur-sm sticky top-0 z-10 px-4 group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-14">
          <div className="flex items-center gap-3 w-full">
            <SidebarTrigger className="-ml-1 hover:bg-primary-50 dark:hover:bg-primary-200/10 transition-colors duration-200" />
            <Separator orientation="vertical" className="mr-1 h-5 bg-border/50" />

            <div className="flex-1 flex items-center">
              {breadcrumbs && breadcrumbs.length > 0 && (
                <Breadcrumb>
                  <BreadcrumbList>
                    {breadcrumbs.map((breadcrumb, index) => (
                      <div key={index} className="flex items-center">
                        {index > 0 && <BreadcrumbSeparator className="hidden md:block text-muted-foreground/70" />}
                        <BreadcrumbItem className="hidden md:block">
                          {breadcrumb.href ? (
                            <BreadcrumbLink href={breadcrumb.href} className="text-primary hover:text-primary/80 transition-colors duration-200 font-medium">
                              {breadcrumb.label}
                            </BreadcrumbLink>
                          ) : (
                            <BreadcrumbPage className="font-medium">{breadcrumb.label}</BreadcrumbPage>
                          )}
                        </BreadcrumbItem>
                      </div>
                    ))}
                  </BreadcrumbList>
                </Breadcrumb>
              )}
              {title && !breadcrumbs && (
                <h1 className="text-lg font-heading font-bold text-foreground">{title}</h1>
              )}
            </div>

            {/* Здесь можно добавить дополнительные элементы в правой части шапки */}
            <div className="flex items-center gap-2">
              {/* Пример: кнопка помощи */}
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-primary-50 dark:hover:bg-primary-200/10 transition-colors duration-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                  <path d="M12 17h.01"></path>
                </svg>
              </Button>
            </div>
          </div>
        </header>

        <main className={`flex flex-1 flex-col p-6 ${isPageLoaded ? 'animate-fade-in' : 'opacity-0'}`}>
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
