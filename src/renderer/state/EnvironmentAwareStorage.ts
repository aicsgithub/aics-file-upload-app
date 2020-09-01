import * as Store from "electron-store";
import { isNil, isPlainObject } from "lodash";
import * as hash from "object-hash";

import {
  DEFAULT_USERNAME,
  LIMS_HOST,
  LIMS_PORT,
  LIMS_PROTOCOL,
  USER_SETTINGS_KEY,
} from "../../shared/constants";
import { LocalStorage } from "../types";

/**
 * Wrapper for electron-store's default class. Scopes reads and writes to environmental settings using LIMS URL values
 * and username
 */
export class EnvironmentAwareStorage<T = any> extends Store<T>
  implements LocalStorage<T> {
  public protocol: string = LIMS_PROTOCOL;
  public host: string = LIMS_HOST;
  public port: string = LIMS_PORT;
  public user: string = DEFAULT_USERNAME;

  constructor(options?: Store.Options<T>) {
    super(options);
  }

  public set = <Key extends keyof T>(
    keyOrObject: Key | Partial<T>,
    value?: T[Key]
  ) => {
    if (isPlainObject(keyOrObject)) {
      const objectWithPrefixes: any = {};
      for (const [key, value] of Object.entries(keyOrObject)) {
        objectWithPrefixes[this.getPrefixedKey<Key>(key as Key)] = value;
      }
      super.set(objectWithPrefixes);
    } else if (
      !isNil(value) &&
      (typeof keyOrObject === "string" || typeof keyOrObject === "number")
    ) {
      const prefixedKey = this.getPrefixedKey<Key>(keyOrObject);
      super.set(prefixedKey, value);
    } else {
      throw new Error(
        "Expected first argument to be an object, string, or number."
      );
    }
  };

  public get = <Key extends keyof T>(
    key: Key,
    defaultValue?: T[Key]
  ): T[Key] => {
    if (defaultValue) {
      return super.get<Key>(this.getPrefixedKey<Key>(key), defaultValue);
    }
    return super.get<Key>(this.getPrefixedKey<Key>(key));
  };

  public delete = <Key extends keyof T>(key: Key): void => {
    super.delete<Key>(this.getPrefixedKey<Key>(key));
  };

  public has = <Key extends keyof T>(key: Key): boolean => {
    return super.has<Key>(this.getPrefixedKey(key));
  };

  public reset = <Key extends keyof T>(...keys: Key[]) => {
    super.reset<Key>(...keys.map((k: Key) => this.getPrefixedKey(k)));
  };

  private getPrefixedKey = <Key extends keyof T>(key: Key): Key =>
    `${key}`.startsWith(USER_SETTINGS_KEY)
      ? key
      : (`${this.prefix}.${key}` as Key);

  private get prefix() {
    return hash.MD5({
      host: this.host,
      port: this.port,
      protocol: this.protocol,
      user: this.user,
    });
  }
}

export default EnvironmentAwareStorage;
