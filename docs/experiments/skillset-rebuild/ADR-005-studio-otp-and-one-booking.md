# ADR-005: Studio OTP and one-booking rule

## Status

Accepted

## Context

Studio access needs online booking plus physical presence proof. QR from `master` is replaced. Students must not freely rebook.

## Decision

- Online booking creates `online_confirmed` booking for the leader turn
- **Default: one booking**; further booking requires Admin `rebook_permit`
- Physical check-in: Admin generates/displays short-lived **OTP**; student enters OTP in app
- Store **hash only**; TTL + single use
- Successful verify → physically verified → unlock portfolio submit for that turn
- Admin UI shows bookings, rebook permits, and reiteration clearly
- No SMS/email OTP vendor in MVP

## Consequences

- Differs from QR flow on `master`
- Admin must be present (or desk device) to show OTP
- Clearer operational control over second bookings
