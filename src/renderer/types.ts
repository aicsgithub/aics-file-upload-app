export interface LocalStorage<T = any> {
  clear: () => void;
  delete: <Key extends keyof T>(key: Key) => void;
  get: <Key extends keyof T>(key: Key, defaultValue?: T[Key]) => any;
  has: <Key extends keyof T>(key: Key) => boolean;
  reset: <Key extends keyof T>(...keys: Key[]) => void;
  set: <Key extends keyof T>(
    keyOrObject: Key | Partial<T>,
    value?: T[Key]
  ) => void;
}
