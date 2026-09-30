/**
 * Client-side calendar and mail helpers.
 *
 * Both work with no server, no API key and no third-party account, which is why
 * they are the default rather than a fallback: opening a .ics file or a
 * mailto: link hands the work to the user's own calendar and mail client.
 */

const pad = (n) => String(n).padStart(2, "0");

// Dates from the API are plain YYYY-MM-DD strings. Convert to the UTC form
// iCalendar requires without letting the local timezone shift the day.
function toIcsDate(dateString, hour = 9) {
  const [year, month, day] = String(dateString).split("-").map(Number);

  if (!year || !month || !day) return null;

  return (
    `${year}${pad(month)}${pad(day)}` +
    `T${pad(hour)}0000Z`
  );
}

// Escapes the characters iCalendar reserves in text values.
function escapeIcs(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// Folds a line to 75 octets, as the spec requires. Long details would
// otherwise make the file unreadable to strict parsers.
//
// Folds repeatedly rather than once. A single split leaves everything past the
// first 75 characters on one continuation line, so a 200-character note still
// produced a 138-character line — exactly the malformed output this exists to
// prevent. Each continuation carries a leading space, which the spec counts
// towards the 75, so the segments are 74 characters wide.
function fold(line) {
  if (line.length <= 75) return line;

  const segments = [];

  for (let index = 0; index < line.length; index += 74) {
    segments.push(line.slice(index, index + 74));
  }

  return segments.join("\r\n ");
}

const TYPE_LABELS = {
  call: "Call",
  email: "Email",
  meeting: "Meeting",
  task: "Task",
};

/**
 * Builds an .ics file for a follow-up and triggers a download.
 * Returns the filename so callers can report it.
 */
export function downloadIcsForFollowUp(followUp, { contact } = {}) {
  const start = toIcsDate(followUp.dueAt);
  if (!start) return null;

  const end = toIcsDate(followUp.dueAt, 10);

  const description = [
    followUp.details,
    contact?.email ? `Contact: ${contact.name} <${contact.email}>` : null,
    followUp.status === "done" ? "Status: done" : null,
  ]
    .filter(Boolean)
    .join("\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CRM Dashboard//Follow-ups//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${followUp.id}@crm-dashboard`,
    `DTSTAMP:${toIcsDate(new Date().toISOString().slice(0, 10))}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcs(`[${TYPE_LABELS[followUp.type] ?? "Task"}] ${followUp.title}`)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    contact?.email ? `ORGANIZER;CN=${escapeIcs(followUp.createdByName ?? "CRM")}:mailto:${followUp.createdByEmail ?? "crm@example.com"}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  const blob = new Blob([lines.map(fold).join("\r\n") + "\r\n"], {
    type: "text/calendar;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const filename = `follow-up-${followUp.id}.ics`;

  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return filename;
}

/**
 * Builds a mailto: link for a follow-up. Opens whatever mail client the user
 * has, so nothing has to be configured on the server.
 */
export function buildMailtoForFollowUp(followUp, contact) {
  if (!contact?.email) return null;

  const subject = `Follow-up: ${followUp.title}`;

  const body = [
    `Reminder regarding ${contact.name ?? "this contact"}.`,
    "",
    `${TYPE_LABELS[followUp.type] ?? "Task"}: ${followUp.title}`,
    `Due: ${followUp.dueAt}`,
    followUp.details || "",
  ]
    .filter(Boolean)
    .join("\n");

  return `mailto:${contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Human label for a follow-up type. */
export function followUpTypeLabel(type) {
  return TYPE_LABELS[type] ?? "Task";
}

/** True when a follow-up is overdue: past its due date and still pending. */
export function isOverdue(followUp) {
  if (followUp.status === "done") return false;
  return String(followUp.dueAt) < new Date().toISOString().slice(0, 10);
}
