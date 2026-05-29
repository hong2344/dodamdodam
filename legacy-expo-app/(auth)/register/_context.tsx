import { createContext, useContext, useState, ReactNode } from 'react';

export type RegisterData = {
  email?: string;
  password?: string;
  birth_date?: string;
  age?: number;
  nickname?: string;
  match_category?: string;
};

type RegisterContextType = {
  data: RegisterData;
  update: (partial: Partial<RegisterData>) => void;
  reset: () => void;
};

const RegisterContext = createContext<RegisterContextType | null>(null);

export function RegisterProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<RegisterData>({});

  function update(partial: Partial<RegisterData>) {
    setData((prev) => ({ ...prev, ...partial }));
  }

  function reset() {
    setData({});
  }

  return (
    <RegisterContext.Provider value={{ data, update, reset }}>
      {children}
    </RegisterContext.Provider>
  );
}

export function useRegister() {
  const ctx = useContext(RegisterContext);
  if (!ctx) throw new Error('useRegister must be used inside RegisterProvider');
  return ctx;
}
