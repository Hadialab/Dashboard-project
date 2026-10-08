import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";

import { getLeads,createLead,updateLead,deleteLead,convertLead } from "../services/leadService";
import { getCustomers } from "../services/customerService";
import { CONVERTED_STATUS, LEAD_STATUSES } from "../utils/crmConstants";
import { isMine } from "../utils/myWork";
import useAuthStore from "../store/authStore";
import useRowSelection from "../hooks/useRowSelection";
import usePermissions from "../hooks/usePermissions";
import { bulkSetLeadStatus, bulkDeleteLeads } from "../services/bulkService";
import { useNotificationGenerator } from "../services/notificationService";
import BulkActionBar from "../components/ui/BulkActionBar";
import ErrorState from "../components/ui/ErrorState";
import ImportCsvModal from "../components/ui/ImportCsvModal";

import LeadsHeader from "../components/leads/LeadsHeader";
import LeadsToolbar from "../components/leads/LeadsToolbar";
import LeadsTable from "../components/leads/LeadsTable";
import LeadPagination from "../components/leads/LeadPagination";
import AddLeadModal from "../components/leads/AddLeadModal";
import ConvertLeadModal from "../components/leads/ConvertLeadModal";
import DeleteLeadModal from "../components/leads/DeleteLeadModal";
import LeadDetailDrawer from "../components/leads/LeadDetailDrawer";
import LeadTableSkeleton from "../components/leads/LeadTableSkeleton";
import EmptyState from "../components/leads/EmptyState";
import { useLiveUpdates } from "../hooks/useLiveUpdates";
import type { Scope } from "../components/ui/ScopeToggle";
import type { Customer, Lead } from "../types";

function Leads() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [leads, setLeads] = useState<Lead[]>([]);

  const [loading, setLoading] = useState(true);
  // Held in state rather than just logged, so a failed load can be told apart
  // from an empty list. Typed as unknown because it is only ever read by
  // handing it back to the console.
  const [loadError, setLoadError] = useState<unknown>(null);

  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || ""
  );

  const [statusFilter, setStatusFilter] = useState(
    searchParams.get("status") || "All"
  );

  const [sourceFilter, setSourceFilter] = useState(
    searchParams.get("source") || "All"
  );

  // Converted leads are kept for history, so "include" is the default: a lead
  // that converts should not appear to have vanished.
  const [convertedFilter, setConvertedFilter] = useState(
    searchParams.get("converted") || "include"
  );

  // "all" or "mine". Meaningful for an admin, who can otherwise only ever see
  // the whole team; a rep scoped to their own records sees the same list either
  // way, so the control is hidden for them rather than shown as a no-op.
  const [scope, setScope] = useState<Scope>(
    (searchParams.get("scope") as Scope) || "all"
  );
  const currentUser = useAuthStore((state) => state.user);
  const selection = useRowSelection();
  const { can } = usePermissions();

  // The bar offers both actions, so each is gated separately: someone allowed
  // to change a lead's status is not automatically allowed to delete one.
  const canBulkEdit = can("leads", "edit");
  const canBulkDelete = can("leads", "delete");
  const canCreate = can("leads", "create");

  const [isImportOpen, setIsImportOpen] = useState(false);
  const notifications = useNotificationGenerator();

  const [leadToConvert, setLeadToConvert] = useState<Lead | null>(null);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);

  // Deep link from elsewhere in the app â€” the dashboard's "needs attention"
  // widget, the command palette, a notification â€” lands on /leads?open=l001 and
  // opens that lead's drawer. Cleared afterwards so a later refresh does not
  // reopen it over whatever the user has navigated to since.
  const openLeadId = searchParams.get("open");

  const [sortBy, setSortBy] = useState(
    searchParams.get("sort") || "newest"
  );

  const [currentPage, setCurrentPage] = useState(
    Number(searchParams.get("page")) || 1
  );

  const [rowsPerPage, setRowsPerPage] = useState(
    Number(searchParams.get("rows")) || 5
  );

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Declared in component scope, not inside the effect below, because the error
  // state's "Try again" button needs to call it.
  const fetchLeads = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const leadData = await getLeads();
      setLeads(leadData);
    } catch (error) {
      // Kept in state, not just logged. Without it the page falls through to the
      // empty state and reports "no leads yet" for what is actually a dead API.
      console.error("Failed to fetch leads:", error);
      setLoadError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Emails already in use, for the duplicate warnings on creating a lead and on
  // CSV import. Leads plus customers, because a lead whose email is already a
  // customer is exactly the duplicate worth catching.
  //
  // Customer emails are also kept separately, because the conversion warning
  // means something narrower: it asks "is this person already a customer?". Hand
  // it the merged list and every lead matches its own email, so the warning sits
  // there permanently and stops meaning anything.
  //
  // A failure here is swallowed: a missing warning is better than a page that
  // will not load.
  const [knownEmails, setKnownEmails] = useState<string[]>([]);
  const [customerEmails, setCustomerEmails] = useState<string[]>([]);

  // Refetch when someone else changes a lead. A refetch rather than a local patch,
  // because a conversion can change a lead's status *and* create a customer, and
  // only the server knows both happened.
  useLiveUpdates(() => {
    fetchLeads();
  }, ["lead"]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const leadEmails = leads.map((lead) => lead.email).filter(Boolean);

      try {
        const response = await getCustomers({ page: 1, limit: 1000 });
        // The second and third arms never fire in practice — this call always
        // asks for a page, so the API answers with the envelope and `.data` is
        // the rows. Kept as written, and cast, because the fallback arm is typed
        // as the envelope rather than the rows.
        const rows = (response.data?.data ?? response.data ?? []) as Customer[];
        const fromCustomers = rows.map((row) => row.email).filter(Boolean);

        if (!cancelled) {
          setKnownEmails([...leadEmails, ...fromCustomers]);
          setCustomerEmails(fromCustomers);
        }
      } catch {
        if (!cancelled) setKnownEmails(leadEmails);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [leads]);

  useEffect(() => {
    // Built up key by key, so only the filters that differ from their default
    // reach the URL. The page and row counts are numbers; createSearchParams
    // stringifies every value on the way into URLSearchParams, so the cast is
    // what the runtime already does rather than a change in behaviour.
    const params: Record<string, string | number> = {};

    if (searchTerm) params.search = searchTerm;
    if (statusFilter !== "All") params.status = statusFilter;
    if (sourceFilter !== "All") params.source = sourceFilter;
    if (convertedFilter !== "include") params.converted = convertedFilter;
    if (scope !== "all") params.scope = scope;
    if (sortBy !== "newest") params.sort = sortBy;
    if (currentPage !== 1) params.page = currentPage;
    if (rowsPerPage !== 5) params.rows = rowsPerPage;

    setSearchParams(params as Record<string, string>);
  }, [
    searchTerm,
    statusFilter,
    sourceFilter,
    convertedFilter,
    scope,
    sortBy,
    currentPage,
    rowsPerPage,
    setSearchParams,
  ]);

  const filteredLeads = useMemo(() => {
    let filtered = [...leads];

    if (scope === "mine") {
      filtered = filtered.filter((lead) => isMine(lead, currentUser));
    }

    if (searchTerm) {
      const query = searchTerm.toLowerCase();

      filtered = filtered.filter(
        (lead) =>
          lead.name.toLowerCase().includes(query) ||
          lead.company.toLowerCase().includes(query) ||
          lead.email.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== "All") {
      filtered = filtered.filter(
        (lead) => lead.status === statusFilter
      );
    }

    if (sourceFilter !== "All") {
      filtered = filtered.filter(
        (lead) => lead.source === sourceFilter
      );
    }

    // Applied after the status filter, so "status = Converted" and
    // "only converted" agree with each other rather than fighting.
    if (convertedFilter === "all") {
      filtered = filtered.filter(
        (lead) => lead.status !== CONVERTED_STATUS
      );
    } else if (convertedFilter === "only") {
      filtered = filtered.filter(
        (lead) => lead.status === CONVERTED_STATUS
      );
    }

    switch (sortBy) {
      case "oldest":
        // `.getTime()` on both sides because `-` on two Date objects is not
        // something TypeScript allows, and it is what the runtime does anyway.
        filtered.sort(
          (a, b) =>
            new Date(a.createdDate!).getTime() - new Date(b.createdDate!).getTime()
        );
        break;

      case "name-asc":
        filtered.sort((a, b) =>
          a.name.localeCompare(b.name)
        );
        break;

      case "name-desc":
        filtered.sort((a, b) =>
          b.name.localeCompare(a.name)
        );
        break;

      case "company-asc":
        filtered.sort((a, b) =>
          a.company.localeCompare(b.company)
        );
        break;

      case "company-desc":
        filtered.sort((a, b) =>
          b.company.localeCompare(a.company)
        );
        break;

      default:
        filtered.sort(
          (a, b) =>
            new Date(b.createdDate!).getTime() - new Date(a.createdDate!).getTime()
        );
    }

    return filtered;
  }, [
    leads,
    searchTerm,
    statusFilter,
    sourceFilter,
    convertedFilter,
    scope,
    currentUser,
    sortBy,
  ]);

  const totalPages = Math.ceil(
    filteredLeads.length / rowsPerPage
  );

  const paginatedLeads = filteredLeads.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Drop any selection whose row is no longer on screen, so a filter change or
  // a page turn can never leave the bulk bar acting on rows the user has not
  // seen.
  useEffect(() => {
    selection.sync(paginatedLeads);
  }, [paginatedLeads, selection.sync]);

  // Opens a lead requested by ?open=. Runs once the data has arrived, and only
  // for a lead this user can actually see â€” an id they cannot see is simply
  // ignored rather than producing an error.
  useEffect(() => {
    if (!openLeadId || loading || leads.length === 0) return;

    const match = leads.find((lead) => lead.id === openLeadId);
    if (!match) return;

    setSelectedLead(match);
    setIsDrawerOpen(true);

    const params = new URLSearchParams(searchParams);
    params.delete("open");
    setSearchParams(params, { replace: true });
  }, [openLeadId, loading, leads, searchParams, setSearchParams]);

 const handleAddLead = async (lead: Partial<Lead>) => {
  try {
    const newLead = {
      ...lead,
      createdDate: new Date().toISOString().split("T")[0],
    };

    const createdLead = await createLead(newLead);

    setLeads((prev) => [createdLead, ...prev]);

    notifications.leadCreated(createdLead);

    toast.success("Lead added successfully");
  } catch (error) {
    console.error("Failed to add lead:", error);
    toast.error("Failed to add lead");
  }
};

 const handleUpdateLead = async (updatedLead: Lead) => {
  try {
    const updated = await updateLead(updatedLead.id, updatedLead);

    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === updated.id ? updated : lead
      )
    );

    toast.success("Lead updated successfully");
  } catch (error) {
    console.error("Failed to update lead:", error);
    toast.error("Failed to update lead");
  }
};

  const handleDeleteLead = async (id: string) => {
  try {
    await deleteLead(id);

    setLeads((prev) =>
      prev.filter((lead) => lead.id !== id)
    );

    toast.success("Lead deleted successfully");
  } catch (error) {
    console.error("Failed to delete lead:", error);
    toast.error("Failed to delete lead");
  }
};

  const handleConvertLead = async (customerFields: Partial<Customer>) => {
    // Only reachable from the modal, which is rendered with `lead={leadToConvert}`,
    // so it is null only if the modal could submit with nothing selected. Reading
    // `.id` off it directly threw a TypeError inside an async handler, which is an
    // unhandled rejection rather than anything the modal can display — so the user
    // saw the dialog do nothing. Returning early keeps that impossible.
    if (!leadToConvert) return;

    // Throws on failure, and ConvertLeadModal shows the message inline so the
    // user does not lose what they typed.
    const result = await convertLead(leadToConvert.id, customerFields);

    // The server returns the lead's new status rather than the whole row, so
    // the list updates without a refetch.
    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === result.leadId
          ? {
              ...lead,
              status: result.leadStatus,
              convertedCustomerId: result.convertedCustomerId,
            }
          : lead
      )
    );

    setKnownEmails((prev) => [...prev, result.customer.email]);

    setIsConvertModalOpen(false);
    setIsDrawerOpen(false);
    setLeadToConvert(null);

    toast.success(`${result.customer.name} is now a customer`);
  };

  const handleBulkStatus = async (status: string) => {
    // Read the current rows rather than the selection ids, so each PUT sends a
    // complete row â€” the API treats PUT as a full replace.
    const records = leads.filter((lead) => selection.selected.includes(lead.id));

    const result = await bulkSetLeadStatus(records, status);

    if (result.failed === 0) {
      setLeads((prev) =>
        prev.map((lead) =>
          selection.selected.includes(lead.id) ? { ...lead, status } : lead,
        ),
      );
      toast.success(`${result.ok} leads set to ${status}`);
      selection.clear();
    } else {
      // Refetch so the rows that did change are shown, and the ones that failed
      // are not silently left looking updated.
      const fresh = await getLeads();
      setLeads(fresh);
      toast.error(`${result.ok} updated, ${result.failed} failed`);
    }

    return result;
  };

  const handleBulkDelete = async () => {
    const records = leads.filter((lead) => selection.selected.includes(lead.id));

    const result = await bulkDeleteLeads(records);

    if (result.failed === 0) {
      setLeads((prev) => prev.filter((lead) => !selection.selected.includes(lead.id)));
      toast.success(`${result.ok} leads deleted`);
      selection.clear();
    } else {
      const fresh = await getLeads();
      setLeads(fresh);
      toast.error(`${result.ok} deleted, ${result.failed} failed`);
    }

    return result;
  };

  return (
    <div className="space-y-6">
      <LeadsHeader
        onAddLead={() => {
          setSelectedLead(null);
          setIsAddModalOpen(true);
        }}
        showAddButton={filteredLeads.length > 0}
      />

      {filteredLeads.length > 0 && (
        <>
        <LeadsToolbar
  searchTerm={searchTerm}
  onSearchChange={(value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  }}
  statusFilter={statusFilter}
  onStatusChange={(value) => {
    setStatusFilter(value);
    setCurrentPage(1);
  }}
  sourceFilter={sourceFilter}
  onSourceChange={(value) => {
    setSourceFilter(value);
    setCurrentPage(1);
  }}
  convertedFilter={convertedFilter}
  onConvertedFilterChange={(value) => {
    setConvertedFilter(value);
    setCurrentPage(1);
  }}
  scope={scope}
  onScopeChange={(value) => {
    setScope(value);
    setCurrentPage(1);
  }}
  sortBy={sortBy}
  onSortChange={setSortBy}
  onImport={() => setIsImportOpen(true)}
  canImport={canCreate}
/>

        </>
      )}

      {loading ? (
        <LeadTableSkeleton />
      ) : loadError ? (
        <ErrorState
          title="Could not load leads"
          message="We could not reach the server. Check that the API is running, then try again."
          onRetry={fetchLeads}
        />
      ) : filteredLeads.length === 0 ? (
        <EmptyState
          onAddLead={() => setIsAddModalOpen(true)}
        />
      ) : (
        <>
          <LeadsTable
            leads={paginatedLeads}
            onViewLead={(lead) => {
              setSelectedLead(lead);
              setIsDrawerOpen(true);
            }}
            onEditLead={(lead) => {
              setSelectedLead(lead);
              setIsAddModalOpen(true);
            }}
            onDeleteLead={(lead) => {
              setLeadToDelete(lead);
              setIsDeleteModalOpen(true);
            }}
            onConvertLead={(lead) => {
              setLeadToConvert(lead);
              setIsConvertModalOpen(true);
            }}
            selection={selection}
          />

          {selection.count > 0 && (
            <BulkActionBar
              count={selection.count}
              noun="leads"
              statusOptions={LEAD_STATUSES}
              onBulkStatusChange={handleBulkStatus}
              onBulkDelete={handleBulkDelete}
              disableStatus={!canBulkEdit}
              disableDelete={!canBulkDelete}
            />
          )}

         <LeadPagination
  currentPage={currentPage}
  totalPages={totalPages}
  totalLeads={filteredLeads.length}
  leadsPerPage={rowsPerPage}
  onPageChange={setCurrentPage}
  onRowsPerPageChange={(value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
  }}
/>
        </>
      )}

      <AddLeadModal
        open={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedLead(null);
        }}
        onAddLead={handleAddLead}
        onUpdateLead={handleUpdateLead}
        lead={selectedLead}
        existingEmails={knownEmails}
      />

      <ImportCsvModal
        open={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        resource="lead"
        existingEmails={knownEmails}
      />

      <ConvertLeadModal
        open={isConvertModalOpen}
        onClose={() => {
          setIsConvertModalOpen(false);
          setLeadToConvert(null);
        }}
        onConfirm={handleConvertLead}
        lead={leadToConvert}
        existingEmails={customerEmails}
      />

      <DeleteLeadModal
        open={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setLeadToDelete(null);
        }}
        onConfirm={handleDeleteLead}
        lead={leadToDelete}
      />

      <LeadDetailDrawer
        open={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedLead(null);
        }}
        lead={selectedLead}
        onConvertLead={(lead) => {
          setLeadToConvert(lead);
          setIsConvertModalOpen(true);
        }}
      />
    </div>
  );
}

export default Leads;