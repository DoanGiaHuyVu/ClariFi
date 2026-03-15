import i18n from 'i18next';
import en from './locales/en.json';
import fr from './locales/fr.json';

i18n.init({
  resources: {
    en: { translation: en },
    fr: { translation: fr }
  },
  lng: 'fr',
  fallbackLng: 'fr'
}, () => {
  console.log("fr lang:", i18n.t('app.tagline', { lng: 'fr' }));
  console.log("en lang:", i18n.t('app.tagline', { lng: 'en' }));
  console.log("default lang:", i18n.language);
  console.log("default t:", i18n.t('app.tagline'));
});
