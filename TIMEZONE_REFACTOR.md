# Timezone Refactoring Progress

## Completed

### 1. Installed dayjs libraries
- `dayjs` and `dayjs/plugin/utc` and `dayjs/plugin/timezone` added to frontend and backend

### 2. Created timezone utilities
- `frontend/src/lib/timezoneUtils.js` - Utility functions for timezone conversion
- `backend/lib/timezoneUtils.ts` - Backend utility functions

### 3. Backend API Changes
- Updated `/api/availability/slots` to accept `customerTimezone` parameter
- Added dayjs imports and initialization
- Implemented proper timezone conversion:
  - Customer's date is parsed in their timezone
  - Converted to UTC
  - Then converted to business owner's timezone to determine day of week
  - This ensures correct availability matching

## Remaining Work

### 4. Slot Generation to Return UTC Times
Currently, the backend generates slots in the user's local timezone without proper UTC conversion. Need to:

**In `backend/routes.ts` around line 2547-2567:**

Replace:
```typescript
// Format time for display
const time = new Date();
time.setHours(slotHour, slotMin, 0, 0);
const timeString = time.toLocaleTimeString('en-US', { 
  hour: 'numeric', 
  minute: '2-digit',
  hour12: true 
});
slots.push(timeString);
```

With:
```typescript
// Create the slot time in the business owner's timezone
const slotDateTimeInOwnerTz = dayjs.tz(`${dateStr} ${String(slotHour).padStart(2, '0')}:${String(slotMin).padStart(2, '0')}:00`, userTimezone);

// Convert to UTC and store as ISO string
const slotUTC = slotDateTimeInOwnerTz.utc();
slots.push(slotUTC.toISOString());
```

### 5. Frontend Conversion
The frontend currently receives slots and displays them. Need to:

**In `frontend/src/pages/PublicBooking/PublicBooking.jsx`:**

Update the `displayTimeSlots` useMemo (around line 517) to convert UTC ISO strings to customer timezone:

```javascript
const displayTimeSlots = useMemo(() => {
  if (!selectedDate || !customerTimezone) {
    return availableTimeSlots;
  }

  // If slots are ISO strings (UTC), convert them to customer timezone
  if (availableTimeSlots.length > 0 && availableTimeSlots[0].includes('T')) {
    return availableTimeSlots.map(isoString => {
      const utc = dayjs(isoString);
      return utc.tz(customerTimezone).format('h:mm A');
    });
  }
  
  return availableTimeSlots;
}, [availableTimeSlots, selectedDate, customerTimezone]);
```

### 6. Booking Submission
Update `handleCompleteBooking` to properly convert customer's selected time to UTC before sending to backend.

## Testing Checklist
- [ ] Select date in same timezone as business owner (should show correct slots)
- [ ] Select date in different timezone (should show slots converted to customer timezone)
- [ ] Select date that spans multiple days in business owner's timezone
- [ ] Book appointment and verify it's stored in correct UTC time
- [ ] Verify bookings show correct local time in business owner's dashboard

## Key Principles
1. **UTC is the single source of truth** - All times stored in UTC
2. **Convert for display only** - UI converts UTC to user/customer timezone
3. **No +1/-1 day hacks** - Use proper timezone conversion always
4. **Consistent conversion** - Use dayjs with UTC and timezone plugins throughout

