import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { storage } from '@/lib/storage';
import { EventEmitter } from '@/lib/events';

type Language = 'en' | 'hi';
const LANGUAGE_STORAGE_KEY = 'preferredLanguage';

interface Translations {
  [key: string]: {
    en: string;
    hi: string;
  };
}

const translations: Translations = {
  // Onboarding
  'onboarding.step1.title': {
    en: 'Binge-proof your NEET prep',
    hi: 'अपनी NEET तैयारी को बिंज-प्रूफ करें',
  },
  'onboarding.step1.desc': {
    en: 'Our Viral Reels Shield blocks distractions and keeps you focused on what matters.',
    hi: 'हमारा वायरल रील्स शील्ड विचलन को रोकता है और आपको जो मायने रखता है उस पर केंद्रित रखता है।',
  },
  'onboarding.step2.title': {
    en: 'AI finds your weak spots',
    hi: 'AI आपकी कमजोरियां खोजता है',
  },
  'onboarding.step2.desc': {
    en: "Upload any mock test. Our AI maps exactly where you're losing marks.",
    hi: 'कोई भी मॉक टेस्ट अपलोड करें। हमारा AI ठीक वहीं मैप करता है जहां आप अंक खो रहे हैं।',
  },
  'onboarding.step3.title': {
    en: 'NCERT at your fingertips',
    hi: 'NCERT आपकी उंगलियों पर',
  },
  'onboarding.step3.desc': {
    en: 'Search any concept. Get exact line references with spaced repetition quizzes.',
    hi: 'कोई भी अवधारणा खोजें। स्पेस्ड रिपिटिशन क्विज़ के साथ सटीक लाइन संदर्भ प्राप्त करें।',
  },
  'onboarding.startFree': {
    en: 'Start Free',
    hi: 'मुफ्त शुरू करें',
  },
  'onboarding.proPlan': {
    en: 'Pro ₹149/mo - Unlimited Everything',
    hi: 'प्रो ₹149/माह - असीमित सब कुछ',
  },
  // Dashboard
  'dashboard.shield': {
    en: 'Viral Reels Shield',
    hi: 'वायरल रील्स शील्ड',
  },
  'dashboard.pause': {
    en: 'Pause 5 min',
    hi: '5 मिनट रुकें',
  },
  'dashboard.streak': {
    en: 'Day Streak',
    hi: 'दिन की स्ट्रीक',
  },
  'dashboard.score': {
    en: 'Score',
    hi: 'स्कोर',
  },
  'dashboard.currentTopic': {
    en: 'Current Gap',
    hi: 'वर्तमान गैप',
  },
  'dashboard.startQuiz': {
    en: 'Start',
    hi: 'शुरू करें',
  },
  'dashboard.uploadMock': {
    en: 'Upload Mock',
    hi: 'मॉक अपलोड करें',
  },
  'dashboard.ncert': {
    en: 'NCERT',
    hi: 'NCERT',
  },
  // Quiz
  'quiz.next': {
    en: 'Next',
    hi: 'अगला',
  },
  'quiz.explain': {
    en: 'Explain',
    hi: 'व्याख्या',
  },
  'quiz.correct': {
    en: 'Correct!',
    hi: 'सही!',
  },
  'quiz.incorrect': {
    en: 'Incorrect',
    hi: 'गलत',
  },
  'quiz.streakUp': {
    en: '+1 Streak!',
    hi: '+1 स्ट्रीक!',
  },
  // Mock Analyzer
  'mock.title': {
    en: 'Mock Analyzer',
    hi: 'मॉक विश्लेषक',
  },
  'mock.upload': {
    en: 'Upload PDF',
    hi: 'PDF अपलोड करें',
  },
  'mock.weaknesses': {
    en: 'Weakness Map',
    hi: 'कमजोरी मैप',
  },
  'mock.rank': {
    en: 'Predicted Rank',
    hi: 'अनुमानित रैंक',
  },
  'mock.dailyFix': {
    en: 'Daily Fix Plan',
    hi: 'दैनिक सुधार योजना',
  },
  'mock.retryWeak': {
    en: 'Retry Weak Chapters',
    hi: 'कमजोर अध्याय दोहराएं',
  },
  // NCERT Search
  'ncert.title': {
    en: 'NCERT Search',
    hi: 'NCERT खोज',
  },
  'ncert.placeholder': {
    en: 'Search any concept...',
    hi: 'कोई भी अवधारणा खोजें...',
  },
  'ncert.spacedQuizzes': {
    en: '5 Spaced Quizzes',
    hi: '5 स्पेस्ड क्विज़',
  },
  'ncert.notes': {
    en: 'Notes',
    hi: 'नोट्स',
  },
  'ncert.tomorrow': {
    en: 'Tomorrow 9AM',
    hi: 'कल सुबह 9 बजे',
  },
  // Navigation
  'nav.home': {
    en: 'Home',
    hi: 'होम',
  },
  'nav.quiz': {
    en: 'Quiz',
    hi: 'क्विज़',
  },
  'nav.profile': {
    en: 'Profile',
    hi: 'प्रोफाइल',
  },
  'nav.revision': {
    en: 'Revise',
    hi: 'दोहराएं',
  },
  // Revision
  'revision.title': {
    en: 'NEURONZ Spaced Revision',
    hi: 'NEURONZ स्पेस्ड रिविजन',
  },
  'revision.dueToday': {
    en: 'Due Today',
    hi: 'आज बाकी',
  },
  'revision.mastered': {
    en: 'Mastered',
    hi: 'माहिर',
  },
  'revision.avgLevel': {
    en: 'Avg Level',
    hi: 'औसत स्तर',
  },
  'revision.dailyLimit': {
    en: 'Daily Limit',
    hi: 'दैनिक सीमा',
  },
  'revision.levelUp': {
    en: 'Level Up!',
    hi: 'लेवल अप!',
  },
  'revision.levelDown': {
    en: 'Level Down',
    hi: 'लेवल डाउन',
  },
  'revision.allCaughtUp': {
    en: 'All caught up!',
    hi: 'सब हो गया!',
  },
  // Profile
  'profile.title': {
    en: 'Profile',
    hi: 'प्रोफाइल',
  },
  'profile.language': {
    en: 'Language',
    hi: 'भाषा',
  },
  'profile.stats': {
    en: 'Your Stats',
    hi: 'आपके आंकड़े',
  },
  'profile.quizzesCompleted': {
    en: 'Quizzes Completed',
    hi: 'पूर्ण क्विज़',
  },
  'profile.accuracy': {
    en: 'Accuracy',
    hi: 'सटीकता',
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    storage.getString(LANGUAGE_STORAGE_KEY).then((stored) => {
      if (stored === 'hi') setLanguageState('hi');
    });

    const unsub = EventEmitter.on('preferred-language-changed', () => {
      storage.getString(LANGUAGE_STORAGE_KEY).then((stored) => {
        if (stored === 'en' || stored === 'hi') {
          setLanguageState(stored);
        }
      });
    });

    return unsub;
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    storage.setString(LANGUAGE_STORAGE_KEY, lang);
    EventEmitter.emit('preferred-language-changed');
  };

  const t = (key: string): string => {
    return translations[key]?.[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
