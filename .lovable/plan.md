

## Secondary Tactical Stopwatch with Persistence

### Overview

Add a secondary "tactical" stopwatch above the main clock for inner time counting. Unlike the original plan, this stopwatch will persist its start time to the database so it survives app restarts/kills.

### Visual Layout

```text
┌─────────────────────────────────────────┐
│  [Sparkles Button]          (top right) │
│                                         │
│         ┌─────────────────────┐         │
│         │    00:05:23         │  [⟲]   │  ← Tactical stopwatch (smaller) + Reset button
│         └─────────────────────┘         │
│                                         │
│            00:45:12                     │  ← Main stopwatch (large)
│         Started 10:30:00 AM             │
│                                         │
│      What are you up to?                │
│      [Select activity    ▼]             │
│      [Add a comment...     ]            │
│                                         │
│      ┌─────────────────────┐            │
│      │        DONE         │            │
│      └─────────────────────┘            │
└─────────────────────────────────────────┘
```

### Behavior

| Action | Tactical Stopwatch Behavior |
|--------|------------------------------|
| Main session starts (first login) | Tactical starts from same time |
| Reset button clicked | Resets to current time and saves to DB |
| DONE button clicked | Resets to current time (same as main session) |
| App killed/refreshed | Restores from saved start time in DB |

### Technical Implementation

#### 1. Database Migration

Add a new column to the `active_sessions` table to store the tactical stopwatch start time.

```sql
ALTER TABLE public.active_sessions
ADD COLUMN tactical_start_time timestamp with time zone DEFAULT now();
```

#### 2. Update `handle_new_user` Database Function

Update the trigger function to initialize `tactical_start_time` when creating a new user's session.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.titles (user_id, name, color)
  VALUES (NEW.id, 'Idle', '#6B7280');
  
  INSERT INTO public.active_sessions (user_id, current_start_time, tactical_start_time)
  VALUES (NEW.id, now(), now());
  
  RETURN NEW;
END;
$function$;
```

#### 3. Update `useActiveSession` Hook

Add state and methods for the tactical stopwatch:

- Fetch `tactical_start_time` from database on load
- Add `tacticalStartTime` state
- Add `resetTacticalTimer()` function to reset and persist
- Update `resetSession()` to also reset tactical timer

#### 4. Create `TacticalStopwatch` Component

A lightweight display component that takes a `startTime` prop and shows elapsed time in smaller format.

#### 5. Update `ClockTab.tsx`

- Import and render `TacticalStopwatch` above the main stopwatch
- Add a round reset button next to it
- Wire up the reset handler

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| Database migration | Create | Add `tactical_start_time` column to `active_sessions` |
| `src/components/TacticalStopwatch.tsx` | Create | Display component for secondary timer |
| `src/hooks/useActiveSession.ts` | Modify | Add tactical timer state, fetch, and reset methods |
| `src/components/ClockTab.tsx` | Modify | Render tactical stopwatch with reset button |

### Hook Changes Detail

```typescript
// New state
const [tacticalStartTime, setTacticalStartTime] = useState<Date | null>(null);

// Fetch includes tactical_start_time
.select('current_start_time, current_title, current_comment, tactical_start_time')

// New reset function
const resetTacticalTimer = useCallback(async () => {
  const newTime = new Date();
  setTacticalStartTime(newTime);
  if (!user) return;
  
  await supabase
    .from('active_sessions')
    .update({ tactical_start_time: newTime.toISOString() })
    .eq('user_id', user.id);
}, [user]);

// resetSession also resets tactical
.update({ 
  current_start_time: newStartTime.toISOString(),
  current_title: 'Idle',
  current_comment: null,
  tactical_start_time: newStartTime.toISOString()
})
```

