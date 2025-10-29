import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
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
  customerTimezone,
  excludeBookingId,
}: GetAvailableSlotsParams): Promise<string[]> {
  // Load appointment type
  const appointmentType = await storage.getAppointmentType(appointmentTypeId);
  if (!appointmentType) return [];

  // Load weekly availability
  const availability = await storage.getAvailabilityByUser(userId);

  // Business timezone
  const user = await storage.getUser(userId);
  const userTimezone = user?.timezone || 'UTC';

  // Customer date handling
  const customerDateInCustomerTz = dayjs.tz(date, customerTimezone || userTimezone);
  const customerDateUTC = customerDateInCustomerTz.utc();
  const dateInUserTz = customerDateUTC.tz(userTimezone);
  const dayOfWeek = dateInUserTz.day();
  const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const dayName = dayNames[dayOfWeek];

  // Span detection
  const customerDayStart = customerDateInCustomerTz.startOf('day');
  const customerDayEnd = customerDateInCustomerTz.endOf('day');
  const dayStartInUserTz = customerDayStart.tz(userTimezone);
  const dayEndInUserTz = customerDayEnd.tz(userTimezone);
  const spansDifferentDays = dayStartInUserTz.format('YYYY-MM-DD') !== dayEndInUserTz.format('YYYY-MM-DD');

  // Filter availability by weekday
  let dayAvailability = availability.filter(slot => {
    const rawWeekday = (slot as any).weekday || '';
    const wk = String(rawWeekday).toLowerCase().trim();
    const available = (slot as any).isAvailable !== false;
    const matches = wk === dayName || wk === dayName.slice(0,3) || wk === String(dayOfWeek);
    return matches && available;
  });

  if (dayAvailability.length === 0 && customerTimezone && spansDifferentDays) {
    const prevDayInUserTz = dateInUserTz.subtract(1, 'day');
    const nextDayInUserTz = dateInUserTz.add(1, 'day');
    const prevDayName = dayNames[prevDayInUserTz.day()];
    const nextDayName = dayNames[nextDayInUserTz.day()];

    dayAvailability = availability.filter(slot => {
      const rawWeekday = (slot as any).weekday || '';
      const wk = String(rawWeekday).toLowerCase().trim();
      const available = (slot as any).isAvailable !== false;
      const matchesPrev = wk === prevDayName || wk === prevDayName.slice(0,3);
      const matchesNext = wk === nextDayName || wk === nextDayName.slice(0,3);
      return (matchesPrev || matchesNext) && available;
    });
  }

  if (dayAvailability.length === 0) return [];

  // Exceptions
  const exceptions = await storage.getAvailabilityExceptionsByUser(userId);
  const dateStr = new Date(dateInUserTz.format('YYYY-MM-DD')).toISOString().split('T')[0];
  const dateException = exceptions.find((exception: any) => {
    const exceptionDate = new Date(exception.date).toISOString().split('T')[0];
    return exceptionDate === dateStr;
  });
  if (dateException && dateException.type === 'unavailable') return [];

  // Existing bookings for that calendar date in business timezone
  const allBookings = await storage.getBookingsByUser(userId);
  const dateBookings = allBookings.filter((b: any) => {
    if (excludeBookingId && b._id === excludeBookingId) return false;
    const bookingDate = new Date(b.appointmentDate).toISOString().split('T')[0];
    return bookingDate === dateStr;
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


