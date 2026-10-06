"use client";

import { useEffect, useRef } from "react";
import { Buyer, BuyerStatus } from "@/hooks/admin/useBuyers";

interface BuyerDetailModalProps {
    buyer: Buyer | null;
    isOpen: boolean;
    onClose: () => void;
    onVerify: (id: string) => void;
    onUnverify: (id: string) => void;
    onBlock: (id: string) => void;
    onUnblock: (id: string) => void;
    onCreateContract?: (id: string) => void; // new optional prop
    updating: boolean;
}

export default function BuyerDetailModal({
    buyer,
    isOpen,
    onClose,
    onVerify,
    onUnverify,
    onBlock,
    onUnblock,
    onCreateContract,
    updating,
}: BuyerDetailModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);

    // Close modal on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };

        if (isOpen) {
            document.addEventListener("keydown", handleEscape);
            document.body.style.overflow = "hidden";
        }

        return () => {
            document.removeEventListener("keydown", handleEscape);
            document.body.style.overflow = "unset";
        };
    }, [isOpen, onClose]);

    // Close on backdrop click
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === modalRef.current) {
            onClose();
        }
    };

    if (!isOpen || !buyer) return null;

    const getStatusBadgeClass = (status: BuyerStatus) => {
        switch (status) {
            case "verified":
                return "bg-success";
            case "unverified":
                return "bg-warning text-dark";
            case "pending":
                return "bg-info text-dark";
            case "blocked":
                return "bg-danger";
            default:
                return "bg-secondary";
        }
    };

    // Helper to get initials
    const getInitials = () => {
        return `${buyer.firstName[0]}${buyer.lastName[0]}`.toUpperCase();
    };

    return (
        <div
            ref={modalRef}
            className="modal fade show d-block"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
            onClick={handleBackdropClick}
        >
            <div className="modal-dialog modal-lg modal-dialog-scrollable">
                <div className="modal-content">
                    {/* Modal Header with Avatar and Basic Info */}
                    <div className="modal-header border-0 pb-0">
                        <div className="d-flex align-items-center">
                            {/* Avatar */}
                            <div
                                className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-3"
                                style={{ width: "60px", height: "60px", fontSize: "1.5rem" }}
                            >
                                {getInitials()}
                            </div>
                            <div>
                                <h4 className="mb-1">
                                    {buyer.firstName} {buyer.lastName}
                                </h4>
                                <p className="text-muted mb-1">{buyer.email}</p>
                                <span className={`badge ${getStatusBadgeClass(buyer.status)}`}>
                                    {buyer.status.toUpperCase()}
                                </span>
                            </div>
                        </div>
                        <button
                            type="button"
                            className="btn-close"
                            onClick={onClose}
                            aria-label="Close"
                        ></button>
                    </div>

                    {/* Modal Body - Enhanced with Cards */}
                    <div className="modal-body">
                        {/* Personal Information Card */}
                        <div className="card mb-4 shadow-sm">
                            <div className="card-header bg-light">
                                <h6 className="mb-0">
                                    <i className="ti ti-user me-2"></i>Personal Information
                                </h6>
                            </div>
                            <div className="card-body">
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label className="form-label text-muted small">Buyer ID</label>
                                        <p className="fw-semibold">{buyer.id}</p>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label text-muted small">Registration Date</label>
                                        <p className="fw-semibold">
                                            {new Date(buyer.registeredDate).toLocaleDateString(undefined, {
                                                year: "numeric",
                                                month: "long",
                                                day: "numeric",
                                            })}
                                        </p>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label text-muted small">First Name</label>
                                        <p className="fw-semibold">{buyer.firstName}</p>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label text-muted small">Last Name</label>
                                        <p className="fw-semibold">{buyer.lastName}</p>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label text-muted small">Email Address</label>
                                        <p className="fw-semibold">{buyer.email}</p>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label text-muted small">Contact Number</label>
                                        <p className="fw-semibold">{buyer.contactNumber}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Company Information Card */}
                        <div className="card mb-4 shadow-sm">
                            <div className="card-header bg-light">
                                <h6 className="mb-0">
                                    <i className="ti ti-building me-2"></i>Company Information
                                </h6>
                            </div>
                            <div className="card-body">
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label className="form-label text-muted small">Company Name</label>
                                        <p className="fw-semibold">{buyer.companyName || "N/A"}</p>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label text-muted small">Industry</label>
                                        <p className="fw-semibold">{buyer.industry}</p>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label text-muted small">Country</label>
                                        <p className="fw-semibold">{buyer.country}</p>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label text-muted small">Investment Range</label>
                                        <p className="fw-semibold">{buyer.investmentRange}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Activity Card */}
                        <div className="card mb-4 shadow-sm">
                            <div className="card-header bg-light">
                                <h6 className="mb-0">
                                    <i className="ti ti-activity me-2"></i>Activity
                                </h6>
                            </div>
                            <div className="card-body">
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label className="form-label text-muted small">Last Active</label>
                                        <p className="fw-semibold">
                                            {new Date(buyer.lastActive).toLocaleDateString(undefined, {
                                                year: "numeric",
                                                month: "short",
                                                day: "numeric",
                                            })}
                                        </p>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label text-muted small">Total Inquiries</label>
                                        <p className="fw-semibold">{buyer.totalInquiries}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Notes if any */}
                        {buyer.notes && (
                            <div className="card mb-4 shadow-sm">
                                <div className="card-header bg-light">
                                    <h6 className="mb-0">
                                        <i className="ti ti-notes me-2"></i>Notes
                                    </h6>
                                </div>
                                <div className="card-body">
                                    <p className="mb-0">{buyer.notes}</p>
                                </div>
                            </div>
                        )}

                        {/* Status Flags */}
                        <div className="d-flex align-items-center">
                            <span className="text-muted me-3">Account Blocked:</span>
                            <span className={`badge ${buyer.isBlocked ? "bg-danger" : "bg-success"}`}>
                                {buyer.isBlocked ? "Yes" : "No"}
                            </span>
                        </div>
                    </div>

                    {/* Modal Footer with Action Buttons */}
                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                        >
                            Close
                        </button>

                        {/* Create Contract Button (if handler provided) */}
                        {onCreateContract && (
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => onCreateContract(buyer.id)}
                                disabled={updating}
                            >
                                <i className="ti ti-file-text me-1"></i>
                                Create Contract
                            </button>
                        )}

                        {/* Status Action Buttons */}
                        <div className="btn-group">
                            {buyer.status !== "verified" && !buyer.isBlocked && (
                                <button
                                    type="button"
                                    className="btn btn-success"
                                    onClick={() => onVerify(buyer.id)}
                                    disabled={updating}
                                >
                                    {updating ? (
                                        <span className="spinner-border spinner-border-sm me-2" />
                                    ) : (
                                        <i className="ti ti-check me-1" />
                                    )}
                                    Verify
                                </button>
                            )}

                            {buyer.status === "verified" && (
                                <button
                                    type="button"
                                    className="btn btn-warning"
                                    onClick={() => onUnverify(buyer.id)}
                                    disabled={updating}
                                >
                                    {updating ? (
                                        <span className="spinner-border spinner-border-sm me-2" />
                                    ) : (
                                        <i className="ti ti-x me-1" />
                                    )}
                                    Unverify
                                </button>
                            )}

                            {!buyer.isBlocked ? (
                                <button
                                    type="button"
                                    className="btn btn-danger"
                                    onClick={() => onBlock(buyer.id)}
                                    disabled={updating}
                                >
                                    {updating ? (
                                        <span className="spinner-border spinner-border-sm me-2" />
                                    ) : (
                                        <i className="ti ti-ban me-1" />
                                    )}
                                    Block
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="btn btn-info"
                                    onClick={() => onUnblock(buyer.id)}
                                    disabled={updating}
                                >
                                    {updating ? (
                                        <span className="spinner-border spinner-border-sm me-2" />
                                    ) : (
                                        <i className="ti ti-lock-open me-1" />
                                    )}
                                    Unblock
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}