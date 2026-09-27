import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";

import { getLeads,createLead,updateLead,deleteLead,convertLead } from "../services/leadService";
import { getCustomers } from "../services/customerService";
import { CONVERTED_STATUS } from "../utils/crmConstants";

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

function Leads() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [leads, setLeads] = useState([]);

  const [loading, setLoading] = useState(true);

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

  // Emails already in use, so the conversion modal can warn about a duplicate
  // before the customer is created.
  const [customerEmails, setCustomerEmails] = useState([]);

  const [leadToConvert, setLeadToConvert] = useState(null);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);

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
  const [selectedLead, setSelectedLead] = useState(null);
  const [leadToDelete, setLeadToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
useEffect(() => {
  const fetchLeads = async () => {
    try {
      setLoading(true);
      const leadData = await getLeads();
      setLeads(leadData);
    } catch (error) {
      console.error("Failed to fetch leads:", error);
    } finally {
      setLoading(false);
    }
  };

  fetchLeads();
}, []);

  // Only fetched to warn about duplicate emails on conversion. A user without
  // customer access cannot convert anyway, so a 403 here is not worth
  // surfacing — a missing warning beats a failed page load.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await getCustomers({ page: 1, limit: 1000 });
        if (cancelled) return;

        const rows = response.data?.data ?? response.data ?? [];
        setCustomerEmails(rows.map((row) => row.email).filter(Boolean));
      } catch {
        if (!cancelled) setCustomerEmails([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const params = {};

    if (searchTerm) params.search = searchTerm;
    if (statusFilter !== "All") params.status = statusFilter;
    if (sourceFilter !== "All") params.source = sourceFilter;
    if (convertedFilter !== "include") params.converted = convertedFilter;
    if (sortBy !== "newest") params.sort = sortBy;
    if (currentPage !== 1) params.page = currentPage;
    if (rowsPerPage !== 5) params.rows = rowsPerPage;

    setSearchParams(params);
  }, [
    searchTerm,
    statusFilter,
    sourceFilter,
    convertedFilter,
    sortBy,
    currentPage,
    rowsPerPage,
    setSearchParams,
  ]);

  const filteredLeads = useMemo(() => {
    let filtered = [...leads];

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
        filtered.sort(
          (a, b) =>
            new Date(a.createdDate) - new Date(b.createdDate)
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
            new Date(b.createdDate) - new Date(a.createdDate)
        );
    }

    return filtered;
  }, [
    leads,
    searchTerm,
    statusFilter,
    sourceFilter,
    convertedFilter,
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

 const handleAddLead = async (lead) => {
  try {
    const newLead = {
      ...lead,
      createdDate: new Date().toISOString().split("T")[0],
    };

    const createdLead = await createLead(newLead);

    setLeads((prev) => [createdLead, ...prev]);

    toast.success("Lead added successfully");
  } catch (error) {
    console.error("Failed to add lead:", error);
    toast.error("Failed to add lead");
  }
};

 const handleUpdateLead = async (updatedLead) => {
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

  const handleDeleteLead = async (id) => {
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

  const handleConvertLead = async (customerFields) => {
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

    setCustomerEmails((prev) => [...prev, result.customer.email]);

    setIsConvertModalOpen(false);
    setIsDrawerOpen(false);
    setLeadToConvert(null);

    toast.success(`${result.customer.name} is now a customer`);
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
  sortBy={sortBy}
  onSortChange={setSortBy}
/>

        </>
      )}

      {loading ? (
        <LeadTableSkeleton />
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
          />

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