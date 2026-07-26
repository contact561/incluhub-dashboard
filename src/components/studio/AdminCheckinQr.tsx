"use client";

import { useActionState, useEffect, useState } from "react";
import QRCode from "qrcode";
import { createStudioCheckinQrAction, type CheckinQrState } from "@/actions/studio/checkin";
import { Button } from "@/components/ui/button";

export function AdminCheckinQr({ bookingId }: { bookingId: string }) {
  const [state, action, pending] = useActionState<CheckinQrState, FormData>(
    createStudioCheckinQrAction,
    {}
  );
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    if (!state.token) {
      return;
    }

    let active = true;
    QRCode.toDataURL(
      JSON.stringify({ type: "incluhub-studio-checkin", token: state.token }),
      {
        width: 320,
        margin: 2,
        errorCorrectionLevel: "M",
      }
    )
      .then((url) => {
        if (active) setImage(url);
      })
      .catch(() => {
        if (active) setImage(null);
      });

    return () => {
      active = false;
    };
  }, [state.token]);

  const qrImage = state.token ? image : null;

  return (
    <div className="space-y-3">
      <form action={action}>
        <input type="hidden" name="booking_id" value={bookingId} />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Generating…" : "Display booking QR"}
        </Button>
      </form>
      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      {qrImage && state.expiresAt ? (
        <div className="rounded-lg border border-border-default bg-white p-3 text-center">
          {/* Generated locally from a short-lived opaque token. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrImage}
            alt="Temporary studio check-in QR"
            className="mx-auto size-64 max-w-full"
          />
          <p className="mt-2 text-xs text-zinc-600">
            Ask the booked portfolio leader to scan this from their logged-in
            account. Successful scan unlocks their portfolio submission. Token
            expires shortly.
          </p>
        </div>
      ) : null}
    </div>
  );
}
