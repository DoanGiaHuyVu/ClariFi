'use client';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const { language, setLanguage } = useStore();

  const toggle = () => {
    const next = language === 'fr' ? 'en' : 'fr';
    setLanguage(next);
    i18n.changeLanguage(next);
  };

  return (
    <Button variant="outline" size="sm" onClick={toggle} className="font-semibold">
      {language === 'fr' ? '🇫🇷 FR' : '🇬🇧 EN'}
    </Button>
  );
}