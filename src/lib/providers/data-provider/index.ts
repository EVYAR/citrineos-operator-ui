// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
'use client';

import { authProvider } from '@lib/providers/auth-provider';
import { ResourceType } from '@lib/utils/access.types';
import config from '@lib/utils/config';
import type {
  BaseRecord,
  CreateParams,
  DataProvider,
  DeleteOneParams,
  GetListParams,
  GetOneParams,
  UpdateParams,
} from '@refinedev/core';
import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';

const CSMS_API_URL = config.csmsApiUrl.replace(/\/$/, '');

const RESOURCE_PATH: Partial<Record<string, string>> = {
  [ResourceType.LOCATIONS]: 'locations',
  [ResourceType.CHARGING_STATIONS]: 'stations',
  [ResourceType.TRANSACTIONS]: 'transactions',
};

function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `op-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function writeHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    'X-Contract-Version': '1.0',
    'X-Idempotency-Key': newIdempotencyKey(),
    ...extra,
  };
}

function createClient(): AxiosInstance {
  const client = axios.create({
    baseURL: CSMS_API_URL,
    headers: { 'Content-Type': 'application/json' },
  });
  client.interceptors.request.use(async (req) => {
    const token = await authProvider.getToken();
    if (token) {
      req.headers.Authorization = `Bearer ${token}`;
    }
    return req;
  });
  return client;
}

const http = createClient();

function pathFor(resource: string): string | null {
  return RESOURCE_PATH[resource] ?? null;
}

function mapLocation(row: any): BaseRecord {
  return {
    ...row,
    state: row.province ?? row.state,
    coordinates:
      row.latitude != null && row.longitude != null
        ? {
            type: 'Point',
            coordinates: [Number(row.longitude), Number(row.latitude)],
          }
        : row.coordinates,
    chargingPool: row.chargingPool ?? [],
  };
}

function mapStation(row: any): BaseRecord {
  return {
    ...row,
    // Keep CSMS UUID as id; expose Core identity separately for display/commands.
    coreId: row.coreId,
    isOnline: row.isOnline ?? row.status === 'ONLINE',
    location: row.location,
    LatestStatusNotifications: row.LatestStatusNotifications ?? [],
    Evses: row.Evses ?? row.chargers ?? [],
    Transactions: row.Transactions ?? [],
  };
}

function mapTransaction(row: any): BaseRecord {
  return {
    ...row,
    transactionId: row.coreId ?? row.transactionId ?? row.id,
    totalKwh: row.energyKwh ?? row.totalKwh,
    startTime: row.startedAt ?? row.startTime,
    endTime: row.endedAt ?? row.endTime,
    chargingState: row.status ?? row.chargingState,
    chargingStation: row.station
      ? {
          id: row.station.id,
          location: row.station.location,
        }
      : row.chargingStation,
    stationId: row.stationId ?? row.station?.id,
    locationId: row.station?.location?.id ?? row.locationId,
    isActive: row.endedAt == null && row.status !== 'Completed',
  };
}

function mapRow(resource: string, row: any): BaseRecord {
  switch (resource) {
    case ResourceType.LOCATIONS:
      return mapLocation(row);
    case ResourceType.CHARGING_STATIONS:
      return mapStation(row);
    case ResourceType.TRANSACTIONS:
      return mapTransaction(row);
    default:
      return row;
  }
}

function paginationQuery(params: GetListParams): Record<string, string | number> {
  const current = params.pagination?.current ?? 1;
  const pageSize = params.pagination?.pageSize ?? 25;
  const query: Record<string, string | number> = {
    limit: pageSize,
    offset: (current - 1) * pageSize,
  };

  const sorter = params.sorters?.[0];
  if (sorter?.field) {
    query.sortBy = String(sorter.field);
    query.sortOrder = sorter.order === 'desc' ? 'desc' : 'asc';
  }

  for (const filter of params.filters ?? []) {
    if (!('field' in filter) || filter.value == null || filter.value === '') {
      continue;
    }
    const field = String(filter.field);
    if (field === 'q' || field === 'search') {
      query.q = String(filter.value);
    } else if (field === 'locationId' || field === 'location.id') {
      // Stations list may filter by location; CSMS uses locationId when supported.
      query.locationId = String(filter.value);
    } else if (field === 'stationId') {
      query.stationId = String(filter.value);
    } else if (field === 'isActive' && filter.value === true) {
      // Active transactions: leave status unset; UI may refine client-side.
    } else {
      query[field] = String(filter.value);
    }
  }

  const metaSearch = (params.meta as { search?: string } | undefined)?.search;
  if (metaSearch) {
    query.q = metaSearch;
  }

  return query;
}

async function request<T>(
  config: AxiosRequestConfig,
): Promise<T> {
  const response = await http.request<T>(config);
  return response.data;
}

const dataProvider: DataProvider = {
  getApiUrl: () => CSMS_API_URL,

  getList: async (params) => {
    const path = pathFor(params.resource);
    if (!path) {
      // ponytail: nested Hasura-only resources (Evses, OCPPMessages, …) return empty until CSMS covers them
      return { data: [], total: 0 };
    }
    const body = await request<{ data: any[]; meta: { total: number } }>({
      method: 'GET',
      url: `/${path}`,
      params: paginationQuery(params),
    });
    return {
      data: (body.data ?? []).map((row) => mapRow(params.resource, row)),
      total: body.meta?.total ?? body.data?.length ?? 0,
    };
  },

  getOne: async (params: GetOneParams) => {
    const path = pathFor(params.resource);
    if (!path) {
      return { data: { id: params.id } as BaseRecord };
    }
    const row = await request<any>({
      method: 'GET',
      url: `/${path}/${params.id}`,
    });
    return { data: mapRow(params.resource, row) };
  },

  create: async (params: CreateParams) => {
    const path = pathFor(params.resource);
    if (!path || params.resource === ResourceType.TRANSACTIONS) {
      throw new Error(`Create not supported for ${params.resource} on CSMS.`);
    }
    const row = await request<any>({
      method: 'POST',
      url: `/${path}`,
      data: params.variables,
      headers: writeHeaders(),
    });
    return { data: mapRow(params.resource, row) };
  },

  update: async (params: UpdateParams) => {
    const path = pathFor(params.resource);
    if (!path || params.resource === ResourceType.TRANSACTIONS) {
      throw new Error(`Update not supported for ${params.resource} on CSMS.`);
    }
    const expectedVersion =
      (params.variables as { version?: number } | undefined)?.version ??
      (params.meta as { expectedVersion?: number } | undefined)?.expectedVersion;
    const row = await request<any>({
      method: 'PATCH',
      url: `/${path}/${params.id}`,
      data: params.variables,
      headers: writeHeaders(
        expectedVersion != null
          ? { 'X-Expected-Version': String(expectedVersion) }
          : undefined,
      ),
    });
    return { data: mapRow(params.resource, row) };
  },

  deleteOne: async (params: DeleteOneParams) => {
    const path = pathFor(params.resource);
    if (!path || params.resource === ResourceType.TRANSACTIONS) {
      throw new Error(`Delete not supported for ${params.resource} on CSMS.`);
    }
    await request<any>({
      method: 'DELETE',
      url: `/${path}/${params.id}`,
      headers: writeHeaders(),
    });
    return { data: { id: params.id } as BaseRecord };
  },

  getMany: async ({ resource, ids }) => {
    const results = await Promise.all(
      ids.map(async (id) => {
        const { data } = await dataProvider.getOne!({ resource, id });
        return data;
      }),
    );
    return { data: results };
  },

  createMany: async () => {
    throw new Error('createMany is not supported.');
  },

  updateMany: async () => {
    throw new Error('updateMany is not supported.');
  },

  deleteMany: async () => {
    throw new Error('deleteMany is not supported.');
  },

  custom: async ({ url, method, payload, headers, query }) => {
    const data = await request<any>({
      url,
      method: (method ?? 'get').toUpperCase(),
      data: payload,
      headers,
      params: query,
    });
    return { data };
  },
};

export default dataProvider;
