"use client";

import { useState } from "react";
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
  MoreHorizontal
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
    },
    {
      title: "Избранное",
      url: "/saved-texts",
      icon: FileText,
      isActive: pathname === "/saved-texts" || pathname.startsWith("/saved-texts/"),
    },
    {
      title: "История",
      url: "/check-history",
      icon: Clock,
      isActive: pathname === "/check-history" || pathname.startsWith("/check-history/"),
    },
    {
      title: "Словарь",
      url: "/dictionary",
      icon: BookOpen,
      isActive: pathname === "/dictionary",
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
              >
                <Link href="/">
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold text-blue-600 dark:text-blue-400">WriteProAI</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Навигация</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigationItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={item.isActive}
                      tooltip={item.title}
                    >
                      <Link href={item.url}>
                        <item.icon className="size-5" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Настройки</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={toggleTheme}
                    tooltip={isDarkMode ? "Светлая тема" : "Темная тема"}
                  >
                    {isDarkMode ? <Sun className="size-5" /> : <Moon className="size-5" />}
                    <span>{isDarkMode ? "Светлая тема" : "Темная тема"}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {user && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      tooltip="Настройки аккаунта"
                    >
                      <Link href="/account">
                        <Settings className="size-5" />
                        <span>Настройки аккаунта</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
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
                      className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                    >
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt="User avatar"
                          className="size-8 rounded-full object-cover min-w-8"
                        />
                      ) : (
                        <div className="size-8 min-w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-sm">
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
                        <span className="truncate text-xs">
                          {user.email}
                        </span>
                      </div>
                      <ChevronUp className="ml-auto size-4" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
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
                            className="size-8 rounded-full object-cover min-w-8"
                          />
                        ) : (
                          <div className="size-8 min-w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-sm">
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
                          <span className="truncate text-xs">
                            {user.email}
                          </span>
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/account" className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        Настройки аккаунта
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleSignOutClick}
                      className="text-red-500 dark:text-red-400 cursor-pointer"
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
                >
                  <Link href="/auth">
                    <User className="size-8 min-w-8" />
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">Войти</span>
                      <span className="truncate text-xs">В аккаунт</span>
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
