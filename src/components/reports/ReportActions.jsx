import { Menu } from "@headlessui/react";
import {
  EllipsisVertical,
  Eye,
  FileDown,
  Printer,
  FileText,
} from "lucide-react";

import exportPdf from "../../utils/exportPdf";

const ReportActions = ({ report, onView }) => {
  return (
    <Menu as="div" className="relative inline-block text-left">
      <Menu.Button className="rounded-lg p-2 transition hover:bg-gray-100 dark:hover:bg-gray-800">
        <EllipsisVertical size={18} />
      </Menu.Button>

      <Menu.Items className="absolute right-0 z-50 mt-2 w-48 rounded-xl border bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
        <div className="p-2">

          <Menu.Item>
            {() => (
              <button
                onClick={() => onView(report)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <Eye size={16} />
                View Details
              </button>
            )}
          </Menu.Item>

          <Menu.Item>
            {() => (
              <button
                onClick={() => exportPdf(report)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <FileText size={16} />
                Export PDF
              </button>
            )}
          </Menu.Item>

          <Menu.Item>
            {() => (
              <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800">
                <FileDown size={16} />
                Export CSV
              </button>
            )}
          </Menu.Item>

          <Menu.Item>
            {() => (
              <button
                onClick={() => window.print()}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800"
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