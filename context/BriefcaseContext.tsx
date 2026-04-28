// context/BriefcaseContext.tsx
import React, { createContext, useState, useContext } from 'react';

// Define the shape of our context
interface BriefcaseContextType {
  savedArticles: any[];
  addArticle: (article: any) => void;
  removeArticle: (index: number) => void;
  clearBriefcase: () => void;
}

const BriefcaseContext = createContext<BriefcaseContextType | undefined>(undefined);

export const BriefcaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [savedArticles, setSavedArticles] = useState<any[]>([]);

  const addArticle = (article: any) => {
    // Prevent adding duplicates based on title (or URL if available)
    if (!savedArticles.some(saved => saved.title === article.title)) {
        setSavedArticles((prev) => [...prev, article]);
    }
  };

  const removeArticle = (index: number) => {
    setSavedArticles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearBriefcase = () => setSavedArticles([]);

  return (
    <BriefcaseContext.Provider value={{ savedArticles, addArticle, removeArticle, clearBriefcase }}>
      {children}
    </BriefcaseContext.Provider>
  );
};

export const useBriefcase = () => {
  const context = useContext(BriefcaseContext);
  if (context === undefined) {
    throw new Error('useBriefcase must be used within a BriefcaseProvider');
  }
  return context;
};