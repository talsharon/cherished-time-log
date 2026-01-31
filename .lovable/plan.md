

## Pop-in and Slide-out Animation for Logged Activity

### Overview

Replace the permanent last log card with a temporary animated card that appears only when tapping "DONE". The card will pop in, pause briefly, then slide out to the right and disappear.

### Animation Sequence

```text
[DONE tapped]
     |
     v
+------------------+
|  Card pops in    |  <- scale from 0.8 to 1, opacity 0 to 1 (300ms, ease-out)
+------------------+
     |
     | (500ms delay)
     v
+------------------+
|  Card slides out |  <- translate X 0 to 100%, opacity 1 to 0 (400ms, ease-in)
+------------------+
     |
     v
[Card hidden]
```

---

### Technical Approach

#### 1. New State Structure

Replace `animatingLogId` and `previousLogId` with:
- `completedLog`: Stores the log data to display in the animated card (null when not showing)
- `animationPhase`: Tracks current animation phase ('pop-in' | 'visible' | 'slide-out' | null)

#### 2. New Keyframe Animations

Add to `tailwind.config.ts`:
- `pop-in`: Scale from 0.8 to 1 with opacity fade in (ease-out)
- `slide-out-right`: Translate X from 0 to 100% with opacity fade out (ease-in)

#### 3. Animation Flow in handleDone

1. Store the log data (title, comment, duration, start_time) before creating
2. Create the log in database
3. Set `animationPhase` to 'pop-in' and populate `completedLog`
4. After 300ms (pop-in duration), set phase to 'visible'
5. After 500ms delay, set phase to 'slide-out'
6. After 400ms (slide-out duration), clear `completedLog` and phase

---

### File Changes

#### `tailwind.config.ts`

Add new keyframes:

```typescript
"pop-in": {
  "0%": { transform: "scale(0.8)", opacity: "0" },
  "100%": { transform: "scale(1)", opacity: "1" },
},
"slide-out-right": {
  "0%": { transform: "translateX(0)", opacity: "1" },
  "100%": { transform: "translateX(100%)", opacity: "0" },
},
```

Add new animations:

```typescript
"pop-in": "pop-in 0.3s ease-out forwards",
"slide-out-right": "slide-out-right 0.4s ease-in forwards",
```

#### `src/components/ClockTab.tsx`

**Remove:**
- `animatingLogId` and `previousLogId` state
- The animation reset useEffect
- The permanent last log display (lines 228-258)

**Add:**
- `completedLog` state to store the log data for animation
- `animationPhase` state to track animation progress
- New useEffect to orchestrate the animation sequence
- Temporary card component that only renders during animation

**Updated handleDone:**

```typescript
const handleDone = async () => {
  if (!startTime || isSaving) return;

  setIsSaving(true);
  try {
    const duration = getElapsedSeconds(startTime);
    
    // Store log data for animation display
    const logData = {
      title: currentTitle,
      comment: currentComment || null,
      duration,
      start_time: startTime.toISOString(),
    };
    
    // Create the log entry
    await createLog(startTime, duration, currentTitle, currentComment || undefined);
    
    // Start animation sequence
    setCompletedLog(logData);
    setAnimationPhase('pop-in');
    
    // Reset the session
    await resetSession();
    
    toast.success('Activity logged!');
  } catch (error) {
    console.error('Error saving log:', error);
    toast.error('Failed to save activity');
  } finally {
    setIsSaving(false);
  }
};
```

**Animation orchestration useEffect:**

```typescript
useEffect(() => {
  if (animationPhase === 'pop-in') {
    // After pop-in completes (300ms), wait then slide out
    const timer = setTimeout(() => {
      setAnimationPhase('slide-out');
    }, 800); // 300ms pop-in + 500ms visible delay
    return () => clearTimeout(timer);
  }
  
  if (animationPhase === 'slide-out') {
    // After slide-out completes (400ms), clear everything
    const timer = setTimeout(() => {
      setCompletedLog(null);
      setAnimationPhase(null);
    }, 400);
    return () => clearTimeout(timer);
  }
}, [animationPhase]);
```

**Animated card JSX (replaces last log display):**

```tsx
{completedLog && (
  <div className="mt-4 overflow-hidden">
    <div
      className={`rounded-xl bg-secondary/50 p-4 ${
        animationPhase === 'pop-in' ? 'animate-pop-in' : ''
      } ${animationPhase === 'slide-out' ? 'animate-slide-out-right' : ''}`}
    >
      {/* Card content with completedLog data */}
    </div>
  </div>
)}
```

---

### Summary

| File | Changes |
|------|---------|
| `tailwind.config.ts` | Add `pop-in` and `slide-out-right` keyframes and animations |
| `src/components/ClockTab.tsx` | Replace permanent last log with animated temporary card, add animation state management |

