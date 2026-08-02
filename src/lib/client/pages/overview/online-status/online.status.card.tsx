// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
'use client';

import React from 'react';
import { MenuSection } from '@lib/client/components/main-menu/main.menu';
import { Card, CardContent, CardHeader } from '@lib/client/components/ui/card';
import { Circle } from '@lib/client/pages/overview/circle/circle';
import { ActionType, ResourceType } from '@lib/utils/access.types';
import { AccessDeniedFallbackCard } from '@lib/client/components/access-denied-fallback-card';
import { CanAccess, useList, useTranslate } from '@refinedev/core';
import { ChevronRightIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { heading2Style } from '@lib/client/styles/page';
import { overviewClickableStyle } from '@lib/client/styles/card';
import { ChargerStatusEnum } from '@lib/utils/enums';
import { OverviewCardSkeleton } from '@lib/client/pages/overview/overview.card.skeleton';

const statusFlex = 'flex flex-col gap-2';
const statusLabelStyle = 'text-5xl';
const statusIndicatorFlex = 'flex items-center gap-2';

export const OnlineStatusCard = () => {
  const { push } = useRouter();
  const translate = useTranslate();

  const {
    query: { data, isLoading, error },
  } = useList({
    resource: ResourceType.CHARGING_STATIONS,
    pagination: { current: 1, pageSize: 500 },
  });

  const stations = data?.data ?? [];
  const onlineCount = stations.filter((s: any) => s.isOnline).length;
  const offlineCount = stations.length - onlineCount;

  if (isLoading) return <OverviewCardSkeleton />;

  return (
    <CanAccess
      resource={ResourceType.CHARGING_STATIONS}
      action={ActionType.LIST}
      fallback={<AccessDeniedFallbackCard />}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className={heading2Style}>
              {translate('overview.chargerOnlineStatus')}
            </h2>
            <div
              onClick={() => push(`/${MenuSection.CHARGING_STATIONS}`)}
              className={overviewClickableStyle}
            >
              {translate('overview.viewAllChargers')} <ChevronRightIcon />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <p>{translate('overview.errorLoadingData')}</p>
          ) : (
            <div className="flex items-center gap-12">
              <div className={statusFlex}>
                <span className={statusLabelStyle}>{onlineCount}</span>
                <div className={statusIndicatorFlex}>
                  <Circle status={ChargerStatusEnum.ONLINE} />
                  Online
                </div>
              </div>
              <div className={statusFlex}>
                <span className={statusLabelStyle}>{offlineCount}</span>
                <div className={statusIndicatorFlex}>
                  <Circle status={ChargerStatusEnum.OFFLINE} />
                  Offline
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </CanAccess>
  );
};
