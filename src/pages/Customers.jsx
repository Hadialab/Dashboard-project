import CustomerPagination from "../components/customers/CustomerPagination";
import CustomersHeader from "../components/customers/CustomerHeader";
import CustomersToolBar from "../components/customers/CustomersToolBar";
import CustomersTable from "../components/customers/CustomersTable";
import CustomerDetailsDrawer from "../components/customers/CustomerDetailDrawer";
import AddCustomerModal from "../components/customers/AddCustomerModal";
import DeleteCustomerModal from "../components/customers/DeleteCustomerModal";
import { customers as initialCustomers } from "../data/customers";
import { useState ,useEffect} from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import EmptyState from "../components/customers/EmptyState";
import CustomerTableSkeleton from "../components/customers/CustomerTableSkeleton";
import RowsPerPage from "../components/customers/RowsPerPage";



function Customers(){
 const [editingCustomer, setEditingCustomer] = useState(null);
  const [searchParams,setSearchParams] = useSearchParams(); 
  const [sortBy,setSortBy] = useState(()=> searchParams.get("sort") || "name");
  const [sortOrder,setSortOrder]= useState(()=> searchParams.get("order") || "asc");
  const [currentPage,setCurrentPage] = useState(()=> Number(searchParams.get("page")) || 1);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen]= useState(false);
  const [customers,setCustomers] = useState(initialCustomers);
 
  const [searchTerm,setSearchTerm]= useState(()=> searchParams.get("search") || "");
  const [customersPerPage, setCustomersPerPage] = useState(
  () => Number(searchParams.get("rows")) || 10
);
  const [statusFilter,setStatusFilter]= useState(()=> searchParams.get("status") || "All");
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
  const timer = setTimeout(() => {
    setIsLoading(false);
  }, 700);

  return () => clearTimeout(timer);
}, []); 

 useEffect(() => {
  const params = new URLSearchParams();

  // Search
  if (searchTerm.trim()) {
    params.set("search", searchTerm);
  }

  // Status
  if (statusFilter !== "All") {
    params.set("status", statusFilter);
  }

  // Sort
  if (sortBy !== "name") {
    params.set("sort", sortBy);
  }

  // Order
  if (sortOrder !== "asc") {
    params.set("order", sortOrder);
  }

  // Page
  if (currentPage > 1) {
    params.set("page", currentPage.toString());
  }

  // Rows Per Page
  if (customersPerPage !== 10) {
    params.set("rows", customersPerPage.toString());
  }

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

 const handleEditCustomer = (customer)=>{

  setEditingCustomer(customer);
  setIsAddModalOpen(true);
 };



  useEffect(() => {
  setCurrentPage(1);
}, [searchTerm, statusFilter, sortBy, sortOrder,customersPerPage]);

   const filteredCustomers = customers.filter((customer) => {
  const query = searchTerm.toLowerCase();

  const matchesSearch =
    customer.name.toLowerCase().includes(query) ||
    customer.company.toLowerCase().includes(query) ||
    customer.email.toLowerCase().includes(query);

  const matchesStatus =
    statusFilter === "All" || customer.status === statusFilter;

  return matchesSearch && matchesStatus;
});

const sortedCustomers = [...filteredCustomers].sort((a,b)=>{
    const first = a[sortBy].toLowerCase();
    const second = b[sortBy].toLowerCase();

    if(sortOrder === "asc"){
        return first.localeCompare(second);
    }
    return second.localeCompare(first);
});
    
  const totalPages = Math.max(
    1,
    Math.ceil (sortedCustomers.length / customersPerPage)
  );
  const startIndex = (currentPage -1) * customersPerPage;

  const paginatedCustomers = sortedCustomers.slice(
    startIndex,
    startIndex+customersPerPage
  );

  const handleViewCustomer = (customer) =>{
    setSelectedCustomer(customer);
    setIsDrawerOpen(true);
  };
 const handleAddCustomer = (customer) => {
  const newCustomer = {
    id: Date.now(),
    ...customer,
  };

  setCustomers((prev) => [newCustomer, ...prev]);
  toast.success("Customer added successfully.");
};

  const handleUpdateCustomer = (updatedCustomer) => {
  setCustomers((prevCustomers) =>
    prevCustomers.map((customer) =>
      customer.id === updatedCustomer.id
        ? updatedCustomer
        : customer
    )
  );

  setEditingCustomer(null);
  toast.success("Customer updated successfully.");
};
const handleOpenDeleteModal = (customer) => {
  setCustomerToDelete(customer);
  setIsDeleteModalOpen(true);
};
const handleDeleteCustomer = () => {
  if (!customerToDelete) return;

  setCustomers((prevCustomers) =>
    prevCustomers.filter(
      (customer) => customer.id !== customerToDelete.id
    )
  );

  setCustomerToDelete(null);
  setIsDeleteModalOpen(false);
  toast.success("Customer deleted successfully.");
};

   return(
     <div className="space-y-4 sm:space-y-6">
       <CustomersHeader
  onAddCustomer={() => setIsAddModalOpen(true)}
  showAddButton={customers.length > 0}
/>
      {customers.length > 0 && (
  <CustomersToolBar
    searchTerm={searchTerm}
    onSearchChange={setSearchTerm}
    statusFilter={statusFilter}
    onStatusChange={setStatusFilter}
    sortBy={sortBy}
    onSortByChange={setSortBy}
    sortOrder={sortOrder}
    onSortOrderChange={setSortOrder}
  />
)}
     {customers.length === 0 ? (
  <EmptyState
    title="No customers yet"
    description="You haven't added any customers yet. Start by creating your first customer."
    buttonText="Add Customer"
    onClick={() => setIsAddModalOpen(true)}
  />
) : filteredCustomers.length === 0 ? (
  <EmptyState
    title="No matching customers"
    description="No customers match your current search or filters. Try adjusting your search or filters."
    buttonText="Clear Filters"
    isSearchResult
    onClick={() => {
      setSearchTerm("");
      setStatusFilter("All");
    }}
  />
) : (
  isLoading ? (
  <CustomerTableSkeleton />
) : (
  <CustomersTable
    customers={paginatedCustomers}
    onView={handleViewCustomer}
    onEditCustomer={handleEditCustomer}
    onDeleteCustomer={handleOpenDeleteModal}
  />
)
)}
      {filteredCustomers.length > 0 && (
 <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
  <RowsPerPage
    value={customersPerPage}
    onChange={setCustomersPerPage}
  />

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