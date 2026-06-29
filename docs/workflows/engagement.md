# Engagement Workflow

**Domain:** Engagement — *How does the system talk to you?*  
**Tables:** `notifications` (today); emails via Resend; future: announcements, activity_logs  
**Laravel parallel:** `notifications` + `NotificationController`, `Mail` facade, `userlogs` / `activities`

---

## Plain summary

When something important happens (upgrade submitted, approved, admin message), the member gets an in-app notification. Optional email goes out via Resend. Audit activity logs stay separate — do not mix into notifications.

---

## In-app notification flow

```
1. Backend event (e.g. upgrade status change)
2. notifyUpgradeStatus() or POST /admin/notify
3. Row inserted in notifications (type, title, message, read: false)
4. Member sees bell count in header
5. /notifications — list all
6. Tap → mark read (PATCH)
```

---

## Email flow (side channel)

```
Same trigger as notification
→ notify.ts calls Resend API (if RESEND_API_KEY set)
→ Email failure is logged, never blocks the main response
```

**Laravel parallel:** `Mail::to(...)->send(new ...)` after deposit approval

---

## Admin notify flow

```
1. /admin/notifications
2. Enter member ID + message
3. POST /admin/notify
4. Notification row created for that member
```

---

## Sub-domains (keep separate)

| Channel | Storage | Purpose |
|---|---|---|
| In-app | `notifications` table | Member-facing alerts |
| Email | Resend (no table) | Out-of-band delivery |
| Activity logs | **Future** `activity_logs` | Audit trail (Laravel: `userlogs`) |
| Announcements | **Future** | Broadcast to all members |

---

## Notification types

| type | Example |
|---|---|
| `upgrade` | Request submitted / approved / rejected |
| `profit` | Monthly dividend posted |
| `event` | Launch window reminder |
| `badge` | Credential issued |
| `system` | Security notice, admin message |

---

## API endpoints

| Method | Path | Who |
|---|---|---|
| GET | `/notifications` | Member |
| PATCH | `/notifications/:id` | Member (mark read) |
| PATCH | `/notifications/read-all` | Member |
| POST | `/admin/notify` | Admin |

---

## Laravel response pattern

Laravel uses flash messages: `->with('success', '...')` on redirect.  
zam-app uses JSON responses + Sonner toasts on the frontend — same user feedback intent, different transport.

---

## Related files

| Layer | Path |
|---|---|
| Notifications UI | `frontend/src/routes/Notifications.tsx` |
| Admin notify | `frontend/src/routes/Admin/Notifications.tsx` |
| Notify helper | `backend/src/lib/notify.ts` |
| Routes | `backend/src/routes/notifications.ts`, `admin.ts` |

---

## Known gaps

- Notification row may fail silently on admin approve (E2E test #7 — check Resend/logs)
- No activity_logs table yet
- No broadcast announcements
