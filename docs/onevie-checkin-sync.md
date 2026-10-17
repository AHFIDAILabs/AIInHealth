# Our side of the Onevie sync

What we built against your spec, and one thing we need you to confirm.

## What we're sending

Every confirmed registration that already has a QR code gets pushed to your
`/registrations` endpoint, one POST per person. We only ever use the two
rules from your doc:

- `qr_secret` is always the exact code already printed on the e-ticket we
  emailed — never a new or shortened one.
- `send_confirmation_email` is always `false` — we've already sent our own
  confirmation and QR, so nothing further should go out from your side.

We send nothing beyond what your API requires: name, email, phone (if we
have it), `ticket_type_id`, and `job_title`/`organization` in `form_answers`.
No payment info, internal status, or anything else of ours crosses over.

## How often

A scheduled job runs every 5 minutes and pushes anyone newly confirmed, or
anyone whose details changed since their last successful sync (a name
correction, a ticket-category change, etc.). We also have an admin "Sync
now" button for an immediate push outside that schedule. The whole thing has
an on/off switch on our side — if we ever need to pause sending, no calls go
out at all while it's off.

## Ticket type mapping, for your check-in staff

So the badge/lane at the door matches what we intend:

| Your `ticket_type_id` | Who gets it |
|---|---|
| Speaker | Confirmed abstract/session speakers |
| VIP | VIP-category attendees |
| Media | Accredited media |
| Organizer | Our event staff/team and volunteers tagged as staff |
| Exhibitor | Exhibitor registrations |
| Innovator | Innovator registrations |
| Volunteer | Volunteer registrations |
| Delegate | Everyone else — regular attendees, sponsors, and government officials (we deliberately don't give officials or sponsors a separate lane) |

## One thing we need confirmed

Your doc says sending the same `external_reference` again "returns the
registration you already created" and sets `idempotent_replay: true` — it
doesn't say whether that second call actually **updates** the stored name/
ticket type/form answers, or just replays the original untouched.

This matters for us: if someone's details change after their first sync
(say, a presenter's name is corrected, or their category changes), we send
the updated payload again under the same `external_reference`/`qr_secret`.
If a repeat call doesn't apply new field values, those corrections won't
reach your system even though we're sending them — could you confirm either
way?

## Nothing needed from you otherwise

This is a one-way push from us — there's no action needed on your end to
keep receiving updates as new people confirm or existing details change.
