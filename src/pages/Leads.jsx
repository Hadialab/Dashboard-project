import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";

import { leads as leadsData } from "../data/leads";

import LeadsHeader from "../components/leads/LeadsHeader";
import LeadsToolbar from "../components/leads/LeadsToolbar";
import LeadsTable from "../components/leads/LeadsTable";
import LeadPagination from "../components/leads/LeadPagination";
import AddLeadModal from "../components/leads/AddLeadModal";
import DeleteLeadModal from "../components/leads/DeleteLeadModal";
import LeadDetailDrawer from "../components/leads/LeadDetailDrawer";
import LeadTableSkeleton from "../components/leads/LeadTableSkeleton";
import EmptyState from "../components/leads/EmptyState";

function Leads() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [leads, setLeads] = useState(leadsData);

  const [loading] = useState(false);

  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || ""
  );

  const [statusFilter, setStatusFilter] = useState(
    searchParams.get("status") || "All"
  );

  const [sourceFilter, setSourceFilter] = useState(
    searchParams.get("source") || "All"
  );

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
    const params = {};

    if (searchTerm) params.search = searchTerm;
    if (statusFilter !== "All") params.status = statusFilter;
    if (sourceFilter !== "All") params.source = sourceFilter;
    if (sortBy !== "newest") params.sort = sortBy;
    if (currentPage !== 1) params.page = currentPage;
    if (rowsPerPage !== 5) params.rows = rowsPerPage;

    setSearchParams(params);
  }, [
    searchTerm,
    statusFilter,
    sourceFilter,
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

  const handleAddLead = (lead) => {
    const newLead = {
      ...lead,
      id: Date.now(),
      createdDate: new Date().toISOString().split("T")[0],
    };

    setLeads((prev) => [newLead, ...prev]);
    toast.success("Lead added successfully");
  };

  const handleUpdateLead = (updatedLead) => {
    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === updatedLead.id ? updatedLead : lead
      )
    );

    toast.success("Lead updated successfully");
  };

  const handleDeleteLead = (id) => {
    setLeads((prev) =>
      prev.filter((lead) => lead.id !== id)
    );

    toast.success("Lead deleted successfully");
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
  sortBy={sortBy}
  onSortChange={setSortBy}
/>
        
        </>
      )}

      {loading ? (
        <LeadsTableSkeleton />
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
      />
    </div>
  );
}

export default Leads;