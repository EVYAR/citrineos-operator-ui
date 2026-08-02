// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
'use client';

import { pageMargin } from '@lib/client/styles/page';

/** Placeholder for Authorizations / Partners after ADAPTER-0006 Hasura cutover. */
export function CsmsUnavailableFeature({ title }: { title: string }) {
  return (
    <div className={pageMargin}>
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-muted-foreground max-w-xl">
        This screen is not available on the CSMS boundary yet (ADAPTER-0006).
        Direct Hasura access was removed; CSMS does not expose operator CRUD for
        this resource.
      </p>
    </div>
  );
}
