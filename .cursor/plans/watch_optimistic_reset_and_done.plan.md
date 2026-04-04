---
name: ""
overview: ""
todos: []
isProject: false
---

# Watch: optimistic tactical reset + optimistic DONE

## Scope

**In scope:** both controls on `[WatchContentView](ios/TimeTrackerWatch/WatchContentView.swift)`—the tactical reset button and the **DONE** button—use the same pattern: apply optimistic local state immediately, then `sendMessage` to the phone; reconcile when the reply or a later `applicationContext` arrives. **DONE is not out of scope** (any older draft that listed only tactical reset is superseded by this document).

**Out of scope:** new watch-side code that writes directly to Supabase; changing how `ClockViewModel.done()` commits on the phone (beyond consuming its existing reply snapshot).

## Goals

- **Tactical reset** and **DONE** update watch UI, App Group snapshot, and complications **immediately** on tap.
- **Authoritative data** stays on the phone / Supabase only — the watch does not write to the backend.
- **Phone failure semantics:** if the phone cannot complete the operation, the watch may briefly show the optimistic state; it realigns on the next **successful** sync payload. **Server data is never updated from the watch alone** beyond normal WCSession messages handled by the phone app.

## Tactical reset (unchanged intent from prior plan)

1. In `[WatchConnectivityModel](ios/TimeTrackerWatch/WatchConnectivityModel.swift)`, add something like `resetTacticalFromWatch()`:
  - Set `tacticalStart = Date()`.
  - `TimerSnapshotStorage.persist(mainStart:tacticalStart:currentTitle:currentTitleColor:)` using current `mainStart`, new tactical, `currentTitle`, and last persisted title color from `TimerSnapshotStorage.load()`.
  - `WatchComplicationKind.reloadTimelines()`.
  - Call existing `send(WCConstants.actionResetTactical)`.
2. `[WatchContentView](ios/TimeTrackerWatch/WatchContentView.swift)` tactical button calls that method.
3. **Reconciliation:** existing `replyHandler` → `applyContext(reply)` with phone snapshot (unchanged).

## DONE button (in scope — same optimistic pattern as tactical reset)

### Optimistic state to mirror successful `[ClockViewModel.done()](ios/TimeTracker/Clock/ClockViewModel.swift)`

After a successful `done()`, the phone sets `startTime = Date()`, `tacticalStartTime = startTime`, `currentTitle = "Idle"`, `currentComment = ""`. The watch should mirror that **locally** before `sendMessage`:

- `mainStart = Date()` (same instance for both anchors, matching phone).
- `tacticalStart = mainStart`.
- `currentTitle = "Idle"` and `pickerTitle = "Idle"` so the wheel matches the headline state.
- **Title color for persist:** use the same fallback as `snapshotForWatch` when the title is Idle and not in the titles list: `"hsl(0, 0%, 55%)"` (see `[ClockViewModel.snapshotForWatch()](ios/TimeTracker/Clock/ClockViewModel.swift)`). Avoid guessing hues for “Idle” from stale storage if that could mismatch; default Idle neutral is consistent with the phone snapshot.

Then `TimerSnapshotStorage.persist` + `WatchComplicationKind.reloadTimelines()`, then existing `send(WCConstants.actionDone)`.

### Failure and “watch only out of sync” — data stays safe


| Scenario                                                               | Watch                                                                                                                                                                                                                                                                                                                            | Phone / data                                                                                  |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Message delivered; `done()` **fails** (e.g. Supabase error)            | Phone still runs `replyHandler` with current `[snapshotForWatch()](ios/TimeTracker/Clock/ClockViewModel.swift)` after `handleDoneFromWatch()` completes. Model fields were **not** updated on failure, so the reply still reflects the **pre-DONE** session. `applyContext(reply)` **reverts** the optimistic watch UI to truth. | No log row / session reset unless the phone’s `do` block finished — **unchanged from today**. |
| `sendMessage` **error** (unreachable, transport error) or **no reply** | Watch keeps optimistic “Idle + fresh timers” until the next `applicationContext` or a later message reply. User-visible: watch ahead until sync.                                                                                                                                                                                 | **No extra writes**; session unchanged until the phone runs `done()` successfully.            |
| DONE **succeeds**                                                      | Reply matches (or fine-tunes) optimistic state.                                                                                                                                                                                                                                                                                  | Same as today.                                                                                |


**Guarantee:** Optimistic updates are **UI + App Group cache only**. No new watch-side persistence path to Supabase. Server state remains correct relative to what the phone actually committed.

### Optional clarity (minimal)

If `sendMessage` hits `errorHandler`, you may set `lastError` (already done for tactical path) or a short-lived flag — not required for correctness; reconciliation still happens on next context.

## Files to touch


| File                                                                                                     | Change                                                                                                                                   |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `[ios/TimeTrackerWatch/WatchConnectivityModel.swift](ios/TimeTrackerWatch/WatchConnectivityModel.swift)` | `resetTacticalFromWatch()`, `doneFromWatch()` (names flexible): optimistic local state + persist + reload + delegate to existing `send`. |
| `[ios/TimeTrackerWatch/WatchContentView.swift](ios/TimeTrackerWatch/WatchContentView.swift)`             | Tactical reset → reset helper; DONE → done helper.                                                                                       |


## Verification

- **DONE with phone app active:** tap DONE → main + tactical go to ~0, title Idle immediately; after reply, stays consistent.
- **DONE with phone failing `done()`:** simulate or break network on phone after watch tap; reply should carry old session — watch UI should **snap back** to previous timers/title (reconciliation).
- **DONE unreachable:** optimistic Idle + zeroed timers on watch; hint shown; opening phone and syncing restores truth.

## Implementation todos

- Add `resetTacticalFromWatch()` (optimistic tactical + `send(resetTactical)`).
- Add `doneFromWatch()` (optimistic Idle + both anchors + persist + `send(done)`).
- Wire both buttons in `WatchContentView`.

