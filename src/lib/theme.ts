export const THEME_STORAGE_KEY = "sb-theme";

// Runs in <head> before the page paints, so a saved light theme doesn't flash dark first.
export const THEME_INIT_SCRIPT = `try{if(localStorage.getItem("${THEME_STORAGE_KEY}")==="light")document.documentElement.dataset.theme="light"}catch(e){}`;
