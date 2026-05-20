import { createContext, useContext, useState, ReactNode } from 'react';

export type RegisterData = {
  phone_number?: string;
  real_name?: string;
  age?: number;
  birth_date?: string;
  village_id?: string;
  nickname?: string;
  email?: string;
  password?: string;
  avatar_color?: string;
  avatar_type?: number;
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