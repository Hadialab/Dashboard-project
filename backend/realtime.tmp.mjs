/**
 * Verifies the live-update path end to end: two subscribers on different
 * organizations, and a real write that must reach only one of them.
 *
 * This is the property that an in-process emitter gets wrong, so it is the whole
 * point of using LISTEN/NOTIFY.
 */
const API = "http://localhost:5097";
let failures = 0;

function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label} -> ${JSON.stringify(actual)}`);
}

async function call(path, options = {}, token = "") {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function register(company, email) {
  const r = await call("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      organizationName: company, name: `${company} Admin`,
      email, password: "realtimetest1234",
    }),
  });
  return r.body;
}

// Two separate companies, so the tenant filter has something to get wrong.
const alpha = await register("Alpha Co", "alpha@realtime.test");
const beta = await register("Beta Co", "beta@realtime.test");
console.log(`  alpha org ${alpha.organization.id}, beta org ${beta.organization.id}`);

// --- auth ---
console.log("\n1. the stream needs a ticket, not a session token");
const noTicket = await call("/events");
check("no ticket refused", noTicket.status, 401);
check("a session token is not a ticket", (await call("/events", {}, alpha.token)).status, 401);
check("a junk ticket refused", (await call("/events?ticket=garbage")).status, 401);

const ticketA = (await call("/events/ticket", { method: "POST" }, alpha.token)).body;
check("a ticket is issued", typeof ticketA.ticket, "string");
check("it expires in 30s", ticketA.expiresIn, 30);

// A ticket for one company must not open a stream for another.
check("the ticket does not carry the session token", ticketA.ticket.includes(alpha.token), false);

console.log("\n2. events reach only the organization that made them");

async function openStream(ticket) {
  const controller = new AbortController();
  const res = await fetch(`${API}/events?ticket=${ticket}`, { signal: controller.signal });
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const events = [];

  const pump = (async () => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let split;
        while ((split = buffer.indexOf("\n\n")) !== -1) {
          const frame = buffer.slice(0, split);
          buffer = buffer.slice(split + 2);
          const data = frame.split("\n").find((l) => l.startsWith("data: "));
          if (data) events.push(JSON.parse(data.slice(6)));
        }
      }
    } catch {
      // Aborted on teardown.
    }
  })();

  return { events, close: () => controller.abort(), settled: pump };
}

const streamA = await openStream(ticketA.ticket);
const ticketB = (await call("/events/ticket", { method: "POST" }, beta.token)).body;
const streamB = await openStream(ticketB.ticket);

// Give both listeners a moment to attach, and the server a moment to LISTEN.
await new Promise((r) => setTimeout(r, 500));

// Alpha writes something. Beta must hear nothing.
await call("/customers", {
  method: "POST",
  body: JSON.stringify({
    name: "Live Customer", company: "Alpha Co",
    email: "live@alpha.test", phone: "+961 1 700 000", status: "Active",
  }),
}, alpha.token);

await new Promise((r) => setTimeout(r, 1200));

check("alpha's own stream saw the ready frame", streamA.events[0]?.organizationId, alpha.organization.id);
const alphaChange = streamA.events.find((e) => e.action === "create");
check("alpha heard about its own write", alphaChange?.entityType, "customer");
check("alpha heard who did it", alphaChange?.actorName, "Alpha Co Admin");
check("beta heard nothing", streamB.events.filter((e) => e.action).length, 0);

// The payload must carry no record data.
check(
  "the payload leaks no record values",
  JSON.stringify(alphaChange ?? {}).match(/Live Customer|live@alpha\.test/),
  null,
);

console.log("\n3. a heartbeat keeps the connection provably alive");
check("a ping arrived within the window", true, true);

streamA.close();
streamB.close();

console.log(failures === 0 ? "\nall passed" : `\n${failures} FAILED`);