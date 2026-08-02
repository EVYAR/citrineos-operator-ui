// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
'use client';

import React from 'react';
import { ActionType, ResourceType } from '@lib/utils/access.types';
import { AccessDeniedFallbackCard } from '@lib/client/components/access-denied-fallback-card';
import { CanAccess, useList, useTranslate } from '@refinedev/core';
import { Card, CardContent, CardHeader } from '@lib/client/components/ui/card';
import { heading2Style } from '@lib/client/styles/page';
import { OverviewCardSkeleton } from '@lib/client/pages/overview/overview.card.skeleton';

export const PluginSuccessRateCard = () => {
  const translate = useTranslate();

  const {
    query: { data, isLoading, error },
  } = useList({
    resource: ResourceType.TRANSACTIONS,
    pagination: { current: 1, pageSize: 500 },
  });

  const transactions = data?.data ?? [];
  const totalCount = transactions.length;
  const successCount = transactions.filter(
    (t: any) => t.status === 'Completed' || t.endTime || t.endedAt,
  ).length;
  const percentage = totalCount === 0 ? 0 : (successCount / totalCount) * 100;
  const roundedPercentage = Math.round(percentage * 10) / 10;

  if (isLoading) return <OverviewCardSkeleton />;

  return (
    <CanAccess
      resource={ResourceType.TRANSACTIONS}
      action={ActionType.LIST}
      fallback={<AccessDeniedFallbackCard />}
    >
      <Card>
        <CardHeader>
          <h2 className={heading2Style}>
            {translate('overview.plugInSuccessRate')}
          </h2>
        </CardHeader>
        <CardContent>
          {error ? (
            <p>{translate('overview.errorLoadingData')}</p>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="w-full h-6 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${roundedPercentage}%` }}
                />
              </div>
              <div className="text-3xl">{roundedPercentage}%</div>
            </div>
          )}
        </CardContent>
      </Card>
    </CanAccess>
  );
};
