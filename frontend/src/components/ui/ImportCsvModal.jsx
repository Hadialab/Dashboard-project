import { useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileUp } from "lucide-react";

import Modal from "../ui/Modal";
import Button from "../ui/Button";
import Select from "../ui/Select";
import ProgressBar from "./ProgressBar";
import { customerSchema } from "../../validation/customerSchema";
import { leadSchema } from "../../validation/leadSchema";
import { createCustomer } from "../../services/customerService";
import { createLead } from "../../services/leadService";
import { CUSTOMER_STATUSES, LEAD_STATUSES, LEAD_SOURCES } from "../../utils/crmConstants";

// papaparse is a few tens of KB and only needed when someone actually imports a
// file, so it is pulled in on demand rather than sitting in the route chunk.
const loadPapa = () => import("papaparse").then((m) => m.default);

// The fields an import can fill, per resource. Used to build the mapping
// dropdowns and to decide what the preview table shows.
const FIELD_SETS = {
  customer: ["name", "company", "email", "phone", "status"],
  lead: ["name", "company", "email", "phone", "status", "source"],
};

const LABELS = {
  name: "Name",
  company: "Company",
  email: "Email",
  phone: "Phone",
  status: "Status",
  source: "Source",
};

/**
 * Guesses the mapping from CSV headers to fields.
 *
 * Only ever proposes a mapping — the user confirms or corrects it, because a
 * wrong guess silently writes bad data. Matching is on a normalised header so
 * "Email Address", "email_address" and "EMAIL" all land on the email field.
 */
function guessMapping(headers, fields) {
  const normalise = (value) => value.toLowerCase().replace(/[^a-z]/g, "");

  const mapping = {};
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

/** Validates one row against the same schema the single-create form uses. */
async function validateRow(resource, row) {
  const schema = resource === "customer" ? customerSchema : leadSchema;

  try {
    const value = await schema.validate(row, { abortEarly: false });

    // Status and source are free text in the CSV; snap them to a real value
    // rather than letting an unrecognised one through to be stored.
    if (value.status) {
      const allowed = resource === "customer" ? CUSTOMER_STATUSES : LEAD_STATUSES;
      value.status = allowed.includes(value.status) ? value.status : allowed[0];
    }

    if (value.source) {
      value.source = LEAD_SOURCES.includes(value.source) ? value.source : LEAD_SOURCES[0];
    }

    return { value, errors: null };
  } catch (err) {
    const errors = {};
    err.inner?.forEach((error) => {
      errors[error.path] = error.message;
    });

    return { value: null, errors };
  }
}

/**
 * CSV import with a mapping step and a validation preview.
 *
 * The order is deliberate: map, then review, then import. Nothing is written
 * until the user has seen exactly which rows will be created and which will be
 * skipped, because an import that half-works and reports "done" is the worst
 * possible outcome — the user has no idea which records now exist.
 */
function ImportCsvModal({ open, onClose, resource = "customer", existingEmails = [] }) {
  const fileInputRef = useRef(null);

  const [step, setStep] = useState("pick");
  const [rows, setRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [fileName, setFileName] = useState("");
  const [mapping, setMapping] = useState({});
  const [validation, setValidation] = useState({});
  const [duplicates, setDuplicates] = useState(new Set());
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState(null);
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

  async function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setFileName(file.name);

    try {
      const Papa = await loadPapa();

      Papa.parse(file, {
        header: true,
        // Left to the field schemas: trimming here would hide a stray space that
        // would otherwise be caught and reported.
        skipEmptyLines: "greedy",
        complete: (parsed) => {
          const parsedHeaders = (parsed.meta?.fields ?? []).filter(Boolean);
          const data = (parsed.data ?? []).filter(
            (row) => Object.values(row).some((value) => String(value ?? "").trim() !== ""),
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
        error: (parseError) => {
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
      const mapped = {};

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
    const found = new Set();
    const results = {};

    for (const row of reviewRows) {
      const { value, errors } = await validateRow(resource, row.mapped);
      results[row.index] = { value, errors };

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

  const create = resource === "customer" ? createCustomer : createLead;

  async function handleImport() {
    setStep("importing");
    setProgress({ done: 0, total: validRows.length });

    let ok = 0;
    const failed = [];

    for (const [index, row] of validRows.entries()) {
      try {
        await create(validation[row.index].value);
        ok += 1;
      } catch (createError) {
        failed.push({
          name: row.mapped.name ?? `Row ${row.index + 1}`,
          message: createError.response?.data?.error ?? "Could not be created.",
        });
      }

      setProgress({ done: index + 1, total: validRows.length });

      // Hand control back periodically so the bar actually moves.
      if ((index + 1) % 5 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
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
            <Button
              onClick={handleImport}
              disabled={validRows.length === 0}
            >
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

function SummaryTile({ value, label, tone }) {
  const tones = {
    good: "text-emerald-700 dark:text-emerald-400",
    warn: "text-amber-700 dark:text-amber-400",
    bad: "text-rose-700 dark:text-rose-400",
  };

  return (
    <div className="rounded-lg border border-slate-200 p-3 text-center dark:border-slate-800">
      <p className={`text-xl font-semibold ${tones[tone]}`}>{value}</p>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

export default ImportCsvModal;
