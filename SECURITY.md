# Security Policy

## Supported versions

Munimuni is pre-1.0. Security fixes land on `main` and are deployed to
https://munimuni.vercel.app as soon as they are verified.

| Version | Supported |
| ------- | --------- |
| main    | Yes       |

## Reporting a vulnerability

Do not open a public issue for security reports.

- Email the maintainer via the address listed on https://github.com/exadizon
- Or open a private GitHub Security Advisory on this repository

Please include:

1. What you did (steps to reproduce)
2. What you expected vs what happened
3. Affected route or file, if known (for example `/api/sync`, `/api/profile`)
4. Whether test or real data was involved

You will get an acknowledgement within 72 hours. Fixes are prioritized as:

1. Auth/session bypass or cross-user data access
2. Data loss or sync corruption
3. Everything else

## Scope notes

- The bundled test account (`test@munimuni.test`) is for local E2E only. Never reuse its password anywhere else.
- Never commit `.env.local`, `.neon`, or `.vercel` files. They are gitignored for a reason.
- Server routes never accept a `user_id` from the client. Ownership always comes from the Neon Auth session. Keep it that way.
