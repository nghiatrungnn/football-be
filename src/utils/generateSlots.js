function generateSlots(field) {
  const slots = [];

  const {
    open_time,
    close_time,
    slot_duration,
  } = field;

  let [openHour, openMinute] =
    open_time.split(":").map(Number);

  let [closeHour, closeMinute] =
    close_time.split(":").map(Number);

  let current = new Date();

  current.setHours(openHour, openMinute, 0);

  let end = new Date();

  end.setHours(closeHour, closeMinute, 0);

  while (current < end) {
    let next = new Date(current);

    next.setMinutes(
      next.getMinutes() + slot_duration
    );

    if (next > end) break;

    slots.push({
      start: current.toTimeString().slice(0, 5),
      end: next.toTimeString().slice(0, 5),
    });

    current = next;
  }

  return slots;
}

module.exports = generateSlots;