import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";

import {
  getDeals,
  createDeal,
  updateDeal,
  deleteDeal,
} from "../services/dealService";
import DealsHeader from "../components/deals/DealsHeader";
import DealsToolbar from "../components/deals/DealsToolbar";
import DealsTable from "../components/deals/DealsTable";
import DealPagination from "../components/deals/DealPagination";
import AddDealModal from "../components/deals/AddDealModal";
import DeleteDealModal from "../components/deals/DeleteDealModal";
import DealDetailsDrawer from "../components/deals/DealDetailsDrawer";
import DealTableSkeleton from "../components/deals/DealTableSkeleton";
import EmptyState from "../components/deals/EmptyState";

function Deals() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [deals, setDeals] = useState([]);

  const [loading] = useState(false);

  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || ""
  );

  const [stageFilter, setStageFilter] = useState(
    searchParams.get("stage") || "All"
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
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [dealToDelete, setDealToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
  const fetchDeals = async () => {
    try {
      const dealsData = await getDeals();
      setDeals(dealsData);
    } catch (error) {
      console.error("Failed to fetch deals:", error);
    }
  };

  fetchDeals();
}, []);
  useEffect(() => {
    const params = {};

    if (searchTerm) params.search = searchTerm;
    if (stageFilter !== "All") params.stage = stageFilter;
    if (sortBy !== "newest") params.sort = sortBy;
    if (currentPage !== 1) params.page = currentPage;
    if (rowsPerPage !== 5) params.rows = rowsPerPage;

    setSearchParams(params);
  }, [
    searchTerm,
    stageFilter,
    sortBy,
    currentPage,
    rowsPerPage,
    setSearchParams,
  ]);

  const filteredDeals = useMemo(() => {
    let filtered = [...deals];

    if (searchTerm) {
      const query = searchTerm.toLowerCase();

      filtered = filtered.filter(
        (deal) =>
          deal.title.toLowerCase().includes(query) ||
          deal.customer.toLowerCase().includes(query) ||
          deal.owner.toLowerCase().includes(query)
      );
    }

    if (stageFilter !== "All") {
      filtered = filtered.filter(
        (deal) => deal.stage === stageFilter
      );
    }

    switch (sortBy) {
      case "oldest":
        filtered.sort(
          (a, b) =>
            new Date(a.expectedClose) -
            new Date(b.expectedClose)
        );
        break;

      case "title-asc":
        filtered.sort((a, b) =>
          a.title.localeCompare(b.title)
        );
        break;

      case "title-desc":
        filtered.sort((a, b) =>
          b.title.localeCompare(a.title)
        );
        break;

      case "customer-asc":
        filtered.sort((a, b) =>
          a.customer.localeCompare(b.customer)
        );
        break;

      case "customer-desc":
        filtered.sort((a, b) =>
          b.customer.localeCompare(a.customer)
        );
        break;

      case "value-high":
        filtered.sort((a, b) => b.value - a.value);
        break;

      case "value-low":
        filtered.sort((a, b) => a.value - b.value);
        break;

      default:
        filtered.sort(
          (a, b) =>
            new Date(b.expectedClose) -
            new Date(a.expectedClose)
        );
    }

    return filtered;
  }, [deals, searchTerm, stageFilter, sortBy]);

  const totalPages = Math.ceil(
    filteredDeals.length / rowsPerPage
  );

  const paginatedDeals = filteredDeals.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

 const handleAddDeal = async (deal) => {
  try {
    const newDeal = {
      ...deal,
      createdDate: new Date().toISOString().split("T")[0],
    };

    const createdDeal = await createDeal(newDeal);

    setDeals((prev) => [createdDeal, ...prev]);

    toast.success("Deal added successfully");
  } catch (error) {
    console.error("Failed to add deal:", error);
    toast.error("Failed to add deal");
  }
};
 const handleUpdateDeal = async (updatedDeal) => {
  try {
    const updated = await updateDeal(updatedDeal.id, updatedDeal);

    setDeals((prev) =>
      prev.map((deal) =>
        deal.id === updated.id ? updated : deal
      )
    );

    toast.success("Deal updated successfully");
  } catch (error) {
    console.error("Failed to update deal:", error);
    toast.error("Failed to update deal");
  }
};
 const handleDeleteDeal = async (id) => {
  try {
    await deleteDeal(id);

    setDeals((prev) =>
      prev.filter((deal) => deal.id !== id)
    );

    toast.success("Deal deleted successfully");
  } catch (error) {
    console.error("Failed to delete deal:", error);
    toast.error("Failed to delete deal");
  }
};
    return (
    <div className="space-y-6">
      <DealsHeader
        onAddDeal={() => {
          setSelectedDeal(null);
          setIsAddModalOpen(true);
        }}
        showAddButton={filteredDeals.length > 0}
      />

      {filteredDeals.length > 0 && (
        <DealsToolbar
          searchTerm={searchTerm}
          onSearchChange={(value) => {
            setSearchTerm(value);
            setCurrentPage(1);
          }}
          stageFilter={stageFilter}
          onStageChange={(value) => {
            setStageFilter(value);
            setCurrentPage(1);
          }}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />
      )}

      {loading ? (
        <DealTableSkeleton />
      ) : filteredDeals.length === 0 ? (
        <EmptyState
          onAddDeal={() => setIsAddModalOpen(true)}
        />
      ) : (
        <>
          <DealsTable
            deals={paginatedDeals}
            onViewDeal={(deal) => {
              setSelectedDeal(deal);
              setIsDrawerOpen(true);
            }}
            onEditDeal={(deal) => {
              setSelectedDeal(deal);
              setIsAddModalOpen(true);
            }}
            onDeleteDeal={(deal) => {
              setDealToDelete(deal);
              setIsDeleteModalOpen(true);
            }}
          />

          <DealPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalDeals={filteredDeals.length}
            dealsPerPage={rowsPerPage}
            onPageChange={setCurrentPage}
            onRowsPerPageChange={(value) => {
              setRowsPerPage(value);
              setCurrentPage(1);
            }}
          />
        </>
      )}

      <AddDealModal
        open={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedDeal(null);
        }}
        onAddDeal={handleAddDeal}
        onUpdateDeal={handleUpdateDeal}
        deal={selectedDeal}
      />

      <DeleteDealModal
        open={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDealToDelete(null);
        }}
        onConfirm={handleDeleteDeal}
        deal={dealToDelete}
      />

      <DealDetailsDrawer
        open={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedDeal(null);
        }}
        deal={selectedDeal}
      />
    </div>
  );
}

export default Deals;