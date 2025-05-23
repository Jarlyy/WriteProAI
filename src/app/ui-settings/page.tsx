"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Palette, Monitor, Moon, Sun, Type, Layout, Sidebar, Maximize, Minimize } from "lucide-react";

export default function UISettingsPage() {
  // Состояния для настроек интерфейса
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [fontSize, setFontSize] = useState(16);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [highContrastMode, setHighContrastMode] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  const [fontFamily, setFontFamily] = useState("inter");
  const [borderRadius, setBorderRadius] = useState(8);

  // Загрузка настроек при монтировании компонента
  useEffect(() => {
    // Определяем текущую тему
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      setTheme("dark");
    } else if (savedTheme === "light") {
      setTheme("light");
    } else {
      setTheme("system");
    }

    // Загружаем другие настройки из localStorage
    const savedFontSize = localStorage.getItem("fontSize");
    if (savedFontSize) setFontSize(parseInt(savedFontSize));

    const savedAnimations = localStorage.getItem("animationsEnabled");
    if (savedAnimations) setAnimationsEnabled(savedAnimations === "true");

    const savedHighContrast = localStorage.getItem("highContrastMode");
    if (savedHighContrast) setHighContrastMode(savedHighContrast === "true");

    const savedCompactMode = localStorage.getItem("compactMode");
    if (savedCompactMode) setCompactMode(savedCompactMode === "true");

    const savedFontFamily = localStorage.getItem("fontFamily");
    if (savedFontFamily) setFontFamily(savedFontFamily);

    const savedBorderRadius = localStorage.getItem("borderRadius");
    if (savedBorderRadius) setBorderRadius(parseInt(savedBorderRadius));
  }, []);

  // Обработчики изменения настроек
  const handleThemeChange = (value: "light" | "dark" | "system") => {
    setTheme(value);

    if (value === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else if (value === "light") {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    } else {
      // Системная тема
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      localStorage.removeItem("theme");
    }
  };

  const handleFontSizeChange = (value: number[]) => {
    const newSize = value[0];
    setFontSize(newSize);
    localStorage.setItem("fontSize", newSize.toString());
    document.documentElement.style.fontSize = `${newSize}px`;
  };

  const handleAnimationsToggle = (checked: boolean) => {
    setAnimationsEnabled(checked);
    localStorage.setItem("animationsEnabled", checked.toString());
    if (!checked) {
      document.documentElement.classList.add("reduce-motion");
    } else {
      document.documentElement.classList.remove("reduce-motion");
    }
  };

  const handleHighContrastToggle = (checked: boolean) => {
    setHighContrastMode(checked);
    localStorage.setItem("highContrastMode", checked.toString());
    if (checked) {
      document.documentElement.classList.add("high-contrast");
    } else {
      document.documentElement.classList.remove("high-contrast");
    }
  };

  const handleCompactModeToggle = (checked: boolean) => {
    setCompactMode(checked);
    localStorage.setItem("compactMode", checked.toString());
    if (checked) {
      document.documentElement.classList.add("compact-mode");
    } else {
      document.documentElement.classList.remove("compact-mode");
    }
  };

  const handleFontFamilyChange = (value: string) => {
    setFontFamily(value);
    localStorage.setItem("fontFamily", value);

    if (value === "inter") {
      document.documentElement.style.setProperty("--font-primary", "var(--font-inter)");
    } else if (value === "montserrat") {
      document.documentElement.style.setProperty("--font-primary", "var(--font-montserrat)");
    } else if (value === "roboto") {
      document.documentElement.style.setProperty("--font-primary", "var(--font-roboto)");
    }
  };

  const handleBorderRadiusChange = (value: number[]) => {
    const newRadius = value[0];
    setBorderRadius(newRadius);
    localStorage.setItem("borderRadius", newRadius.toString());
    document.documentElement.style.setProperty("--radius", `${newRadius}px`);
  };

  // Сброс всех настроек
  const resetAllSettings = () => {
    // Сбрасываем тему
    handleThemeChange("system");

    // Сбрасываем размер шрифта
    handleFontSizeChange([16]);

    // Сбрасываем анимации
    handleAnimationsToggle(true);

    // Сбрасываем высокий контраст
    handleHighContrastToggle(false);

    // Сбрасываем компактный режим
    handleCompactModeToggle(false);

    // Сбрасываем шрифт
    handleFontFamilyChange("inter");

    // Сбрасываем радиус скругления
    handleBorderRadiusChange([8]);

    // Удаляем все настройки из localStorage
    localStorage.removeItem("fontSize");
    localStorage.removeItem("animationsEnabled");
    localStorage.removeItem("highContrastMode");
    localStorage.removeItem("compactMode");
    localStorage.removeItem("fontFamily");
    localStorage.removeItem("borderRadius");
  };

  return (
    <AppLayout
      title="Настройки интерфейса"
      breadcrumbs={[
        { label: "Главная", href: "/" },
        { label: "Настройки интерфейса" }
      ]}
    >
      <div className="container-md">
        <div className="mb-8 animate-fade-in">
          <h1 className="heading-xl mb-2">Настройки интерфейса</h1>
          <p className="text-muted-foreground">Настройте внешний вид приложения под свои предпочтения</p>
        </div>

        <Tabs defaultValue="appearance" className="space-y-6">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              <span>Внешний вид</span>
            </TabsTrigger>
            <TabsTrigger value="text" className="flex items-center gap-2">
              <Type className="h-4 w-4" />
              <span>Текст</span>
            </TabsTrigger>
            <TabsTrigger value="layout" className="flex items-center gap-2">
              <Layout className="h-4 w-4" />
              <span>Макет</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="appearance" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Тема</h2>

              <RadioGroup value={theme} onValueChange={(value) => handleThemeChange(value as "light" | "dark" | "system")} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="light" id="theme-light" className="mt-1" />
                  <div className="grid gap-1.5">
                    <Label htmlFor="theme-light" className="font-medium flex items-center gap-2">
                      <Sun className="h-4 w-4 text-yellow-500" />
                      Светлая
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Светлая тема для использования днем
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="dark" id="theme-dark" className="mt-1" />
                  <div className="grid gap-1.5">
                    <Label htmlFor="theme-dark" className="font-medium flex items-center gap-2">
                      <Moon className="h-4 w-4 text-indigo-500" />
                      Темная
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Темная тема для использования ночью
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="system" id="theme-system" className="mt-1" />
                  <div className="grid gap-1.5">
                    <Label htmlFor="theme-system" className="font-medium flex items-center gap-2">
                      <Monitor className="h-4 w-4 text-blue-500" />
                      Системная
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Следовать настройкам системы
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Дополнительные настройки</h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="high-contrast" className="font-medium">Высокий контраст</Label>
                    <p className="text-sm text-muted-foreground">Увеличивает контрастность элементов интерфейса</p>
                  </div>
                  <Switch
                    id="high-contrast"
                    checked={highContrastMode}
                    onCheckedChange={handleHighContrastToggle}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="animations" className="font-medium">Анимации</Label>
                    <p className="text-sm text-muted-foreground">Включает анимации переходов и эффекты</p>
                  </div>
                  <Switch
                    id="animations"
                    checked={animationsEnabled}
                    onCheckedChange={handleAnimationsToggle}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="border-radius" className="font-medium">Скругление углов</Label>
                    <span className="text-sm text-muted-foreground">{borderRadius}px</span>
                  </div>
                  <Slider
                    id="border-radius"
                    min={0}
                    max={20}
                    step={1}
                    value={[borderRadius]}
                    onValueChange={handleBorderRadiusChange}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Квадратные</span>
                    <span>Скругленные</span>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="text" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Шрифт</h2>

              <RadioGroup value={fontFamily} onValueChange={handleFontFamilyChange} className="grid grid-cols-1 gap-4">
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="inter" id="font-inter" className="mt-1" />
                  <div className="grid gap-1.5">
                    <Label htmlFor="font-inter" className="font-medium">Inter</Label>
                    <p className="text-sm text-muted-foreground font-sans">
                      Современный шрифт с хорошей читаемостью
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="montserrat" id="font-montserrat" className="mt-1" />
                  <div className="grid gap-1.5">
                    <Label htmlFor="font-montserrat" className="font-medium">Montserrat</Label>
                    <p className="text-sm text-muted-foreground font-heading">
                      Элегантный шрифт с геометрическими формами
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="roboto" id="font-roboto" className="mt-1" />
                  <div className="grid gap-1.5">
                    <Label htmlFor="font-roboto" className="font-medium">Roboto</Label>
                    <p className="text-sm text-muted-foreground font-ui">
                      Универсальный шрифт для интерфейсов
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Размер текста</h2>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="font-size" className="font-medium">Размер шрифта</Label>
                  <span className="text-sm text-muted-foreground">{fontSize}px</span>
                </div>
                <Slider
                  id="font-size"
                  min={12}
                  max={20}
                  step={1}
                  value={[fontSize]}
                  onValueChange={handleFontSizeChange}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Маленький</span>
                  <span>Большой</span>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="layout" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Макет интерфейса</h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="compact-mode" className="font-medium">Компактный режим</Label>
                    <p className="text-sm text-muted-foreground">Уменьшает размеры элементов интерфейса</p>
                  </div>
                  <Switch
                    id="compact-mode"
                    checked={compactMode}
                    onCheckedChange={handleCompactModeToggle}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="sidebar-collapsed" className="font-medium">Боковая панель</Label>
                    <p className="text-sm text-muted-foreground">Состояние боковой панели по умолчанию</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={sidebarCollapsed ? "outline" : "default"}
                      size="sm"
                      onClick={() => setSidebarCollapsed(false)}
                      className="flex items-center gap-1"
                    >
                      <Maximize className="h-3.5 w-3.5" />
                      <span>Развернута</span>
                    </Button>
                    <Button
                      variant={sidebarCollapsed ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSidebarCollapsed(true)}
                      className="flex items-center gap-1"
                    >
                      <Minimize className="h-3.5 w-3.5" />
                      <span>Свернута</span>
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-8 flex justify-end">
          <Button variant="outline" onClick={resetAllSettings}>
            Сбросить все настройки
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
