// Utilitaires de debug simplifiés
export const devLog = (...args: any[]) => { 
  if (import.meta.env?.DEV) console.log(...args); 
};

export const trace = devLog;