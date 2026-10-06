"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useBuyers, Buyer, ActiveFilters } from "@/hooks/admin/useBuyers";
import BuyerFilterSidebar from "./BuyerFilterSidebar";
import BuyerDetailModal from "./BuyerDetailModal";

const PER_PAGE = 10;

// ─── Skeleton Row ───────────────────────────────────────────
function SkeletonRow() {
    return (
        <tr>
            <td><div className="skeleton skeleton--text" style={{ width: 80 }} /></td>
            <td>
                <div className="d-flex align-items-center">
                    <div className="skeleton skeleton--avatar me-2" style={{ width: 40, height: 40, borderRadius: "50%" }} />
                    <div>
                        <div className="skeleton skeleton--text mb-1" style={{ width: 120 }} />
                        <div className="skeleton skeleton--text" style={{ width: 80 }} />
                    </div>
                </div>
            </td>
            <td><div className="skeleton skeleton--text" style={{ width: 100 }} /></td>
            <td><div className="skeleton skeleton--text" style={{ width: 60 }} /></td>
            <td><div className="skeleton skeleton--text" style={{ width: 80 }} /></td>
            <td><div className="skeleton skeleton--badge" style={{ width: 70 }} /></td>
            <td><div className="skeleton skeleton--text" style={{ width: 50 }} /></td>
        </tr>
    );
}

// ─── Status Badge Component ─────────────────────────────────
function StatusBadge({ status, isBlocked }: { status: string; isBlocked: boolean }) {
    if (isBlocked) {
        return <span className="badge bg-danger">Blocked</span>;
    }

    const statusClasses: Record<string, string> = {
        verified: "bg-success",
        unverified: "bg-warning text-dark",
        pending: "bg-info text-dark",
        blocked: "bg-danger",
    };

    return (
        <span className={`badge ${statusClasses[status] || "bg-secondary"}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
}

// ─── Main Component ─────────────────────────────────────────
export default function BuyersPage() {
    // ── State ─────────────────────────────────────────────────
    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedBuyer, setSelectedBuyer] = useState<Buyer | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [updating, setUpdating] = useState(false);

    const [filters, setFilters] = useState<ActiveFilters>({
        statuses: new Set<string>(),
        countries: new Set<string>(),
        industries: new Set<string>(),
        investmentRanges: new Set<string>(),
    });

    // ── API ───────────────────────────────────────────────────
    const { data, loading, error, refetch, updateBuyerStatus } = useBuyers({
        search: searchQuery,
        filters,
        page: currentPage,
        perPage: PER_PAGE,
    });

    const buyers = data?.data ?? [];
    const total = data?.total ?? 0;
    const totalPages = data?.totalPages ?? 1;

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setSearchQuery(searchInput.trim());
            setCurrentPage(1);
        }, 400);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [searchInput]);


    // ── Handlers ──────────────────────────────────────────────

    const handleSearchSubmit = useCallback(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        setSearchQuery(searchInput.trim());
        setCurrentPage(1);
    }, [searchInput]);

    const handleSearchKey = useCallback((e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleSearchSubmit();
    }, [handleSearchSubmit]);

    const handleClearSearch = useCallback(() => {
        setSearchInput("");
        setSearchQuery("");
        setCurrentPage(1);
    }, []);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleViewDetails = (buyer: Buyer) => {
        setSelectedBuyer(buyer);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedBuyer(null);
    };

    const handleStatusAction = async (id: string, action: string) => {
        setUpdating(true);
        const success = await updateBuyerStatus(id, action);
        setUpdating(false);
        if (success) {
            const updatedBuyer = buyers.find(b => b.id === id);
            if (updatedBuyer) setSelectedBuyer({ ...updatedBuyer });
        }
    };

    // ── Derived ───────────────────────────────────────────────
    const activeFilterCount =
        filters.statuses.size +
        filters.countries.size +
        filters.industries.size +
        filters.investmentRanges.size;

    return (
        <>
            {/* Header inside main area */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h1 className="h3 mb-1">Buyer Management</h1>
                    <p className="text-muted mb-0">
                        Manage and verify buyer accounts
                    </p>
                </div>
            </div>

            {/* Search Bar */}
            <div className="listing-page__search-box my-5">
                <div className="listing-search">
                    <span className="listing-search__icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                    </span>
                    <input
                        type="text"
                        className="listing-search__input"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={handleSearchKey}
                        aria-label="Search listings"
                    />
                    {/* Loading spinner inside box while typing */}
                    {loading && searchQuery && (
                        <span className="listing-search__spinner" aria-hidden="true" />
                    )}
                    <button type="button" className="listing-search__btn" onClick={handleSearchSubmit}>
                        Search
                    </button>
                </div>

                {/* Active search badge */}
                {searchQuery && (
                    <div className="d-flex align-items-center gap-2 mt-2 flex-wrap">
                        <span className="listing-search__active-label">
                            Results for:{" "}
                            <strong>&ldquo;{searchQuery}&rdquo;</strong>
                        </span>
                        <button
                            type="button"
                            className="filter-section__show-more"
                            onClick={handleClearSearch}
                        >
                            ✕ Clear
                        </button>
                    </div>
                )}
            </div>

            <div className="row g-4">
                {/* Sidebar Filters - Desktop */}
                <div className="col-lg-3 d-none d-lg-block">
                    <div className="card">
                        <div className="card-body">
                            <BuyerFilterSidebar filters={filters} onChange={setFilters} />
                        </div>
                    </div>
                </div>

                {/* Mobile Filter Toggle */}
                <div className="col-12 d-lg-none mb-3">
                    <button
                        className="btn btn-outline-primary w-100"
                        type="button"
                        data-bs-toggle="offcanvas"
                        data-bs-target="#buyerFilters"
                    >
                        <i className="ti ti-filter me-2"></i>
                        Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
                    </button>
                </div>

                {/* Main Content */}
                <div className="col-lg-9">
                    {/* Stats Bar */}
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <p className="mb-0 text-muted">
                            {loading ? (
                                <span className="skeleton skeleton--inline" style={{ width: 100 }} />
                            ) : (
                                <>
                                    Showing <strong>{buyers.length}</strong> of{" "}
                                    <strong>{total}</strong> buyers
                                </>
                            )}
                        </p>
                        {activeFilterCount > 0 && (
                            <span className="badge bg-primary">
                                {activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""} active
                            </span>
                        )}
                    </div>

                    {/* Error State */}
                    {error && !loading && (
                        <div className="alert alert-danger" role="alert">
                            <h5 className="alert-heading">Error loading buyers</h5>
                            <p>{error}</p>
                            <button className="btn btn-outline-danger" onClick={refetch}>
                                Try Again
                            </button>
                        </div>
                    )}

                    {/* Buyers Table */}
                    <div className="card">
                        <div className="table-responsive">
                            <table className="table table-hover mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th>ID</th>
                                        <th>Buyer</th>
                                        <th>Country</th>
                                        <th>Industry</th>
                                        <th>Investment</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        Array.from({ length: PER_PAGE }).map((_, i) => (
                                            <SkeletonRow key={i} />
                                        ))
                                    ) : buyers.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-5">
                                                <div className="text-muted">
                                                    <i className="ti ti-users-off fs-1 mb-3 d-block"></i>
                                                    <h5>No buyers found</h5>
                                                    <p>Try adjusting your search or filters</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        buyers.map((buyer) => (
                                            <tr key={buyer.id}>
                                                <td><code>{buyer.id}</code></td>
                                                <td>
                                                    <div className="d-flex align-items-center">
                                                        <div
                                                            className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-2"
                                                            style={{ width: 40, height: 40, fontSize: "1rem" }}
                                                        >
                                                            {buyer.firstName[0]}{buyer.lastName[0]}
                                                        </div>
                                                        <div>
                                                            <div className="fw-semibold">
                                                                {buyer.firstName} {buyer.lastName}
                                                            </div>
                                                            <small className="text-muted">{buyer.email}</small>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>{buyer.country}</td>
                                                <td>{buyer.industry}</td>
                                                <td>{buyer.investmentRange}</td>
                                                <td>
                                                    <StatusBadge status={buyer.status} isBlocked={buyer.isBlocked} />
                                                </td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline-primary"
                                                        onClick={() => handleViewDetails(buyer)}
                                                    >
                                                        View
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {!loading && totalPages > 1 && (
                            <div className="card-footer d-flex justify-content-between align-items-center">
                                <div>
                                    Page {currentPage} of {totalPages}
                                </div>
                                <nav aria-label="Page navigation">
                                    <ul className="pagination mb-0">
                                        <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                                            <button
                                                className="page-link"
                                                onClick={() => handlePageChange(currentPage - 1)}
                                                disabled={currentPage === 1}
                                            >
                                                Previous
                                            </button>
                                        </li>
                                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                            let pageNum;
                                            if (totalPages <= 5) {
                                                pageNum = i + 1;
                                            } else if (currentPage <= 3) {
                                                pageNum = i + 1;
                                            } else if (currentPage >= totalPages - 2) {
                                                pageNum = totalPages - 4 + i;
                                            } else {
                                                pageNum = currentPage - 2 + i;
                                            }
                                            return (
                                                <li
                                                    key={pageNum}
                                                    className={`page-item ${currentPage === pageNum ? "active" : ""}`}
                                                >
                                                    <button
                                                        className="page-link"
                                                        onClick={() => handlePageChange(pageNum)}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                </li>
                                            );
                                        })}
                                        <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                                            <button
                                                className="page-link"
                                                onClick={() => handlePageChange(currentPage + 1)}
                                                disabled={currentPage === totalPages}
                                            >
                                                Next
                                            </button>
                                        </li>
                                    </ul>
                                </nav>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Buyer Detail Modal */}
            <BuyerDetailModal
                buyer={selectedBuyer}
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onVerify={(id) => handleStatusAction(id, "verify")}
                onUnverify={(id) => handleStatusAction(id, "unverify")}
                onBlock={(id) => handleStatusAction(id, "block")}
                onUnblock={(id) => handleStatusAction(id, "unblock")}
                updating={updating}
            />

            {/* Mobile Filter Offcanvas */}
            <div
                className="offcanvas offcanvas-start d-lg-none"
                tabIndex={-1}
                id="buyerFilters"
                aria-labelledby="buyerFiltersLabel"
            >
                <div className="offcanvas-header">
                    <h5 className="offcanvas-title" id="buyerFiltersLabel">
                        Filters
                    </h5>
                    <button
                        type="button"
                        className="btn-close"
                        data-bs-dismiss="offcanvas"
                        aria-label="Close"
                    ></button>
                </div>
                <div className="offcanvas-body">
                    <BuyerFilterSidebar filters={filters} onChange={setFilters} />
                </div>
            </div>
        </>
    );
}