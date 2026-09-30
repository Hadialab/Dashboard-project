import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";

import {
  getDeals,
  createDeal,
  updateDeal,
  deleteDeal,
} from "../services/dealService";
import { isMine } from "../utils/myWork";
import useAuthStore from "../store/authStore";
import { useNotificationGenerator } from "../services/notificationService";
import DealsHeader from "../components/deals/DealsHeader";
import DealsToolbar from "../components/deals/DealsToolbar";
import DealsTable from "../components/deals/DealsTable";
import DealPagination from "../components/deals/DealPagination";
import AddDealModal from "../components/deals/AddDealModal";
import DeleteDealModal from "../components/deals/DeleteDealModal";
import DealDetailsDrawer from "../components/deals/DealDetailsDrawer";
import DealTableSkeleton from "../components/deals/DealTableSkeleton";
import ErrorState from "../components/ui/ErrorState";
import EmptyState from "../components/deals/EmptyState";

function Deals() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentUser = useAuthStore((state) => state.user);

  const [deals, setDeals] = useState([]);

  // "all" or "mine" — see the note in Leads.jsx.
  const [scope, setScope] = useState(searchParams.get("scope") || "all");

  // Deep link from the dashboard widget, the command palette or a notification.
  // See the matching effect further down.
  const openDealId = searchParams.get("open");

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

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
  const notifications = useNotificationGenerator();

  // In component scope, not inside the effect below, because the error state's
  // "Try again" button needs to call it.
  const fetchDeals = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const dealsData = await getDeals();
      setDeals(dealsData);

      // Checked once per load rather than on every render, and deduplicated by
      // key in the store, so a revisit does not pile up reminders.
      notifications.checkClosingSoon(dealsData);
    } catch (error) {
      // Held in state, not just logged: without it the page falls through to the
      // empty state and claims there are no deals when the API is simply down.
      console.error("Failed to fetch deals:", error);
      setLoadError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const params = {};

    if (searchTerm) params.search = searchTerm;
    if (stageFilter !== "All") params.stage = stageFilter;
    if (scope !== "all") params.scope = scope;
    if (sortBy !== "newest") params.sort = sortBy;
    if (currentPage !== 1) params.page = currentPage;
    if (rowsPerPage !== 5) params.rows = rowsPerPage;

    setSearchParams(params);
  }, [
    searchTerm,
    stageFilter,
    scope,
    sortBy,
    currentPage,
    rowsPerPage,
    setSearchParams,
  ]);

  const filteredDeals = useMemo(() => {
    let filtered = [...deals];

    if (scope === "mine") {
      filtered = filtered.filter((deal) => isMine(deal, currentUser));
    }

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
  }, [deals, searchTerm, stageFilter, scope, currentUser, sortBy]);

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

  // Opens a deal requested by ?open=. Only for a deal this user can see; an id
  // they cannot see is ignored rather than erroring. See Leads.jsx.
  useEffect(() => {
    if (!openDealId || loading || deals.length === 0) return;

    const match = deals.find((deal) => deal.id === openDealId);
    if (!match) return;

    setSelectedDeal(match);
    setIsDrawerOpen(true);

    const params = new URLSearchParams(searchParams);
    params.delete("open");
    setSearchParams(params, { replace: true });
  }, [openDealId, loading, deals, searchParams, setSearchParams]);

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

    // Only fires for Won or Lost; see the generator.
    notifications.dealStageChanged(updated);

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
          scope={scope}
          onScopeChange={(value) => {
            setScope(value);
            setCurrentPage(1);
          }}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />
      )}

      {loading ? (
        <DealTableSkeleton />
      ) : loadError ? (
        <ErrorState
          title="Could not load deals"
          message="We could not reach the server. Check that the API is running, then try again."
          onRetry={fetchDeals}
        />
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