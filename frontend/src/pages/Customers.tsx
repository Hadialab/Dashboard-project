import CustomerPagination from "../components/customers/CustomerPagination";
import CustomersHeader from "../components/customers/CustomerHeader";
import CustomersToolBar from "../components/customers/CustomersToolBar";
import CustomersTable from "../components/customers/CustomersTable";
import CustomerDetailsDrawer from "../components/customers/CustomerDetailDrawer";
import AddCustomerModal from "../components/customers/AddCustomerModal";
import DeleteCustomerModal from "../components/customers/DeleteCustomerModal";
import AddDealModal from "../components/deals/AddDealModal";
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from "../services/customerService";
import { createDeal } from "../services/dealService";
import { getApiErrorMessage } from "../utils/apiError";
import { bulkSetCustomerStatus, bulkDeleteCustomers } from "../services/bulkService";
import { CUSTOMER_STATUSES } from "../utils/crmConstants";
import usePermissions from "../hooks/usePermissions";
import useRowSelection from "../hooks/useRowSelection";
import BulkActionBar from "../components/ui/BulkActionBar";
import ImportCsvModal from "../components/ui/ImportCsvModal";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import EmptyState from "../components/customers/EmptyState";
import CustomerTableSkeleton from "../components/customers/CustomerTableSkeleton";
import ErrorState from "../components/ui/ErrorState";
import RowsPerPage from "../components/customers/RowsPerPage";
import { useLiveUpdates } from "../hooks/useLiveUpdates";
import type { Customer, Deal } from "../types";
import type { CustomerInput } from "../validation/customerSchema";

/** The one thing a deal form needs pre-seeded when started from a customer. */
type DealPrefill = { customer: string };

function Customers() {
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [sortBy, setSortBy] = useState(() => searchParams.get("sort") || "name");
  const [sortOrder, setSortOrder] = useState(() => searchParams.get("order") || "asc");
  const [currentPage, setCurrentPage] = useState(() => Number(searchParams.get("page")) || 1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState(() => searchParams.get("search") || "");
  const [customersPerPage, setCustomersPerPage] = useState(
    () => Number(searchParams.get("rows")) || 10
  );
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get("status") || "All");
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Starting a deal from a customer drawer. The name is carried into the form;
  // everything else the user fills in.
  const [dealPrefill, setDealPrefill] = useState<DealPrefill | null>(null);
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);

  const { can } = usePermissions();
  const selection = useRowSelection();
  const canBulkEdit = can("customers", "edit");
  const canBulkDelete = can("customers", "delete");
  const canCreate = can("customers", "create");

  const [isImportOpen, setIsImportOpen] = useState(false);

  // Every email in the company, for the duplicate check on create and on
  // import. Fetched unpaginated; the customers list is small enough that pulling
  // it all in one request beats paginating a lookup the user never sees.
  const [allEmails, setAllEmails] = useState<string[]>([]);

  useEffect(() => {
    if (!canCreate) return;

    let cancelled = false;

    (async () => {
      try {
        const response = await getCustomers({ page: 1, limit: 1000 });
        if (cancelled) return;

        const rows = response.data?.data ?? [];
        setAllEmails(rows.map((row) => row.email).filter(Boolean));
      } catch {
        if (!cancelled) setAllEmails([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [canCreate]);
  const [isLoading, setIsLoading] = useState(true);
  // `totalPages` is enough to drive the pager; the envelope's `items` count is
  // not displayed anywhere.

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 700);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();

    params.set("search", searchTerm);
    params.set("status", statusFilter);
    params.set("sort", sortBy);
    params.set("order", sortOrder);
    params.set("page", currentPage.toString());
    params.set("rows", customersPerPage.toString());

    setSearchParams(params, { replace: true });
  }, [
    searchTerm,
    statusFilter,
    sortBy,
    sortOrder,
    currentPage,
    customersPerPage,
    setSearchParams,
  ]);

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsAddModalOpen(true);
  };

  // Filter/sort/rows-per-page changes should reset to page 1.
  // These are combined into the state setters below instead of a
  // separate effect, so a filter change triggers exactly one fetch
  // (not one for the filter change, then another when page resets).
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleSortByChange = (value: string) => {
    setSortBy(value);
    setCurrentPage(1);
  };

  const handleSortOrderChange = (value: string) => {
    setSortOrder(value);
    setCurrentPage(1);
  };

  const handleRowsPerPageChange = (value: number) => {
    setCustomersPerPage(value);
    setCurrentPage(1);
  };

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDrawerOpen(true);
  };

  const handleAddCustomer = async (customer: CustomerInput) => {
    try {
      await createCustomer(customer);
      await fetchCustomers();
      toast.success("Customer added successfully.");
    } catch (error) {
      console.error(error);
      toast.error("Failed to add customer.");
    }
  };

  const handleUpdateCustomer = async (updatedCustomer: Customer) => {
    try {
      await updateCustomer(updatedCustomer.id, updatedCustomer);
      await fetchCustomers();
      setEditingCustomer(null);
      toast.success("Customer updated successfully.");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update customer.");
    }
  };

  const handleOpenDeleteModal = (customer: Customer) => {
    setCustomerToDelete(customer);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;

    try {
      await deleteCustomer(customerToDelete.id);
      await fetchCustomers();
      setCustomerToDelete(null);
      setIsDeleteModalOpen(false);
      toast.success("Customer deleted successfully.");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete customer.");
    }
  };

  // Opens the deal form with the customer's name already filled in. A deal
  // references its customer by name, which is the only thing worth carrying
  // over — the value, stage and close date are the user's call.
  const handleStartDeal = (customer: Customer) => {
    setDealPrefill({ customer: customer.name });
    setIsDealModalOpen(true);
    setIsDrawerOpen(false);
  };

  const handleCreateDealFromCustomer = async (deal: Partial<Deal>) => {
    try {
      const created = await createDeal(deal);

      setIsDealModalOpen(false);
      setDealPrefill(null);
      setSelectedCustomer(null);

      toast.success(`Deal "${created.title}" added`);
    } catch (error) {
      // Thrown so AddDealModal can show it inline next to the form, rather than
      // a toast that disappears while the user is still looking at the fields.
      setError(getApiErrorMessage(error, "Failed to add deal."));
      throw error;
    }
  };

  const handleBulkStatus = async (status: string) => {
    const records = customers.filter((row) => selection.selected.includes(row.id));

    const result = await bulkSetCustomerStatus(records, status);

    if (result.failed === 0) {
      setCustomers((prev) =>
        prev.map((row) =>
          selection.selected.includes(row.id) ? { ...row, status } : row,
        ),
      );
      toast.success(`${result.ok} customers set to ${status}`);
      selection.clear();
    } else {
      await fetchCustomers();
      toast.error(`${result.ok} updated, ${result.failed} failed`);
    }

    return result;
  };

  const handleBulkDelete = async () => {
    const records = customers.filter((row) => selection.selected.includes(row.id));

    const result = await bulkDeleteCustomers(records);

    await fetchCustomers();

    if (result.failed === 0) {
      toast.success(`${result.ok} customers deleted`);
      selection.clear();
    } else {
      toast.error(`${result.ok} deleted, ${result.failed} failed`);
    }

    return result;
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);

      const response = await getCustomers({
        page: currentPage,
        limit: customersPerPage,
        search: searchTerm,
        status: statusFilter,
        sort: sortBy,
        order: sortOrder,
      });

      // With _page/_per_page the API wraps results as
      // { data, pages, items, ... } rather than returning a bare array.
      setCustomers(response.data.data);
      setTotalPages(response.data.pages);
      // Cleared on success: it was previously only ever set, so one failed
      // request left the page stuck on the error even after a good reload.
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to load customers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [
    currentPage,
    customersPerPage,
    searchTerm,
    statusFilter,
    sortBy,
    sortOrder,
  ]);

  // Drop selections for rows that have scrolled off this page, so the bulk bar
  // can never act on a record the user is no longer looking at.
  useEffect(() => {
    selection.sync(customers);
  }, [customers, selection.sync]);

  // Refetch when someone else changes a customer.
  //
  // A refetch rather than an in-place patch, because the server is the only thing
  // that knows the result of a write: a name edit, a status change and a bulk
  // action can all touch rows this list is showing, and patching locally would mean
  // guessing at fields the event never carried. Placed after fetchCustomers is
  // declared so the reference is not into the temporal dead zone.
  useLiveUpdates(() => {
    fetchCustomers();
  }, ["customer"]);

  // Deleting the last row on a page can leave currentPage past the end, which
  // renders an empty table with no way back. Pull it back to the last page.
  useEffect(() => {
    if (!loading && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages, loading]);

  if (loading) {
    return <CustomerTableSkeleton />;
  }

  if (error) {
    // Previously a bare <div> of unstyled text that replaced the entire page —
    // no alert semantics, no retry, and it hid the "Add Customer" button behind
    // a failure the user could do nothing about.
    return (
      <div className="space-y-6">
        <CustomersHeader onAddCustomer={() => setIsAddModalOpen(true)} />

        <ErrorState title="Could not load customers" message={error} onRetry={fetchCustomers} />
      </div>
    );
  }

  const isFiltered = Boolean(searchTerm) || statusFilter !== "All";

  return (
    <div className="space-y-6">
      <CustomersHeader
        onAddCustomer={() => setIsAddModalOpen(true)}
        showAddButton={customers.length > 0}
      />
      {customers.length > 0 && (
        <CustomersToolBar
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          statusFilter={statusFilter}
          onStatusChange={handleStatusChange}
          sortBy={sortBy}
          onSortByChange={handleSortByChange}
          sortOrder={sortOrder}
          onSortOrderChange={handleSortOrderChange}
          onImport={() => setIsImportOpen(true)}
          canImport={canCreate}
        />
      )}

      {customers.length === 0 ? (
        isFiltered ? (
          <EmptyState
            title="No matching customers"
            description="No customers match your current search or filters. Try adjusting your search or filters."
            buttonText="Clear Filters"
            isSearchResult
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("All");
              setCurrentPage(1);
            }}
          />
        ) : (
          <EmptyState
            title="No customers yet"
            description="You haven't added any customers yet. Start by creating your first customer."
            buttonText="Add Customer"
            onClick={() => setIsAddModalOpen(true)}
          />
        )
      ) : isLoading ? (
        <CustomerTableSkeleton />
      ) : (
        <CustomersTable
          customers={customers}
          onView={handleViewCustomer}
          onEditCustomer={handleEditCustomer}
          onDeleteCustomer={handleOpenDeleteModal}
          selection={selection}
        />
      )}

      {selection.count > 0 && (
        <BulkActionBar
          count={selection.count}
          noun="customers"
          statusOptions={CUSTOMER_STATUSES}
          onBulkStatusChange={handleBulkStatus}
          onBulkDelete={handleBulkDelete}
          disableStatus={!canBulkEdit}
          disableDelete={!canBulkDelete}
        />
      )}

      {customers.length > 0 && (
        <div className="flex flex-col gap-4">
          <RowsPerPage value={customersPerPage} onChange={handleRowsPerPageChange} />

          <CustomerPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      <CustomerDetailsDrawer
        customer={selectedCustomer}
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onCreateDeal={handleStartDeal}
      />
      <AddCustomerModal
        open={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingCustomer(null);
        }}
        onAddCustomer={handleAddCustomer}
        onUpdateCustomer={handleUpdateCustomer}
        customer={editingCustomer}
        existingEmails={allEmails}
      />

      <ImportCsvModal
        open={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        resource="customer"
        existingEmails={allEmails}
      />

      {/* Reuses the existing deal form rather than a second one, so validation
          and the owner picker stay in a single place. */}
      <AddDealModal
        open={isDealModalOpen}
        onClose={() => {
          setIsDealModalOpen(false);
          setDealPrefill(null);
        }}
        onAddDeal={handleCreateDealFromCustomer}
        prefill={dealPrefill}
      />
      <DeleteCustomerModal
        open={isDeleteModalOpen}
        customer={customerToDelete}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setCustomerToDelete(null);
        }}
        onConfirm={handleDeleteCustomer}
      />
    </div>
  );
}

export default Customers;