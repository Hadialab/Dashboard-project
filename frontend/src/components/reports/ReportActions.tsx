import { Menu } from "@headlessui/react";
import {
  EllipsisVertical,
  Eye,
  FileDown,
  FileText,
  Printer,
} from "lucide-react";

import exportCsv from "../../utils/exportCsv";
import exportPdf from "../../utils/exportPdf";

const ReportActions = ({
  report,
  filteredData,
  onView,
}) => {
  return (
    <Menu
      as="div"
      className="relative inline-block text-left"
    >
      <Menu.Button
        aria-label={`Actions for ${report.title}`}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
      >
        <EllipsisVertical size={18} />
      </Menu.Button>

      <Menu.Items className="fixed inset-x-3 top-20 z-50 rounded-2xl border border-slate-200 bg-white shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-52 dark:border-slate-800 dark:bg-slate-950">
        <div className="p-2">
          {/* View Details */}
          <Menu.Item>
            {() => (
              <button
                onClick={() => onView(report)}
                className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Eye size={16} className="shrink-0" />
                View Details
              </button>
            )}
          </Menu.Item>

          {/* Export PDF */}
          <Menu.Item>
            {() => (
              <button
                onClick={() => exportPdf(report)}
                className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <FileText size={16} className="shrink-0" />
                Export PDF
              </button>
            )}
          </Menu.Item>

          {/* Export CSV */}
          <Menu.Item>
            {() => (
              <button
                onClick={() => exportCsv(filteredData)}
                className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <FileDown size={16} className="shrink-0" />
                Export CSV
              </button>
            )}
          </Menu.Item>

          {/* Print */}
          <Menu.Item>
            {() => (
              <button
                onClick={() => window.print()}
                className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Printer size={16} className="shrink-0" />
                Print
              </button>
            )}
          </Menu.Item>
        </div>
      </Menu.Items>
    </Menu>
  );
};

export default ReportActions;