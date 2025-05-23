"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  FileText,
  Clock,
  BookOpen,
  User,
  LogOut,
  Sun,
  Moon,
  Settings,
  ChevronUp,
  MoreHorizontal,
  Star,
  History,
  Book,
  Sparkles,
  Lightbulb,
  Palette
} from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase-client";
import { useAuth } from "../contexts/auth-context";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator
} from "./ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { ConfirmDialog } from "./ui/confirm-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

interface AppSidebarProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export function AppSidebar({ isDarkMode, toggleTheme }: AppSidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isSignOutDialogOpen, setIsSignOutDialogOpen] = useState(false);

  // Навигационные элементы
  const navigationItems = [
    {
      title: "Главная",
      url: "/",
      icon: Home,
      isActive: pathname === "/",
      description: "Проверка текста и основные функции",
    },
    {
      title: "Избранное",
      url: "/saved-texts",
      icon: Star,
      isActive: pathname === "/saved-texts" || pathname.startsWith("/saved-texts/"),
      description: "Сохраненные тексты и работы",
    },
    {
      title: "История",
      url: "/check-history",
      icon: History,
      isActive: pathname === "/check-history" || pathname.startsWith("/check-history/"),
      description: "История проверок и исправлений",
    },
    {
      title: "Словарь",
      url: "/dictionary",
      icon: Book,
      isActive: pathname === "/dictionary",
      description: "Персональный словарь и исключения",
    },
  ];

  // Дополнительные инструменты
  const toolItems = [
    {
      title: "Улучшение текста",
      url: "/improve",
      icon: Sparkles,
      isActive: pathname === "/improve",
      description: "Инструменты для улучшения стиля текста",
    },
    {
      title: "Генерация идей",
      url: "/ideas",
      icon: Lightbulb,
      isActive: pathname === "/ideas",
      description: "Помощь в генерации идей для текста",
    },
  ];

  const handleSignOutClick = () => {
    setIsSignOutDialogOpen(true);
  };

  const confirmSignOut = async () => {
    try {
      if (auth) {
        await signOut(auth);
        console.log("Пользователь вышел из системы");
      }
    } catch (error) {
      console.error("Ошибка при выходе из аккаунта:", error);
    } finally {
      setIsSignOutDialogOpen(false);
    }
  };

  const cancelSignOut = () => {
    setIsSignOutDialogOpen(false);
  };

  // Эффект для анимации при загрузке
  useEffect(() => {
    // Добавляем класс для анимации с небольшой задержкой
    const timer = setTimeout(() => {
      const sidebarElement = document.querySelector('[data-sidebar="sidebar"]');
      if (sidebarElement) {
        sidebarElement.classList.add('animate-fade-in');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <ConfirmDialog
        isOpen={isSignOutDialogOpen}
        title="Выход из аккаунта"
        message="Вы уверены, что хотите выйти из аккаунта?"
        confirmText="Да, выйти"
        cancelText="Отмена"
        onConfirm={confirmSignOut}
        onCancel={cancelSignOut}
      />

      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                asChild
                tooltip="Главная страница"
                className="hover:bg-primary-50 dark:hover:bg-primary-200/10"
              >
                <Link href="/">
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-heading font-bold text-primary dark:text-primary">
                      WriteProAI
                    </span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="font-ui font-medium text-muted-foreground">
              Навигация
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigationItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton
                            asChild
                            isActive={item.isActive}
                            tooltip={item.title}
                            className={`transition-all duration-200 ${
                              item.isActive
                                ? "bg-primary-50 dark:bg-primary-200/10 text-primary dark:text-primary"
                                : "hover:bg-primary-50 dark:hover:bg-primary-200/10"
                            }`}
                          >
                            <Link href={item.url}>
                              <item.icon className={`size-5 ${item.isActive ? "text-primary dark:text-primary" : ""}`} />
                              <span className="font-medium">{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          {item.description}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />

          <SidebarGroup>
            <SidebarGroupLabel className="font-ui font-medium text-muted-foreground">
              Инструменты
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {toolItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton
                            asChild
                            isActive={item.isActive}
                            tooltip={item.title}
                            className={`transition-all duration-200 ${
                              item.isActive
                                ? "bg-accent-50 dark:bg-accent-200/10 text-accent dark:text-accent"
                                : "hover:bg-accent-50 dark:hover:bg-accent-200/10"
                            }`}
                          >
                            <Link href={item.url}>
                              <item.icon className={`size-5 ${item.isActive ? "text-accent dark:text-accent" : ""}`} />
                              <span className="font-medium">{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          {item.description}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />

          <SidebarGroup>
            <SidebarGroupLabel className="font-ui font-medium text-muted-foreground">
              Настройки
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={toggleTheme}
                    tooltip={isDarkMode ? "Светлая тема" : "Темная тема"}
                    className="hover:bg-secondary transition-all duration-200"
                  >
                    {isDarkMode ?
                      <Sun className="size-5 text-yellow-500" /> :
                      <Moon className="size-5 text-indigo-500" />
                    }
                    <span className="font-medium">{isDarkMode ? "Светлая тема" : "Темная тема"}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {user && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      tooltip="Настройки аккаунта"
                      className="hover:bg-secondary transition-all duration-200"
                    >
                      <Link href="/account">
                        <Settings className="size-5" />
                        <span className="font-medium">Настройки аккаунта</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Настройки интерфейса"
                    className="hover:bg-secondary transition-all duration-200"
                  >
                    <Link href="/ui-settings">
                      <Palette className="size-5" />
                      <span className="font-medium">Настройки интерфейса</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton
                      size="lg"
                      className="data-[state=open]:bg-primary-50 dark:data-[state=open]:bg-primary-200/10 hover:bg-primary-50 dark:hover:bg-primary-200/10 transition-all duration-200"
                    >
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt="User avatar"
                          className="size-8 rounded-full object-cover min-w-8 border-2 border-primary/20"
                        />
                      ) : (
                        <div className="size-8 min-w-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                          {user.displayName && !user.providerData?.[0]?.providerId?.includes('google')
                            ? user.displayName.split(' ').map(name => name[0]).join('').substring(0, 2).toUpperCase()
                            : user.email
                              ? user.email.substring(0, 2).toUpperCase()
                              : "??"}
                        </div>
                      )}
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold">
                          {user.displayName || "Пользователь"}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {user.email}
                        </span>
                      </div>
                      <ChevronUp className="ml-auto size-4" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-xl shadow-soft-lg border border-border/40"
                    side="bottom"
                    align="end"
                    sideOffset={4}
                  >
                    <DropdownMenuLabel className="p-0 font-normal">
                      <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                        {user.photoURL ? (
                          <img
                            src={user.photoURL}
                            alt="User avatar"
                            className="size-8 rounded-full object-cover min-w-8 border-2 border-primary/20"
                          />
                        ) : (
                          <div className="size-8 min-w-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                            {user.displayName && !user.providerData?.[0]?.providerId?.includes('google')
                              ? user.displayName.split(' ').map(name => name[0]).join('').substring(0, 2).toUpperCase()
                              : user.email
                                ? user.email.substring(0, 2).toUpperCase()
                                : "??"}
                          </div>
                        )}
                        <div className="grid flex-1 text-left text-sm leading-tight">
                          <span className="truncate font-semibold">
                            {user.displayName || "Пользователь"}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {user.email}
                          </span>
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild className="focus:bg-primary-50 dark:focus:bg-primary-200/10">
                      <Link href="/account" className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        Настройки аккаунта
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleSignOutClick}
                      className="text-red-500 dark:text-red-400 cursor-pointer focus:bg-red-50 dark:focus:bg-red-900/10"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Выйти
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <SidebarMenuButton
                  size="lg"
                  asChild
                  tooltip="Войти в аккаунт"
                  className="bg-gradient-to-r from-primary/10 to-accent/10 hover:from-primary/20 hover:to-accent/20 transition-all duration-300"
                >
                  <Link href="/auth">
                    <div className="size-8 min-w-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white">
                      <User className="size-4" />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">Войти</span>
                      <span className="truncate text-xs text-muted-foreground">В аккаунт</span>
                    </div>
                  </Link>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
    </>
  );
}
