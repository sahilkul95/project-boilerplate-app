import { AppStore } from './store';

//This is an extra layer over store.js which can handle special cases like
//returning empty nested objects in some cases

export function getItem(key) {
  let value = AppStore.get(key.toString());
  return value;
}

export function setItem(key, value) {
  AppStore.set(key, value);
}

export function removeItem(key) {
  AppStore.remove(key);
}

export function removeAll() {
  AppStore.removeAll();
}
