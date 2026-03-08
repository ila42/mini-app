// Minimal Telegram WebApp type declarations
interface TelegramWebAppCloudStorage {
  getItem(key: string, callback: (err: string | null, value: string) => void): void
  setItem(key: string, value: string, callback?: (err: string | null, stored: boolean) => void): void
  removeItem(key: string, callback?: (err: string | null, removed: boolean) => void): void
  getItems(keys: string[], callback: (err: string | null, values: Record<string, string>) => void): void
}

interface TelegramWebApp {
  ready(): void
  expand(): void
  close(): void
  CloudStorage: TelegramWebAppCloudStorage
  themeParams: {
    bg_color?: string
    text_color?: string
    hint_color?: string
    link_color?: string
    button_color?: string
    button_text_color?: string
    secondary_bg_color?: string
  }
  colorScheme: 'light' | 'dark'
  BackButton: {
    show(): void
    hide(): void
    onClick(fn: () => void): void
    offClick(fn: () => void): void
    isVisible: boolean
  }
}

interface Window {
  Telegram?: {
    WebApp: TelegramWebApp
  }
}
