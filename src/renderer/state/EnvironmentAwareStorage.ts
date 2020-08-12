import Store from "electron-store";
import * as hash from "object-hash";

import {
  DEFAULT_USERNAME,
  LIMS_HOST,
  LIMS_PORT,
  LIMS_PROTOCOL,
  USER_SETTINGS_KEY,
} from "../../shared/constants";
import { LocalStorage } from "../services/http-cache-client";

/**
 * Wrapper for electron-store's default class. Scopes reads and writes to environmental settings using LIMS URL values
 * and username
 */
class EnvironmentAwareStorage<T = any> extends Store<T>
  implements LocalStorage<T> {
  public protocol: string = LIMS_PROTOCOL;
  public host: string = LIMS_HOST;
  public port: string = LIMS_PORT;
  public user: string = DEFAULT_USERNAME;

  constructor(options?: Store.Options<T>) {
    super(options);
  }

  public set = <Key extends keyof T>(
    keyOrObject: Key | string | Partial<T>,
    value?: T[Key]
  ) => {
    if (typeof keyOrObject === "object") {
      const objectWithPrefixes: any = {};
      for (const [key, value] of Object.entries(keyOrObject)) {
        objectWithPrefixes[this.getPrefixedKey(key)] = value;
      }
      super.set(objectWithPrefixes);
    } else {
      const prefixedKey = this.getPrefixedKey<Key>(keyOrObject);
      if (typeof prefixedKey === "string") {
        super.set(prefixedKey, value);
      } else {
        super.set<Key>(prefixedKey, value as T[Key]);
      }
    }
  };

  public get = <Key extends keyof T, Default = T[Key]>(
    key: Key | string,
    defaultValue?: Default
  ): T[Key] | undefined | Default => {
    if (defaultValue) {
      return super.get<Key, Default>(
        this.getPrefixedKey<Key>(key),
        defaultValue
      );
    }
    return super.get<Key>(this.getPrefixedKey<Key>(`${key}`));
  };

  public delete = <Key extends keyof T>(key: Key): void => {
    super.delete<Key>(this.getPrefixedKey<Key>(key) as Key);
  };

  public has = <Key extends keyof T>(key: Key | string) => {
    return super.has<Key>(this.getPrefixedKey(key));
  };

  public reset = <Key extends keyof T>(...keys: Key[]) => {
    super.reset<Key>(...keys.map((k: Key) => this.getPrefixedKey(k) as Key));
  };

  private getPrefixedKey = <Key extends keyof T>(
    key: string | Key
  ): Key | string =>
    `${key}`.startsWith(USER_SETTINGS_KEY) ? key : `${this.prefix}.${key}`;

  private get prefix() {
    return hash.MD5({
      host: this.host,
      port: this.port,
      protocol: this.protocol,
      user: this.user,
    });
  }
}

// Ensure only one instance so that the environment only needs to get set on this instance
export default new EnvironmentAwareStorage();
