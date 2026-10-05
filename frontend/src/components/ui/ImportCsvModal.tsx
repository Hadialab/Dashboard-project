import { useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileUp } from "lucide-react";
import type { ChangeEvent } from "react";

import Modal from "../ui/Modal";
import Button from "../ui/Button";
import Select from "../ui/Select";
import ProgressBar from "./ProgressBar";
import { customerSchema } from "../../validation/customerSchema";
import { leadSchema } from "../../validation/leadSchema";
import { createCustomer } from "../../services/customerService";
import { createLead } from "../../services/leadService";
import {
  CUSTOMER_STATUSES,
  LEAD_SOURCES,
  LEAD_STATUSES,
  firstOr,
  isOneOf,
} from "../../utils/crmConstants";
import { getApiErrorMessage } from "../../utils/apiError";
import type { Customer, Lead } from "../../types";

/**
 * papaparse is a few tens of KB and only needed when someone actually imports a
 * file, so it is pulled in on demand rather than sitting in the route chunk.
 *
 * It ships no types, so the one call is typed at the boundary. `default` is used
 * because the package is CJS and the ESM interop wrapper hangs it there.
 */
const loadPapa = () =>
  import("papaparse").then((m) =>
    (m.default ?? m) as unknown as typeof import("papaparse"),
  );

type Resource = "customer" | "lead";

/** The fields an import can fill, per resource. Drives the mapping dropdowns. */
const FIELD_SETS: Record<Resource, string[]> = {
  customer: ["name", "company", "email", "phone", "status"],
  lead: ["name", "company", "email", "phone", "status", "source"],
};

const LABELS: Record<string, string> = {
  name: "Name",
  company: "Company",
  email: "Email",
  phone: "Phone",
  status: "Status",
  source: "Source",
};

/** One parsed CSV line, keyed by its header text. */
type CsvRow = Record<string, string>;

/**
 * Guesses the mapping from CSV headers to fields.
 *
 * Only ever proposes a mapping — the user confirms or corrects it, because a
 * wrong guess silently writes bad data. Matching is on a normalised header so
 * "Email Address", "email_address" and "EMAIL" all land on the email field.
 */
function guessMapping(headers: string[], fields: string[]): Record<string, string> {
  const normalise = (value: string) => value.toLowerCase().replace(/[^a-z]/g, "");

  const mapping: Record<string, string> = {};
  for (const field of fields) {
    const target = normalise(field);
    const match = headers.find((header) => {
      const candidate = normalise(header);
      return candidate === target || candidate.includes(target);
    });

    if (match) mapping[field] = match;
  }

  return mapping;
}

/** Per-field messages from a rejected row, or null when it validated. */
type RowValidation =
  | { value: (Partial<Customer> & Partial<Lead>) | null; errors: Record<string, string> | null };

/** Validates one row against the same schema the single-create form uses. */
async function validateRow(resource: Resource, row: Record<string, string>): Promise<RowValidation> {
  const schema = resource === "customer" ? customerSchema : leadSchema;

  try {
    const value = (await schema.validate(row, { abortEarly: false })) as Record<string, string>;

    // Status and source are free text in the CSV; snap them to a real value
    // rather than letting an unrecognised one through to be stored. isOneOf is
    // used because the constant lists are literal unions, so a plain
    // `includes` cannot be handed an arbitrary string.
    if (value.status) {
      const allowed = resource === "customer" ? CUSTOMER_STATUSES : LEAD_STATUSES;
      value.status = isOneOf(allowed, value.status) ? value.status : firstOr(allowed, value.status);
    }

    if (value.source) {
      value.source = isOneOf(LEAD_SOURCES, value.source)
        ? value.source
        : firstOr(LEAD_SOURCES, value.source);
    }

    return { value: value as RowValidation["value"], errors: null };
  } catch (err) {
    // Yup's abortEarly:false puts every field's error in `inner`, keyed by path.
    // Without abortEarly there would be exactly one, and this would show only
    // the first thing wrong with a row.
    const errors: Record<string, string> = {};
    const inner = (err as { inner?: { path?: string; message: string }[] }).inner ?? [];

    for (const error of inner) {
      if (error.path) errors[error.path] = error.message;
    }

    return { value: null, errors };
  }
}

type Step = "pick" | "map" | "review" | "importing" | "done";

type ImportResult = {
  ok: number;
  failed: { name: string; message: string }[];
};

type ImportCsvModalProps = {
  open: boolean;
  onClose: () => void;
  resource?: Resource;
  /** Existing emails, used to flag a duplicate rather than silently creating one. */
  existingEmails?: readonly string[];
};

/**
 * CSV import with a mapping step and a validation preview.
 *
 * The order is deliberate: map, then review, then import. Nothing is written
 * until the user has seen exactly which rows will be created and which will be
 * skipped, because an import that half-works and reports "done" is the worst
 * possible outcome — the user has no idea which records now exist.
 */
function ImportCsvModal({
  open,
  onClose,
  resource = "customer",
  existingEmails = [],
}: ImportCsvModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("pick");
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [validation, setValidation] = useState<Record<number, RowValidation>>({});
  const [duplicates, setDuplicates] = useState<Set<number>>(new Set());
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");

  const fields = FIELD_SETS[resource];
  const noun = resource === "customer" ? "customers" : "leads";

  function reset() {
    setStep("pick");
    setRows([]);
    setHeaders([]);
    setFileName("");
    setMapping({});
    setValidation({});
    setDuplicates(new Set());
    setProgress({ done: 0, total: 0 });
    setResult(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function close() {
    reset();
    onClose();
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setFileName(file.name);

    try {
      const Papa = await loadPapa();

      Papa.parse<CsvRow>(file, {
        header: true,
        // Left to the field schemas: trimming here would hide a stray space that
        // would otherwise be caught and reported.
        skipEmptyLines: "greedy",
        complete: (parsed) => {
          const parsedHeaders = (parsed.meta?.fields ?? []).filter(Boolean);
          const data = (parsed.data ?? []).filter((row) =>
            Object.values(row).some((value) => String(value ?? "").trim() !== ""),
          );

          if (data.length === 0) {
            setError("That file has no data rows.");
            return;
          }

          setHeaders(parsedHeaders);
          setRows(data);
          setMapping(guessMapping(parsedHeaders, fields));
          setStep("map");
        },
        error: (parseError: { message: string }) => {
          setError(`Could not read the file: ${parseError.message}`);
        },
      });
    } catch {
      setError("Could not read the file.");
    }
  }

  /**
   * Validates every row and marks duplicates.
   *
   * Runs when leaving the mapping step, so the review table shows the real
   * outcome rather than a guess. Duplicates are flagged but not blocked: one
   * person can legitimately hold two records, and the server does not enforce
   * email uniqueness, so making that a hard rule here would invent a constraint.
   */
  const reviewRows = useMemo(() => {
    return rows.map((row, index) => {
      const mapped: Record<string, string> = {};

      for (const field of fields) {
        const header = mapping[field];
        if (header) mapped[field] = String(row[header] ?? "").trim();
      }

      return { index, source: row, mapped };
    });
  }, [rows, mapping, fields]);

  async function handleReview() {
    setStep("review");
    setError("");
    setValidation({});
    setDuplicates(new Set());

    const known = new Set(existingEmails.map((value) => String(value).toLowerCase()));
    const found = new Set<number>();
    const results: Record<number, RowValidation> = {};

    for (const row of reviewRows) {
      const outcome = await validateRow(resource, row.mapped);
      results[row.index] = outcome;

      const email = row.mapped.email?.toLowerCase();
      if (email && known.has(email)) found.add(row.index);
    }

    setValidation(results);
    setDuplicates(found);
  }

  const validRows = reviewRows.filter(
    (row) => validation[row.index]?.value && !duplicates.has(row.index),
  );
  const invalidRows = reviewRows.filter((row) => validation[row.index]?.errors);
  const duplicateRows = reviewRows.filter((row) => duplicates.has(row.index));

  /**
   * The two create functions do not agree: createLead returns the created row
   * while createCustomer returns the whole Axios response. Only the throw matters
   * here — the row is re-fetched by the table — so both are wrapped to a
   * uniform `(payload) => Promise<void>`. The day createCustomer is made to
   * match, this collapses to one function.
   */
  const create = async (payload: NonNullable<RowValidation["value"]>): Promise<void> => {
    if (resource === "customer") {
      await createCustomer(payload);
    } else {
      await createLead(payload);
    }
  };

  async function handleImport() {
    setStep("importing");
    setProgress({ done: 0, total: validRows.length });

    let ok = 0;
    const failed: ImportResult["failed"] = [];

    for (const [index, row] of validRows.entries()) {
      try {
        await create(validation[row.index]!.value!);
        ok += 1;
      } catch (createError) {
        failed.push({
          name: row.mapped.name ?? `Row ${row.index + 1}`,
          message: getApiErrorMessage(createError, "Could not be created."),
        });
      }

      setProgress({ done: index + 1, total: validRows.length });

      // Hand control back periodically so the bar actually moves. Every row,
      // not every fifth: the setState above only paints if the event loop gets
      // a turn, and a 200-row file with no yield renders one frozen 0%.
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    setResult({ ok, failed });
    setStep("done");
  }

  return (
    <Modal
      open={open}
      onClose={close}
      size="lg"
      title={`Import ${noun} from CSV`}
      description={
        step === "pick"
          ? "Upload a CSV and map its columns before anything is saved."
          : undefined
      }
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            {step === "done" ? "Close" : "Cancel"}
          </Button>

          {step === "map" && (
            <Button onClick={handleReview} disabled={Object.keys(mapping).length === 0}>
              Review {rows.length} rows
            </Button>
          )}

          {step === "review" && (
            <Button onClick={handleImport} disabled={validRows.length === 0}>
              Import {validRows.length} {validRows.length === 1 ? "record" : "records"}
            </Button>
          )}
        </>
      }
    >
      {/* ===== 1. Pick a file ===== */}
      {step === "pick" && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFile}
            className="sr-only"
            id="csv-input"
          />

          <label
            htmlFor="csv-input"
            className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-300 p-6 text-center transition hover:border-blue-500 dark:border-slate-700"
          >
            <FileUp size={28} className="text-slate-400" aria-hidden="true" />

            <span className="text-sm font-medium text-slate-900 dark:text-white">
              Choose a CSV file
            </span>

            <span className="text-xs text-slate-500 dark:text-slate-400">
              The first row must be column headers. Nothing is saved until you
              confirm the preview.
            </span>
          </label>

          {fileName && (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              Selected: {fileName}
            </p>
          )}

          {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
        </div>
      )}

      {/* ===== 2. Map columns ===== */}
      {step === "map" && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Match each field to a column in <strong>{fileName}</strong>. Anything
            left as &ldquo;ignore&rdquo; will not be saved.
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {fields.map((field) => (
              <Select
                key={field}
                name={`map-${field}`}
                label={LABELS[field]}
                value={mapping[field] ?? ""}
                onChange={(event) =>
                  setMapping((prev) => ({ ...prev, [field]: event.target.value }))
                }
              >
                <option value="">Ignore this field</option>
                {headers.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </Select>
            ))}
          </div>

          {Object.keys(mapping).length === 0 && (
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Map at least one field to continue.
            </p>
          )}
        </div>
      )}

      {/* ===== 3. Review ===== */}
      {step === "review" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <SummaryTile
              tone="good"
              value={validRows.length}
              label="Will be imported"
            />
            <SummaryTile
              tone="warn"
              value={duplicateRows.length}
              label="Duplicate email"
            />
            <SummaryTile
              tone="bad"
              value={invalidRows.length}
              label="Will be skipped"
            />
          </div>

          {duplicateRows.length > 0 && (
            <p className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>
                {duplicateRows.length} row(s) use an email that already exists.
                They are held back so you can decide — change the file and
                re-upload, or import them anyway from the table.
              </span>
            </p>
          )}

          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="w-full min-w-max text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Row</th>

                  {fields.map((field) => (
                    <th key={field} className="px-3 py-2 text-left font-semibold">
                      {LABELS[field]}
                    </th>
                  ))}

                  <th className="px-3 py-2 text-left font-semibold">Result</th>
                </tr>
              </thead>

              <tbody>
                {reviewRows.map((row) => {
                  const rowErrors = validation[row.index]?.errors;
                  const isDuplicate = duplicates.has(row.index);
                  const isValid = validation[row.index]?.value && !isDuplicate;

                  return (
                    <tr
                      key={row.index}
                      className={[
                        "border-b border-slate-100 dark:border-slate-800",
                        rowErrors
                          ? "bg-red-50 dark:bg-red-950/30"
                          : isDuplicate
                            ? "bg-amber-50 dark:bg-amber-950/30"
                            : "",
                      ].join(" ")}
                    >
                      <td className="px-3 py-2 text-slate-500">{row.index + 1}</td>

                      {fields.map((field) => (
                        <td
                          key={field}
                          className="max-w-40 truncate px-3 py-2 text-slate-700 dark:text-slate-200"
                        >
                          {row.mapped[field] || "—"}
                        </td>
                      ))}

                      <td className="px-3 py-2">
                        {rowErrors ? (
                          <span className="text-xs text-rose-600">
                            {Object.values(rowErrors)[0]}
                          </span>
                        ) : isDuplicate ? (
                          <span className="text-xs text-amber-700 dark:text-amber-300">
                            Duplicate email
                          </span>
                        ) : isValid ? (
                          <CheckCircle2
                            size={16}
                            className="text-emerald-600"
                            role="img"
                            aria-label="Ready to import"
                          />
                        ) : (
                          <span className="text-xs text-slate-400">Checking…</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== 4. Importing ===== */}
      {step === "importing" && (
        <div className="py-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Creating {progress.total} records…
          </p>

          <ProgressBar value={progress.done} total={progress.total} />

          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {progress.done} of {progress.total}
          </p>
        </div>
      )}

      {/* ===== 5. Done ===== */}
      {step === "done" && result && (
        <div className="space-y-3 py-2">
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            Imported {result.ok} of {progress.total}.
          </p>

          {result.failed.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/40">
              <p className="text-sm text-red-800 dark:text-red-200">
                {result.failed.length} could not be created:
              </p>

              <ul className="mt-2 space-y-1">
                {result.failed.slice(0, 8).map((failure, index) => (
                  <li
                    key={index}
                    className="text-xs text-red-700 dark:text-red-300"
                  >
                    {failure.name} — {failure.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {invalidRows.length + duplicateRows.length > 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {invalidRows.length} row(s) failed validation and{" "}
              {duplicateRows.length} were held back as duplicates. Neither was
              saved.
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}

type TileTone = "good" | "warn" | "bad";

const TILE_TONES: Record<TileTone, string> = {
  good: "text-emerald-700 dark:text-emerald-400",
  warn: "text-amber-700 dark:text-amber-400",
  bad: "text-rose-700 dark:text-rose-400",
};

function SummaryTile({ value, label, tone }: { value: number; label: string; tone: TileTone }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 text-center dark:border-slate-800">
      <p className={`text-xl font-semibold ${TILE_TONES[tone]}`}>{value}</p>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

export default ImportCsvModal;