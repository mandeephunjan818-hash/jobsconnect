'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface AgreementData {
  _id: string;
  title: string;
  content: string;
  version: string;
  effectiveDate: string;
  status: string;
  businessName: string;
  clientName: string;
  clientEmail: string;
}

export default function AgreementSignPage() {
  const { token } = useParams();
  const router = useRouter();
  const [agreement, setAgreement] = useState<AgreementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchAgreement() {
      try {
        const res = await fetch(`/api/admin/business-registrations/acceptance/${token}`);
        if (!res.ok) throw new Error('Invalid or expired link');
        const data = await res.json();
        setAgreement(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchAgreement();
  }, [token]);

  const handleAccept = async () => {
    if (!confirm('By clicking Accept, you agree to the terms of this agreement.')) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/business-registrations/acceptance/${token}`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to accept');
      }
      alert('Agreement signed successfully!');
      router.push('/dashboard'); // or a thank you page
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-center p-5">Loading agreement...</div>;
  if (error) return <div className="alert alert-danger m-5">{error}</div>;

  return (
    <div className="container py-5">
      <div className="card shadow-sm">
        <div className="card-header bg-white">
          <h2>{agreement?.title}</h2>
          <p className="text-muted">
            Version {agreement?.version} • Effective {new Date(agreement?.effectiveDate || '').toLocaleDateString()}
          </p>
        </div>
        <div className="card-body">
          <div className="mb-4" dangerouslySetInnerHTML={{ __html: agreement?.content || '' }} />
          <hr />
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <strong>Client:</strong> {agreement?.clientName} ({agreement?.clientEmail})<br />
              <strong>Business:</strong> {agreement?.businessName}
            </div>
            <button
              className="btn btn-success btn-lg"
              onClick={handleAccept}
              disabled={submitting}
            >
              {submitting ? 'Processing...' : 'I Accept the Agreement'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}