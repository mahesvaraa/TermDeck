import { ru, type I18nDict } from './ru'
import { en } from './en'
import { useSettingsStore, type SupportedLanguage } from '../stores/settings-store'

export const dictionaries: Record<SupportedLanguage, I18nDict> = {
  ru,
  en
}

export function useTranslation(): {
  t: I18nDict
  lang: SupportedLanguage
  setLanguage: (lang: SupportedLanguage) => void
} {
  const lang = useSettingsStore((s) => s.language)
  const setLanguage = useSettingsStore((s) => s.setLanguage)
  const t = dictionaries[lang] || ru

  return { t, lang, setLanguage }
}

export { ru, en, type I18nDict }
