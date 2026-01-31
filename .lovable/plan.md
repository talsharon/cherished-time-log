

## Time Tracker PWA - Implementation Plan

### Overview
A dark-mode iPhone PWA for tracking time on activities with a persistent stopwatch, user authentication, and log management.

---

### 🎨 Design Style
- **Dark mode first** with high-contrast elements
- Clean, mobile-optimized interface designed for iPhone
- Large, easy-to-tap buttons for one-handed use

---

### 📱 Core Features

#### 1. User Authentication
- Sign up with email and password
- Login for returning users
- Secure session management
- **On first login**: Automatically create an active session and start the stopwatch

#### 2. Clock Tab (Main Screen)
- **Large running stopwatch** displaying hours:minutes:seconds
- Stopwatch **persists across app closures** by saving the session start time to database
- Big **"Done" button** that:
  - Logs the current activity with default title **"Idle"** (gray color)
  - Immediately resets and restarts the stopwatch

#### 3. Logs Tab
- List of all activity logs, **most recent first**
- Each log shows: title (colored), duration, date/time, and comment preview
- **Tap to edit** a log's title and comment
- **Reusable titles**: Once you save a title, it appears in a dropdown for future logs
- Each unique title gets a **random color** (editable later)
- **Default "Idle" title** comes pre-created with gray color

---

### 🗄️ Database Structure

**Tables:**
- **Users** - Authentication handled by Supabase Auth
- **Logs** - start_time, duration, title, comment, user_id
- **Titles** - name, color, user_id (default "Idle" title created with gray color for new users)
- **Active Sessions** - current_start_time, user_id (auto-created on first login)

---

### 📲 PWA Setup
- Configured for "Add to Home Screen" on iPhone
- App icon and splash screen
- Works offline for viewing existing logs

---

### What's NOT included (for simplicity)
- No statistics/charts (can add later)
- No data export (can add later)
- No log deletion (preserving all history)

