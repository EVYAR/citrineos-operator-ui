// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
'use client';

/**
 * Interim live provider (ADAPTER-0006): poll/invalidate instead of Hasura GraphQL WS.
 * Replace with CSMS-0018 SSE when available.
 */
import type { LiveProvider } from '@refinedev/core';

const DEFAULT_INTERVAL_MS = 15_000;

const liveProvider: LiveProvider = {
  subscribe: ({ channel, types, callback, params }) => {
    const intervalMs =
      (params?.meta as { pollIntervalMs?: number } | undefined)
        ?.pollIntervalMs ?? DEFAULT_INTERVAL_MS;

    const tick = () => {
      callback({
        channel,
        type: Array.isArray(types) && types.length > 0 ? types[0] : '*',
        payload: { channel, date: new Date() },
        date: new Date(),
      });
    };

    const id = setInterval(tick, intervalMs);
    return id;
  },

  unsubscribe: (subscription) => {
    if (subscription != null) {
      clearInterval(subscription as ReturnType<typeof setInterval>);
    }
  },
};

export default liveProvider;
