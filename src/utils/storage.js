export const AI_KEY_STORAGE = "WEALTH_PRO_AI_KEY";

export const getStoredKey = () => localStorage.getItem(AI_KEY_STORAGE);
export const setStoredKey = (key) => localStorage.setItem(AI_KEY_STORAGE, key);
export const removeStoredKey = () => localStorage.removeItem(AI_KEY_STORAGE);
