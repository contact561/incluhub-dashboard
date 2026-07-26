"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import {
  verifyStudioCheckinAction,
  type VerifyCheckinState,
} from "@/actions/studio/checkin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function readToken(value: string): string | null {
  try {
    const payload = JSON.parse(value) as { type?: string; token?: string };
    return payload.type === "incluhub-studio-checkin" &&
      typeof payload.token === "string"
      ? payload.token
      : null;
  } catch {
    return null;
  }
}

export function StudentQrCheckin() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [token, setToken] = useState("");
  const [mode, setMode] = useState<"choose" | "qr" | "otp">("choose");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [state, action, pending] = useActionState<VerifyCheckinState, FormData>(
    verifyStudioCheckinAction,
    {}
  );

  useEffect(() => () => scannerRef.current?.destroy(), []);

  async function startScanner() {
    setCameraError(null);
    setMode("qr");
    if (!videoRef.current) return;
    const scanner = new QrScanner(
      videoRef.current,
      (result) => {
        const parsed = readToken(result.data);
        if (!parsed) {
          setCameraError("This is not a valid IncluHub studio QR.");
          return;
        }
        setToken(parsed);
        scanner.stop();
        setCameraActive(false);
      },
      {
        highlightScanRegion: true,
        highlightCodeOutline: true,
        returnDetailedScanResult: true,
      }
    );
    scannerRef.current?.destroy();
    scannerRef.current = scanner;
    try {
      await scanner.start();
      setCameraActive(true);
    } catch {
      setCameraError(
        "Camera access is required to scan the Admin QR. Check your browser permission and try again."
      );
    }
  }

  return (
    <section className="mt-4 rounded-[var(--radius-control)] border border-brand-primary/30 bg-surface-muted p-4">
      <h3 className="font-medium text-text-primary">
        Check in at the studio to unlock portfolio submission
      </h3>
      <p className="mt-1 text-sm text-text-muted">
        Ask Admin for the booking QR or OTP when you arrive. Confirm from this
        logged-in leader account.
      </p>
      <div className="mt-4 space-y-3">
        {mode === "choose" ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={startScanner}>
              Scan QR
            </Button>
            <Button type="button" variant="outline" onClick={() => setMode("otp")}>
              Enter OTP
            </Button>
          </div>
        ) : null}

        <video
          ref={videoRef}
          className={
            cameraActive
              ? "aspect-video w-full max-w-md rounded-lg bg-black"
              : "hidden"
          }
          muted
          playsInline
        />
        {cameraError ? (
          <p className="text-sm text-destructive" role="alert">
            {cameraError}
          </p>
        ) : null}

        {token ? (
          <form action={action} className="space-y-3">
            <input type="hidden" name="qr_token" value={token} />
            <label className="flex items-start gap-2 text-sm text-text-primary">
              <input
                type="checkbox"
                name="attendance_confirmed"
                value="yes"
                required
                className="mt-1"
              />
              I confirm that I am the booked portfolio leader and I am physically
              present at the IncluHub studio.
            </label>
            {state.error ? (
              <p className="text-sm text-destructive" role="alert">
                {state.error}
              </p>
            ) : null}
            {state.success ? (
              <p className="text-sm text-status-success" role="status">
                {state.success}
              </p>
            ) : null}
            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>
                {pending ? "Verifying…" : "Confirm check-in"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setToken("")}>
                Scan again
              </Button>
            </div>
          </form>
        ) : null}

        {mode === "otp" && !token ? (
          <form action={action} className="max-w-sm space-y-3">
            <div className="space-y-2">
              <Label htmlFor="otp_code">6-digit OTP from Admin</Label>
              <Input
                id="otp_code"
                name="otp_code"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                placeholder="000000"
              />
            </div>
            <label className="flex items-start gap-2 text-sm text-text-primary">
              <input
                type="checkbox"
                name="attendance_confirmed"
                value="yes"
                required
                className="mt-1"
              />
              I confirm that I am the booked portfolio leader and I am physically
              present at the IncluHub studio.
            </label>
            {state.error ? (
              <p className="text-sm text-destructive" role="alert">
                {state.error}
              </p>
            ) : null}
            {state.success ? (
              <p className="text-sm text-status-success" role="status">
                {state.success}
              </p>
            ) : null}
            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>
                {pending ? "Verifying…" : "Confirm OTP check-in"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setMode("choose")}>
                Back
              </Button>
            </div>
          </form>
        ) : null}
      </div>
    </section>
  );
}
