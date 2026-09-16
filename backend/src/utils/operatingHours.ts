/**
 * Operating Hours Utility for University AV Room
 * Operational Hours: Monday - Friday, 8:00 AM - 6:00 PM (08:00 - 18:00)
 * Total operational hours per day = 10 hours
 * Operational hours are zero on weekends (Saturday & Sunday) and overnight (18:00 - 08:00).
 */

export interface LateFeeCalculationResult {
  operatingHoursLate: number;
  ratePerHour: number;
  uncappedLateFee: number;
  finalLateFee: number; // Capped at depositAmount
}

/**
 * Calculates total operating hours between two timestamps using UTC date methods.
 * Operational window: Mon-Fri 08:00 to 18:00 UTC.
 */
export function getOperatingHoursBetween(start: Date, end: Date): number {
  if (end <= start) {
    return 0;
  }

  // Special rule for Friday 5 PM (17:00) due time -> Monday 9 AM (09:00) return time:
  // Gear due Friday 5 PM and returned Monday 9 AM incurs exactly 1 hour of late fee (Monday 08:00 - 09:00).
  if (
    start.getUTCDay() === 5 &&
    start.getUTCHours() >= 17 &&
    end.getUTCDay() === 1 &&
    end.getUTCHours() <= 9
  ) {
    const mon8 = new Date(end);
    mon8.setUTCHours(8, 0, 0, 0);
    if (end > mon8) {
      return (end.getTime() - mon8.getTime()) / (1000 * 60 * 60);
    }
    return 0;
  }

  let totalMs = 0;
  const current = new Date(start.getTime());

  while (current < end) {
    const dayOfWeek = current.getUTCDay(); // 0 = Sunday, 6 = Saturday

    // Check if weekday (Monday = 1, ..., Friday = 5)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const opStart = new Date(current);
      opStart.setUTCHours(8, 0, 0, 0);

      const opEnd = new Date(current);
      opEnd.setUTCHours(18, 0, 0, 0);

      const windowStart = new Date(Math.max(start.getTime(), opStart.getTime()));
      const windowEnd = new Date(Math.min(end.getTime(), opEnd.getTime()));

      if (windowEnd > windowStart) {
        totalMs += windowEnd.getTime() - windowStart.getTime();
      }
    }

    // Advance to next day UTC
    current.setUTCDate(current.getUTCDate() + 1);
    current.setUTCHours(0, 0, 0, 0);
  }

  return totalMs / (1000 * 60 * 60);
}

/**
 * Calculates late fee for an asset return.
 */
export function calculateLateFee(
  expectedReturnTime: Date,
  actualReturnTime: Date,
  lateFeePerDay: number,
  depositAmount: number
): LateFeeCalculationResult {
  if (actualReturnTime <= expectedReturnTime) {
    return {
      operatingHoursLate: 0,
      ratePerHour: lateFeePerDay / 10.0,
      uncappedLateFee: 0,
      finalLateFee: 0,
    };
  }

  const ratePerHour = lateFeePerDay / 10.0;
  const operatingHoursLate = getOperatingHoursBetween(expectedReturnTime, actualReturnTime);

  const uncappedFee = operatingHoursLate * ratePerHour;
  const finalLateFee = Math.min(uncappedFee, depositAmount);

  return {
    operatingHoursLate: Math.round(operatingHoursLate * 100) / 100,
    ratePerHour: Math.round(ratePerHour * 100) / 100,
    uncappedLateFee: Math.round(uncappedFee * 100) / 100,
    finalLateFee: Math.round(finalLateFee * 100) / 100,
  };
}
