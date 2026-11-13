// Web has no push, so the daily reminder goes into the person's own calendar as a repeating event.
export function downloadReminderIcs(hour: number, title: string, url: string) {
  const d = new Date(); d.setHours(hour, 0, 0, 0);
  if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1);
  const p = (n: number) => String(n).padStart(2, '0');
  const local = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(hour)}0000`;
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ODDO//Reminder//EN', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', `UID:oddo-daily-${now}@oddo-app`, `DTSTAMP:${now}`, `DTSTART:${local}`, 'DURATION:PT10M',
    'RRULE:FREQ=DAILY', `SUMMARY:${title}`, `DESCRIPTION:${url}`, `URL:${url}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${title}`, 'TRIGGER:PT0M', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  a.download = 'oddo-erinnerung.ics';
  document.body.appendChild(a); a.click(); a.remove();
}
