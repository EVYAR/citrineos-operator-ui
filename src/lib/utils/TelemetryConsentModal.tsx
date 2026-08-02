// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@lib/client/components/ui/dialog';
import { Button } from '@lib/client/components/ui/button';

const CONSENT_KEY = 'evyar.telemetryConsent';

interface TelemetryConsentModalProps {
  visible: boolean;
  onDecision: (agreed: boolean) => void;
}

/** ADAPTER-0006: Core `/ocpprouter/systemConfig` removed; consent is local-only. */
export async function checkTelemetryConsent(): Promise<boolean | undefined> {
  if (typeof window === 'undefined') return undefined;
  const stored = window.localStorage.getItem(CONSENT_KEY);
  if (stored === 'true') return true;
  if (stored === 'false') return false;
  return undefined;
}

export async function saveTelemetryConsent(
  telemetryConsent: boolean,
): Promise<void> {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CONSENT_KEY, String(telemetryConsent));
}

export const TelemetryConsentModal: React.FC<TelemetryConsentModalProps> = ({
  visible,
  onDecision,
}) => {
  return (
    <Dialog open={visible} onOpenChange={() => {}}>
      <DialogContent
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle>Anonymous Metrics Consent</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          CitrineOS collects anonymous usage metrics to help us improve the
          product. Would you like to send these metrics?
        </DialogDescription>
        <DialogFooter>
          <Button variant="outline" onClick={() => onDecision(false)}>
            Reject
          </Button>
          <Button onClick={() => onDecision(true)}>Accept</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
