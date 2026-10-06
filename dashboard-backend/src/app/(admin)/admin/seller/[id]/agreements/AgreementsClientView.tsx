'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Editor } from '@tinymce/tinymce-react';

interface Agreement {
  _id: string;
  title: string;
  content: string;
  version: string;
  status: 'draft' | 'signed' | 'expired';
  effectiveDate: string;
  createdAt: string;
  updatedAt: string;
}

export default function BusinessAgreementsPage() {
  const params = useParams();
  const registrationId = params.id as string;

  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    version: '1.0',
    status: 'draft' as 'draft' | 'signed' | 'expired',
    effectiveDate: new Date().toISOString().split('T')[0],
  });

  const editorRef = useRef<any>(null);

  useEffect(() => {
    fetchAgreements();
  }, [registrationId]);

  const fetchAgreements = async () => {
    try {
      const res = await fetch(`/api/admin/business-registrations/${registrationId}/agreements`);
      const data = await res.json();
      setAgreements(data);
    } catch (error) {
      console.error('Error fetching agreements:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      version: '1.0',
      status: 'draft',
      effectiveDate: new Date().toISOString().split('T')[0],
    });
    setEditingId(null);
    if (editorRef.current) {
      editorRef.current.setContent('');
    }
  };

  // Reusable save function: returns the saved agreement object or throws error
  const saveAgreement = async (): Promise<Agreement> => {
    const content = editorRef.current ? editorRef.current.getContent() : formData.content;
    const payload = { ...formData, content };

    const url = editingId
      ? `/api/admin/business-registrations/${registrationId}/agreements/${editingId}`
      : `/api/admin/business-registrations/${registrationId}/agreements`;
    const method = editingId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Save failed');
    }

    const savedAgreement = await res.json();
    return savedAgreement;
  };

  // Handle Save button (just save, reset form, refresh list)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await saveAgreement();
      setMessage(editingId ? 'Agreement updated!' : 'Agreement created!');
      resetForm();
      fetchAgreements();
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle Send button (save + email)
  const handleSend = async () => {
    setSending(true);
    setMessage('');

    try {
      // First save the agreement
      const savedAgreement = await saveAgreement();

      // Then send it via email
      const sendRes = await fetch(
        `/api/admin/business-registrations/${registrationId}/agreements/${savedAgreement._id}/send`,
        { method: 'POST' }
      );

      if (!sendRes.ok) {
        const errorData = await sendRes.json();
        throw new Error(errorData.error || 'Failed to send email');
      }

      setMessage('Agreement saved and sent to client successfully!');
      resetForm();
      fetchAgreements();
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  const handleEdit = (agreement: Agreement) => {
    setEditingId(agreement._id);
    setFormData({
      title: agreement.title,
      content: agreement.content,
      version: agreement.version,
      status: agreement.status,
      effectiveDate: new Date(agreement.effectiveDate).toISOString().split('T')[0],
    });
    if (editorRef.current) {
      editorRef.current.setContent(agreement.content);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this agreement?')) return;
    try {
      const res = await fetch(
        `/api/admin/business-registrations/${registrationId}/agreements/${id}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        fetchAgreements();
        if (editingId === id) resetForm();
      } else {
        alert('Delete failed');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString();

  const statusBadgeClass = (status: string) => {
    switch (status) {
      case 'signed': return 'bg-success text-white';
      case 'expired': return 'bg-danger text-white';
      default: return 'bg-secondary text-white';
    }
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-0 fs-4 ">Agreements for Registration </h2>
          <div className='text-gray mt-2 ' style={{ fontSize: "12px" }} >#{registrationId}</div>
        </div>
        <button className="btn btn-sm btn-outline-secondary" onClick={resetForm}>
          New Agreement
        </button>
      </div>

      {message && (
        <div
          className={`alert ${message.includes('Error') ? 'alert-danger' : 'alert-success'} mb-4`}
        >
          {message}
        </div>
      )}

      <div className="row">
        {/* Left column: Editor */}
        <div className="col-lg-8 p-0 mb-4">
          <div className="card shadow-sm rounded-end-0 ">
            <div className="card-header bg-white">
              <h5 className="mb-0" style={{ fontSize: "14px" }}>{editingId ? 'Edit Agreement' : 'Create Agreement'}</h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Title *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div className="row mb-3">
                  <div className="col-md-4">
                    <label className="form-label">Version</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.version}
                      onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Status</label>
                    <select
                      className="form-select"
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value as any })
                      }
                    >
                      <option value="draft">Draft</option>
                      <option value="signed">Signed</option>
                      <option value="expired">Expired</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Effective Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.effectiveDate}
                      onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">Content *</label>
                  <Editor
                    apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY}
                    onInit={(evt, editor) => (editorRef.current = editor)}
                    initialValue={formData.content}
                    init={{
                      height: 400,
                      menubar: true,
                      plugins: [
                        'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                        'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                        'insertdatetime', 'media', 'table', 'help', 'wordcount'
                      ],
                      toolbar:
                        'undo redo | blocks | bold italic forecolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | help',
                      content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                    }}
                  />
                </div>

                <div className="d-flex gap-2">
                  <button type="submit" style={{fontSize:"12px"}} className=" px-3 py-2 bg-primary text-white border-0 rounded " disabled={loading}>
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    className="px-3 py-2 bg-success text-white border-0 rounded"
                    onClick={handleSend}
                    disabled={sending}
                    style={{fontSize:"12px"}}
                  >
                    {sending ? 'Sending...' : 'Save & Send to Client'}
                  </button>
                  {editingId && (
                    <button type="button" className="btn btn-secondary" onClick={resetForm}>
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Right column: List of agreements - unchanged */}
        <div className="col-lg-4 p-0 ">
          <div className="card shadow-sm border-start-0 rounded-start-0 ">
            <div className="card-header bg-white">
              <h5 className="mb-0" style={{fontSize:"14px"}}>Existing Agreements</h5>
            </div>
            <div className="card-body p-0">
              <div className="list-group list-group-flush">
                {agreements.length === 0 ? (
                  <div className="text-center text-muted py-5">No agreements yet</div>
                ) : (
                  agreements.map((agreement) => (
                    <div
                      key={agreement._id}
                      className="list-group-item list-group-item-action d-flex justify-content-between align-items-start"
                    >
                      <div className="me-auto ">
                        <div className="fw-semibold">{agreement.title}</div>
                        <div className="small text-muted">
                          v{agreement.version} • {formatDate(agreement.effectiveDate)}
                        </div>
                        <span className={`badge ${statusBadgeClass(agreement.status)} mt-1`}>
                          {agreement.status}
                        </span>
                      </div>
                      <div className="btn-group justify-content-end" role="group">
                        <button
                          className="btn btn-sm btn-outline-primary  "
                          onClick={() => handleEdit(agreement)}
                          title="Edit"
                        >
                          <i className="ti ti-edit"></i>
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger  "
                          onClick={() => handleDelete(agreement._id)}
                          title="Delete"
                        >
                          <i className="ti ti-trash"></i>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}