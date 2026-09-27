import CustomerPagination from "../components/customers/CustomerPagination";
import CustomersHeader from "../components/customers/CustomerHeader";
import CustomersToolBar from "../components/customers/CustomersToolBar";
import CustomersTable from "../components/customers/CustomersTable";
import CustomerDetailsDrawer from "../components/customers/CustomerDetailDrawer";
import AddCustomerModal from "../components/customers/AddCustomerModal";
import DeleteCustomerModal from "../components/customers/DeleteCustomerModal";
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from "../services/customerService";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import EmptyState from "../components/customers/EmptyState";
import CustomerTableSkeleton from "../components/customers/CustomerTableSkeleton";
import RowsPerPage from "../components/customers/RowsPerPage";

function Customers() {
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [sortBy, setSortBy] = useState(() => searchParams.get("sort") || "name");
  const [sortOrder, setSortOrder] = useState(() => searchParams.get("order") || "asc");
  const [currentPage, setCurrentPage] = useState(() => Number(searchParams.get("page")) || 1);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [customers, setCustomers] = useState([]);
  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState(() => searchParams.get("search") || "");
  const [customersPerPage, setCustomersPerPage] = useState(
    () => Number(searchParams.get("rows")) || 10
  );
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get("status") || "All");
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCustomers, setTotalCustomers] = useState(0);

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

  const handleEditCustomer = (customer) => {
    setEditingCustomer(customer);
    setIsAddModalOpen(true);
  };

  // Filter/sort/rows-per-page changes should reset to page 1.
  // These are combined into the state setters below instead of a
  // separate effect, so a filter change triggers exactly one fetch
  // (not one for the filter change, then another when page resets).
  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleStatusChange = (value) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleSortByChange = (value) => {
    setSortBy(value);
    setCurrentPage(1);
  };

  const handleSortOrderChange = (value) => {
    setSortOrder(value);
    setCurrentPage(1);
  };

  const handleRowsPerPageChange = (value) => {
    setCustomersPerPage(value);
    setCurrentPage(1);
  };

  const handleViewCustomer = (customer) => {
    setSelectedCustomer(customer);
    setIsDrawerOpen(true);
  };

  const handleAddCustomer = async (customer) => {
    try {
      await createCustomer(customer);
      await fetchCustomers();
      toast.success("Customer added successfully.");
    } catch (error) {
      console.error(error);
      toast.error("Failed to add customer.");
    }
  };

  const handleUpdateCustomer = async (updatedCustomer) => {
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

  const handleOpenDeleteModal = (customer) => {
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

      // json-server v1 wraps results as { data, pages, items, ... } when
      // _page/_per_page are valid — pull the array out of .data.data,
      // not the wrapper object itself.
      setCustomers(response.data.data);
      setTotalPages(response.data.pages);
      setTotalCustomers(response.data.items);
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

  if (loading) {
    return <CustomerTableSkeleton />;
  }

  if (error) {
    return <div>{error}</div>;
  }

  const isFiltered = Boolean(searchTerm) || statusFilter !== "All";

  return (
    <div className="space-y-4 sm:space-y-6">
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
        />
      )}

      {customers.length > 0 && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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