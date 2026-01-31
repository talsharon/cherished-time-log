import { createContext, useContext, ReactNode } from 'react';
import { useTitles, Title } from '@/hooks/useTitles';

interface TitlesContextType {
  titles: Title[];
  loading: boolean;
  createTitle: (name: string, color?: string) => Promise<Title | null>;
  updateTitleColor: (id: string, color: string) => Promise<void>;
  getColorForTitle: (titleName: string) => string;
  refetch: () => Promise<void>;
}

const TitlesContext = createContext<TitlesContextType | undefined>(undefined);

export function TitlesProvider({ children }: { children: ReactNode }) {
  const titlesData = useTitles();

  return (
    <TitlesContext.Provider value={titlesData}>
      {children}
    </TitlesContext.Provider>
  );
}

export function useTitlesContext() {
  const context = useContext(TitlesContext);
  if (context === undefined) {
    throw new Error('useTitlesContext must be used within a TitlesProvider');
  }
  return context;
}
