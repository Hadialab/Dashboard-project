import CustomerPagination from "../components/customers/CustomerPagination";
import CustomersHeader from "../components/customers/CustomerHeader";
import CustomersToolBar from "../components/customers/CustomersToolBar";
import CustomersTable from "../components/customers/CustomersTable";
function Customers(){
    return(<div>

<CustomersHeader />
<CustomersToolBar />
<CustomersTable />
<CustomerPagination />


    </div>);
}
export default Customers;