// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { OCPPVersion } from '@citrineos/base';
import { UnsuccessfulRequestException } from '@lib/exceptions/UnsuccessfulRequestException';
import { authProvider } from '@lib/providers/auth-provider';
import { incrementRequestCount } from '@lib/utils/telemetry';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import axios from 'axios';
import config from './config';

const CSMS_API_URL = (config.csmsApiUrl || '').replace(/\/$/, '');

/**
 * Map legacy CitrineOS Core command paths to CSMS station routes.
 * Input examples:
 *   /configuration/reset?identifier=STATION&tenantId=1
 *   /evdriver/remoteStartTransaction?identifier=STATION&tenantId=1
 */
export function mapCoreCommandPathToCsms(url: string): string {
  const [rawPath, query = ''] = url.split('?');
  const params = new URLSearchParams(query);
  const stationId =
    params.get('identifier') ||
    params.get('stationId') ||
    params.get('id') ||
    '';

  const path = rawPath.replace(/^\//, '');

  const evDriverMap: Record<string, string> = {
    'evdriver/requestStartTransaction': 'remote-start',
    'evdriver/remoteStartTransaction': 'remote-start',
    'evdriver/requestStopTransaction': 'remote-stop',
    'evdriver/remoteStopTransaction': 'remote-stop',
    'evdriver/unlockConnector': 'unlock-connector',
    'evdriver/clearCache': 'clear-cache',
  };

  const configurationMap: Record<string, string> = {
    'configuration/reset': 'reset',
    'configuration/changeAvailability': 'change-availability',
    'configuration/triggerMessage': 'trigger-message',
    'configuration/updateFirmware': 'update-firmware',
    'configuration/getConfiguration': 'get-configuration',
    'configuration/changeConfiguration': 'change-configuration',
    'configuration/setNetworkProfile': 'set-network-profile',
    'configuration/password': 'password',
    'configuration/dataTransfer': 'data-transfer',
  };

  if (path in evDriverMap && stationId) {
    return `/stations/${encodeURIComponent(stationId)}/ev-driver/${evDriverMap[path]}`;
  }
  if (path in configurationMap && stationId) {
    return `/stations/${encodeURIComponent(stationId)}/configuration/${configurationMap[path]}`;
  }
  if (path === 'configuration/serverNetworkProfile' && stationId) {
    return `/stations/${encodeURIComponent(stationId)}/configuration/network-profiles`;
  }
  if (path === 'configuration/password') {
    // Body carries stationId for password updates in some modals.
    return stationId
      ? `/stations/${encodeURIComponent(stationId)}/configuration/password`
      : url;
  }

  // Unsupported Core-only paths (ocpprouter, etc.) — leave as-is so callers surface the error.
  return url.startsWith('/') ? url : `/${url}`;
}

export class MissingRequiredParamException extends Error {
  override name = 'MissingRequiredParamException' as const;

  constructor(
    public field: string,
    msg?: string,
  ) {
    super(msg);
  }
}

export class BaseRestClient {
  private axiosInstance: AxiosInstance;
  private _baseUrl: string;

  constructor(_ocppVersion: OCPPVersion | null = OCPPVersion.OCPP2_0_1) {
    // ADAPTER-0006: all command egress goes through CSMS (OCPP version no longer selects Core base URL).
    this._baseUrl = CSMS_API_URL;
    this.axiosInstance = this.createAxiosInstance();
  }

  get baseUrl(): string {
    return this._baseUrl;
  }

  set baseUrl(value: string) {
    this._baseUrl = value;
    this.axiosInstance = this.createAxiosInstance();
  }

  async optionsRaw<T>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.axiosInstance.options<T>(mapCoreCommandPathToCsms(url), config!);
  }

  async options<T>(path: string, config: AxiosRequestConfig): Promise<T> {
    return this.optionsRaw<T>(path, config).then((response) =>
      this.handleResponse<T>(response),
    );
  }

  async getRaw<T>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    const mapped = mapCoreCommandPathToCsms(url);
    incrementRequestCount({ url: mapped });
    return this.axiosInstance.get<T>(mapped, config!);
  }

  async get<T>(path: string, config: AxiosRequestConfig): Promise<T> {
    incrementRequestCount({ path: path });
    return this.getRaw<T>(path, config).then((response) =>
      this.handleResponse<T>(response),
    );
  }

  async delRaw<T>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    const mapped = mapCoreCommandPathToCsms(url);
    incrementRequestCount({ url: mapped });
    return this.axiosInstance.delete<T>(mapped, config!);
  }

  async del<T>(path: string, config: AxiosRequestConfig): Promise<T> {
    incrementRequestCount({ path: path });
    return this.delRaw<T>(path, config).then((response) =>
      this.handleResponse<T>(response),
    );
  }

  async postRaw<T>(
    url: string,
    body: any,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    const mapped = mapCoreCommandPathToCsms(url);
    incrementRequestCount({ url: mapped });
    return this.axiosInstance.post<T>(mapped, body, config!);
  }

  async post<T>(
    path: string,
    config: AxiosRequestConfig,
    body: any,
  ): Promise<T> {
    incrementRequestCount({ path: path });
    return this.postRaw<T>(path, body, config).then((response) =>
      this.handleResponse<T>(response),
    );
  }

  async patchRaw<T>(
    url: string,
    body: any,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    const mapped = mapCoreCommandPathToCsms(url);
    incrementRequestCount({ url: mapped });
    return this.axiosInstance.patch<T>(mapped, body, config!);
  }

  async patch<T>(
    path: string,
    config: AxiosRequestConfig,
    body: any,
  ): Promise<T> {
    incrementRequestCount({ path: path });
    return this.patchRaw<T>(path, body, config).then((response) =>
      this.handleResponse<T>(response),
    );
  }

  async putRaw<T>(
    url: string,
    body: any,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    const mapped = mapCoreCommandPathToCsms(url);
    incrementRequestCount({ url: mapped });
    return this.axiosInstance.put<T>(mapped, body, config!);
  }

  async put<T>(
    path: string,
    config: AxiosRequestConfig,
    body: any,
  ): Promise<T> {
    incrementRequestCount({ path: path });
    return this.putRaw<T>(path, body, config).then((response) =>
      this.handleResponse<T>(response),
    );
  }

  protected handleResponse<T>(response: AxiosResponse<T>): T {
    if (response.status >= 200 && response.status <= 299) {
      return response.data as T;
    } else {
      throw new UnsuccessfulRequestException(
        'Request did not return a successful status code',
        response,
      );
    }
  }

  private createAxiosInstance(): AxiosInstance {
    const axiosInstance = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    axiosInstance.interceptors.request.use(
      async (req) => {
        const token = await authProvider.getToken();
        if (token) {
          req.headers = req.headers || {};
          req.headers.Authorization = `Bearer ${token}`;
        } else {
          console.warn('No token found, request may not be authenticated.');
        }
        if (!req.headers['X-Idempotency-Key']) {
          req.headers['X-Idempotency-Key'] =
            typeof crypto !== 'undefined' && 'randomUUID' in crypto
              ? crypto.randomUUID()
              : `cmd-${Date.now()}`;
        }
        return req;
      },
      (error) => {
        console.error('Error in request interceptor:', error);
        return Promise.reject(error);
      },
    );

    return axiosInstance;
  }
}
