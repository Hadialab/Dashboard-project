import CustomerPagination from "../components/customers/CustomerPagination";
import CustomersHeader from "../components/customers/CustomerHeader";
import CustomersToolBar from "../components/customers/CustomersToolBar";
import CustomersTable from "../components/customers/CustomersTable";
import CustomerDetailsDrawer from "../components/customers/CustomerDetailDrawer";
import AddCustomerModal from "../components/customers/AddCustomerModal";
import { customers as initialCustomers } from "../data/customers";
import { useState ,useEffect} from "react";
function Customers(){
  const [searchTerm,setSearchTerm]= useState("");
  const [statusFilter,setStatusFilter]= useState("All");
  const [sortBy,setSortBy] = useState("name");
  const [sortOrder,setSortOrder]= useState("asc");
  const [currentPage,setCurrentPage] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen]= useState(false);
  const [customers,setCustomers] = useState(initialCustomers);

  
  
  const customersPerPage = 5;

  useEffect(() => {
  setCurrentPage(1);
}, [searchTerm, statusFilter, sortBy, sortOrder]);

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
};

   return(
     <div className="space-y-4 sm:space-y-6">
       <CustomersHeader 
         onAddCustomer={()=>setIsAddModalOpen(true)}
       />
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
       <CustomersTable 
         customers={paginatedCustomers}
         onView = {handleViewCustomer}
       />
       <CustomerPagination  
         currentPage={currentPage}
         totalPages={totalPages}
         onPageChange={setCurrentPage}
       />
       <CustomerDetailsDrawer
         customer={selectedCustomer}
         open={isDrawerOpen}
         onClose={() => setIsDrawerOpen(false)}
       />
       <AddCustomerModal
         open={isAddModalOpen}
         onClose={() => setIsAddModalOpen(false)}
         onAddCustomer={handleAddCustomer}
       />
     </div>
   );
}
export default Customers;