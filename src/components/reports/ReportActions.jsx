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
      <Menu.Button className="rounded-lg p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800">
        <EllipsisVertical size={18} />
      </Menu.Button>

      <Menu.Items className="absolute right-0 z-50 mt-2 w-48 rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <div className="p-2">
          {/* View Details */}
          <Menu.Item>
            {() => (
              <button
                onClick={() => onView(report)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Eye size={16} />
                View Details
              </button>
            )}
          </Menu.Item>

          {/* Export PDF */}
          <Menu.Item>
            {() => (
              <button
                onClick={() => exportPdf(report)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <FileText size={16} />
                Export PDF
              </button>
            )}
          </Menu.Item>

          {/* Export CSV */}
          <Menu.Item>
            {() => (
              <button
                onClick={() => exportCsv(filteredData)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <FileDown size={16} />
                Export CSV
              </button>
            )}
          </Menu.Item>

          {/* Print */}
          <Menu.Item>
            {() => (
              <button
                onClick={() => window.print()}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Printer size={16} />
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