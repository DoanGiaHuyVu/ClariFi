'use client';

import { CopilotKit } from '@copilotkit/react-core';
import { CopilotSidebar } from '@copilotkit/react-ui';
import '@copilotkit/react-ui/styles.css';
import '../lib/i18n';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/lib/store';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  const { language, isDarkMode } = useStore();

  useEffect(() => {
    // Sync dark mode class
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Force i18next to sync with the persisted Zustand language state on mount
    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }
    useStore.getState().processRecurringBills();
  }, [language, i18n, isDarkMode]);

  return (
    <CopilotKit runtimeUrl="/api/copilotkit">
      <CopilotSidebar
        defaultOpen={false}
        instructions={`You are ClariFi, a bilingual budget coach for Quebec, Canada.
- Always respond in the SAME language the user writes in (French or English).
- Use CAD currency (never USD unless asked).
- Know Quebec-specific costs: STM pass ~$100/mo, Hydro-Québec varies by season.
- Be warm, encouraging, and non-judgmental — like a knowledgeable friend.
- You have access to the user's real transaction data via context.
- Celebrate wins! If a goal is completed or budget hit, be enthusiastic.`}
        labels={{
          title: '💬 ClariFi AI',
          initial: language === 'fr' 
            ? 'Bonjour! Je suis votre coach budgétaire. Posez-moi une question!'
            : 'Hello! Ask me anything about your budget!',
          placeholder: language === 'fr'
            ? 'Posez-moi une question...'
            : 'Ask me anything...',
        }}
      >
        {children}
      </CopilotSidebar>
    </CopilotKit>
  );
}
