export class AppStore {
  static get(key) {
    return JSON.parse(window.localStorage.getItem(key) || '{}');
  }
  static set(key, value) {
    window.localStorage.setItem(key, JSON.stringify(value));
  }
  static remove(key) {
    window.localStorage && window.localStorage.removeItem(key);
  }
  static removeAll() {
    window.localStorage && window.localStorage.clear();
  }
}
