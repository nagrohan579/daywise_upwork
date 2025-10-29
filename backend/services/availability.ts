import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import { storage } from '../storage';

dayjs.extend(utc);
dayjs.extend(timezone);

type GetAvailableSlotsParams = {
  userId: string;
  appointmentTypeId: string;
  date: string; // YYYY-MM-DD in customer's timezone
  customerTimezone: string; // IANA tz
  excludeBookingId?: string;
};

export async function getAvailableSlots({
  userId,
  appointmentTypeId,
  date,
  customerTimezone, // Kept for API compatibility but NOT used for logic
  excludeBookingId,
}: GetAvailableSlotsParams): Promise<string[]> {
  // Load appointment type
  const appointmentType = await storage.getAppointmentType(appointmentTypeId);
  if (!appointmentType) return [];

  // Load weekly availability
  const availability = await storage.getAvailabilityByUser(userId);

  // USER'S TIMEZONE IS THE SINGLE SOURCE OF TRUTH FOR ALL LOGIC
  const user = await storage.getUser(userId);
  const userTimezone = user?.timezone || 'UTC';

  // Interpret the date in USER'S timezone (ignore customer timezone)
  const dateInUserTz = dayjs.tz(date, userTimezone);
  const dayOfWeek = dateInUserTz.day();
  const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const dayName = dayNames[dayOfWeek];

  // Filter availability by weekday
  const dayAvailability = availability.filter(slot => {
    const rawWeekday = (slot as any).weekday || '';
    const wk = String(rawWeekday).toLowerCase().trim();
    const available = (slot as any).isAvailable !== false;
    const matches = wk === dayName || wk === dayName.slice(0,3) || wk === String(dayOfWeek);
    return matches && available;
  });

  if (dayAvailability.length === 0) return [];

  // Exceptions (check in user's timezone)
  const exceptions = await storage.getAvailabilityExceptionsByUser(userId);
  const dateStr = dateInUserTz.format('YYYY-MM-DD');
  const dateException = exceptions.find((exception: any) => {
    const exceptionDate = dayjs(exception.date).format('YYYY-MM-DD');
    return exceptionDate === dateStr;
  });
  if (dateException && dateException.type === 'unavailable') return [];

  // Existing bookings for that calendar date in user's timezone
  const allBookings = await storage.getBookingsByUser(userId);
  const dateBookings = allBookings.filter((b: any) => {
    if (excludeBookingId && b._id === excludeBookingId) return false;
    // Convert booking time to user's timezone and compare dates
    const bookingInUserTz = dayjs.utc(b.appointmentDate).tz(userTimezone);
    const bookingDateStr = bookingInUserTz.format('YYYY-MM-DD');
    return bookingDateStr === dateStr;
  });

  const bookingAppointmentTypes = new Map<string, any>();
  for (const b of dateBookings) {
    if (b.appointmentTypeId && !bookingAppointmentTypes.has(b.appointmentTypeId)) {
      const apptType = await storage.getAppointmentType(b.appointmentTypeId);
      if (apptType) bookingAppointmentTypes.set(b.appointmentTypeId, apptType);
    }
  }

  // Generate slots in BUSINESS timezone, then convert to UTC ISO
  const slots: string[] = [];
  const appointmentDuration = appointmentType.duration || 30;
  const bufferTimeAfter = appointmentType.bufferTime || 0;

  dayAvailability.sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));

  for (const availSlot of dayAvailability as any[]) {
    const [startHour, startMin] = availSlot.startTime.split(':').map(Number);
    const [endHour, endMin] = availSlot.endTime.split(':').map(Number);

    const startTimeMinutes = startHour * 60 + startMin;
    const endTimeMinutes = endHour * 60 + endMin;

    let currentTimeMinutes = startTimeMinutes;

    while (currentTimeMinutes + appointmentDuration <= endTimeMinutes) {
      const slotHour = Math.floor(currentTimeMinutes / 60);
      const slotMin = currentTimeMinutes % 60;

      // Build business-local datetime
      const businessLocal = dayjs.tz(
        `${dateInUserTz.format('YYYY-MM-DD')} ${String(slotHour).padStart(2,'0')}:${String(slotMin).padStart(2,'0')}:00`,
        'YYYY-MM-DD HH:mm:ss',
        userTimezone
      );

      const slotStartUtc = businessLocal.utc();
      const slotEndUtc = slotStartUtc.add(appointmentDuration + bufferTimeAfter, 'minute');

      // Check conflict with existing bookings
      const hasConflict = dateBookings.some((b: any) => {
        const bookingStartUtc = dayjs.utc(b.appointmentDate);
        const apptType = b.appointmentTypeId ? bookingAppointmentTypes.get(b.appointmentTypeId) : null;
        const bDuration = apptType?.duration || appointmentDuration;
        const bBufferAfter = apptType?.bufferTime || 0;
        const bookingEndUtc = bookingStartUtc.add(bDuration + bBufferAfter, 'minute');

        return bookingStartUtc.isBefore(slotEndUtc) && bookingEndUtc.isAfter(slotStartUtc);
      });

      if (!hasConflict) {
        slots.push(slotStartUtc.toISOString());
      }

      currentTimeMinutes += appointmentDuration + bufferTimeAfter;
    }
  }

  return slots;
}


