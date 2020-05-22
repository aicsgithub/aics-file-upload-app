import axios from "axios";

import { LocalStorage } from "../../state/types";
import HttpCacheClient from "../http-cache-client";

export default abstract class BaseServiceClient {
  protected httpClient: HttpCacheClient;
  private protocolPrivate: string;
  private hostPrivate: string;
  private portPrivate: string;
  private readonly localStorage: LocalStorage;

  public get protocol() {
    return this.protocolPrivate;
  }

  public set protocol(protocol: string) {
    this.protocolPrivate = protocol;
    this.httpClient = this.createHttpClient();
  }

  public get host() {
    return this.hostPrivate;
  }

  public set host(host: string) {
    this.hostPrivate = host;
    this.httpClient = this.createHttpClient();
  }

  public get port() {
    return this.portPrivate;
  }

  public set port(port: string) {
    this.portPrivate = port;
    this.httpClient = this.createHttpClient();
  }

  protected constructor({
    host,
    localStorage,
    port,
    protocol,
  }: {
    host: string;
    localStorage: LocalStorage;
    port: string;
    protocol: string;
  }) {
    this.protocolPrivate = protocol;
    this.hostPrivate = host;
    this.portPrivate = port;
    this.localStorage = localStorage;
    this.httpClient = this.createHttpClient();
  }

  protected abstract get baseURL(): string;

  private createHttpClient = (): HttpCacheClient => {
    return new HttpCacheClient(
      axios.create({
        baseURL: this.baseURL,
      }),
      Boolean(process.env.ELECTRON_WEBPACK_USE_CACHE) || false,
      this.localStorage
    );
  };
}
