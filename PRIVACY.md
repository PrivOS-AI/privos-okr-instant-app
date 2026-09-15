# Privacy Notice

Last updated: 2026-09-15

OKR Goals Book is an INSTANT PrivOS app operated by PrivOS AI. It has no server,
no container and no database of its own: it is a static interface that the
PrivOS Hub serves to users who open its room tab.

## Data handled

The app reads and writes three PrivOS Lists in the room where it is opened —
Objectives, Key Results and Check-ins — through the PrivOS scopes approved at
installation (`basic:information`, `lists:read`, `lists:query` and the optional
`lists:write`). Those records can include objective titles, owners, periods,
key-result values, check-in notes, confidence and author names.

All of this data stays in the user's PrivOS workspace. The app sends nothing to
PrivOS AI or to any third party, makes no external network calls, and includes
no advertising, analytics or tracking code.

## Retention and sharing

The app retains nothing itself. OKR records live in the room's lists and follow
the workspace's own retention, backup and access rules; uninstalling the app does
not delete them. PrivOS platform logs and account records remain governed by the
user's PrivOS agreement. The app does not sell personal data.

## User choices and contact

Workspace administrators control installation, approved scopes and removal of
the app; room members control the list items they can edit. Privacy and security
questions can be sent to `dev@privos.ai`.

Material changes to this notice will be published in this repository and, when
applicable, submitted as a new Marketplace version for review.
