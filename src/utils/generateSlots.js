function generateSlots(field) {
  const slots = [];

  const {
    open_time,
    close_time,
  } = field;

  let [openHour, openMinute] =
    open_time.split(":").map(Number);

  let [closeHour, closeMinute] =
    close_time.split(":").map(Number);

  let current = new Date();

  current.setHours(
    openHour,
    openMinute,
    0,
  );

  let end = new Date();

  end.setHours(
    closeHour,
    closeMinute,
    0,
  );

  while (current < end) {

    let next = new Date(current);

    // mặc định 1 tiếng
    next.setMinutes(
      next.getMinutes() + 60
    );

    if (next > end) break;

    slots.push({
      start:
      current
          .toTimeString()
          .slice(0, 5),

      end:
      next
          .toTimeString()
          .slice(0, 5),
    });

    // nhảy 30 phút
    current = new Date(current);

    current.setMinutes(
      current.getMinutes() + 30
    );
  }

  return slots;
}

module.exports = generateSlots;