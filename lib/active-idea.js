const STORAGE_KEY = 'ite-active-idea';
export const ACTIVE_IDEA_EVENT = 'ite-active-idea-change';

export function getActiveIdea() {
  return typeof window === 'undefined' ? null : window.localStorage.getItem(STORAGE_KEY);
}

export function setActiveIdea(id) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, id);
  window.dispatchEvent(new Event(ACTIVE_IDEA_EVENT));
}

export function clearActiveIdea(id) {
  if (typeof window === 'undefined' || (id && getActiveIdea() !== id)) return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(ACTIVE_IDEA_EVENT));
}
