'use client';

import { useState, useMemo, ChangeEvent, FormEvent, useRef, useCallback, useEffect } from 'react';
import Select, { StylesConfig, SingleValue } from 'react-select';
import countryList from 'react-select-country-list';
import Webcam from 'react-webcam';
import { useSession } from 'next-auth/react';
import LocationPicker, { Location } from '@/components/LocationPicker'; // ← ADD

interface CountryOption {
  label: string;
  value: string;
}

interface RegistrationData {
  _id?: string;
  businessName: string;
  businessType: string;
  location: string;
  years: string;
  contactNumber: string;
  revenue: string;
  ebitda: string;
  overview: string;
  firstName: string;
  lastName: string;
  email: string;
  sellerContactNumber: string;
  ownerOrBroker: string;
  confirmed: boolean;
  selfie: string | null;
  selfieUrl?: string;
  country: CountryOption | null;
  // ← ADD: structured location fields from DB
  businessLocationAddress?: string;
  businessLocationLat?: number;
  businessLocationLng?: number;
  mapsIframe?: string;
}

export default function Register() {
  const { data: session, status } = useSession();
  const webcamRef = useRef<Webcam>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [userExistes, setuserExistes] = useState(false);

  // ← ADD: structured location state
  const [businessLocation, setBusinessLocation] = useState<Location>({
    address: '',
    lat: 0,
    lng: 0,
    mapsIframe: '',
  });

  const options = useMemo(() => countryList().getData() as CountryOption[], []);

  const [formData, setFormData] = useState<RegistrationData>({
    businessName: '',
    businessType: '',
    location: '',
    years: '',
    contactNumber: '',
    revenue: '',
    ebitda: '',
    overview: '',
    firstName: '',
    lastName: '',
    email: '',
    sellerContactNumber: '',
    ownerOrBroker: '',
    confirmed: false,
    selfie: null,
    country: null,
  });

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      setLoading(false);
      return;
    }

    const fetchRegistration = async () => {
      try {
        const res = await fetch('/api/admin/business-registrations/user');
        if (res.status === 404) {
          setuserExistes(false);
          setLoading(false);
          setFormData(prev => ({
            ...prev,
            firstName: session.user?.name?.split(' ')[0] || '',
            lastName: session.user?.name?.split(' ').slice(1).join(' ') || '',
            email: session.user?.email || '',
          }));
          return;
        }
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();

        setuserExistes(true);

        setFormData({
          ...data,
          years: data.years.toString(),
          selfie: null,
          selfieUrl: data.selfieUrl,
          country: options.find(c => c.value === data.country) || null,
        });

        // ← ADD: populate map location from fetched data
        setBusinessLocation({
          address: data.businessLocation?.address || '',
          lat:     data.businessLocation?.lat     || 0,
          lng:     data.businessLocation?.lng     || 0,
          mapsIframe: data.mapsIframe             || '',
        });

        setLoading(false);
      } catch (err: any) {
        setSubmitError(err.message);
        setLoading(false);
      }
    };
    fetchRegistration();
  }, [session, status, options]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleCountryChange = (selectedOption: SingleValue<CountryOption>) => {
    setFormData(prev => ({ ...prev, country: selectedOption }));
  };

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setFormData(prev => ({ ...prev, selfie: imageSrc, selfieUrl: undefined }));
      setIsCameraOpen(false);
    }
  }, [webcamRef]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const payload: any = {
        businessName:        formData.businessName,
        businessType:        formData.businessType,
        location:            formData.location,
        years:               parseInt(formData.years, 10),
        contactNumber:       formData.contactNumber,
        revenue:             formData.revenue,
        ebitda:              formData.ebitda,
        overview:            formData.overview,
        firstName:           formData.firstName,
        lastName:            formData.lastName,
        email:               formData.email,
        sellerContactNumber: formData.sellerContactNumber,
        ownerOrBroker:       formData.ownerOrBroker,
        confirmed:           formData.confirmed,
        country:             formData.country?.value || '',

        // ← ADD: structured location
        businessLocationAddress: businessLocation.address,
        businessLocationLat:     businessLocation.lat,
        businessLocationLng:     businessLocation.lng,
        mapsIframe:              businessLocation.mapsIframe,
      };

      if (formData.selfieUrl && !formData.selfie) {
        payload.selfieUrl = formData.selfieUrl;
      } else if (formData.selfie) {
        console.warn('Selfie update not implemented in this demo');
      }

      const res = await fetch('/api/admin/business-registrations/update-request', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update request failed');

      setSubmitSuccess('Update request submitted! Our team will review it.');
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const customStyles: StylesConfig<CountryOption, false> = {
    control: (provided) => ({
      ...provided,
      backgroundColor: '#f7f8ff',
      borderColor: '#f7f8ff',
      minHeight: '38px',
      boxShadow: 'none',
      '&:hover': { borderColor: '#5a6268' },
    }),
    singleValue: (provided) => ({ ...provided, color: 'black', padding: '0.5rem' }),
    menu:        (provided) => ({ ...provided, backgroundColor: '#fff', zIndex: 9999 }),
    input:       (provided) => ({ ...provided, color: 'black' }),
  };

  if (loading) {
    return <div className="container mt-5 text-center">Loading...</div>;
  }

  return (
    <section className="contact-info-section">
      <div className="container mt-5">
        {userExistes ? (
          <div className="row row-reverse g-5">
            <div className="col-12 col-md-12">
              <h2>Register Your Business</h2>
              <p className="mb-5">List confidentially on Boomr and connect with verified buyers through an NDA-protected process.</p>

              {submitSuccess && <div className="alert alert-success">{submitSuccess}</div>}
              {submitError   && <div className="alert alert-danger">{submitError}</div>}

              <form onSubmit={handleSubmit}>
                <div className="row g-4">
                  <div className="col-12 col-lg-8">
                    <div className="col-12 mb-3">
                      <label className="mb-2">Business Name</label>
                      <input type="text" className="form-control bg-secondary" name="businessName" value={formData.businessName} onChange={handleInputChange} required />
                    </div>
                    <div className="col-12">
                      <label className="mb-2">Business Type</label>
                      <input type="text" className="form-control bg-secondary" name="businessType" value={formData.businessType} onChange={handleInputChange} required />
                    </div>
                  </div>

                  <div className="col-12 col-md-4">
                    <label className="mb-2">Verification Selfie</label>
                    <div className="form-group d-flex flex-column align-items-center justify-content-center bg-secondary rounded-3 p-3 overflow-hidden" style={{ minHeight: '145px', border: '2px dashed #cbd5e1' }}>
                      {isCameraOpen ? (
                        <div className="w-100 text-center">
                          <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" className="rounded-3 w-100" videoConstraints={{ facingMode: 'user' }} />
                          <button type="button" className="btn btn-sm btn-primary mt-2 w-100" onClick={capture}>Capture</button>
                          <button type="button" className="btn btn-sm btn-secondary mt-2 w-100" onClick={() => setIsCameraOpen(false)}>Cancel</button>
                        </div>
                      ) : formData.selfie ? (
                        <div className="text-center" onClick={() => setIsCameraOpen(true)} style={{ cursor: 'pointer' }}>
                          <img src={formData.selfie} alt="Preview" className="rounded-circle shadow-sm" style={{ width: '80px', height: '80px', objectFit: 'cover' }} />
                          <p className="mt-2 mb-0 small text-primary fw-bold">Tap to Retake</p>
                        </div>
                      ) : formData.selfieUrl ? (
                        <div className="text-center" onClick={() => setIsCameraOpen(true)} style={{ cursor: 'pointer' }}>
                          <img src={formData.selfieUrl} alt="Current Selfie" className="rounded-circle shadow-sm" style={{ width: '80px', height: '80px', objectFit: 'cover' }} />
                          <p className="mt-2 mb-0 small text-primary fw-bold">Tap to Update</p>
                        </div>
                      ) : (
                        <div className="text-center text-muted" onClick={() => setIsCameraOpen(true)} style={{ cursor: 'pointer' }}>
                          <i className="ti ti-camera fs-1 mb-2" />
                          <p className="mb-0 small fw-bold">Click to Open Camera</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="col-12">
                    <label className="mb-2">Business Country</label>
                    <Select options={options} value={formData.country} onChange={handleCountryChange} styles={customStyles} />
                  </div>

                  <div className="col-12">
                    <label className="mb-2">Business Location</label>
                    <input type="text" className="form-control bg-secondary" name="location" value={formData.location} onChange={handleInputChange} required />
                  </div>

                  {/* ← ADD: map-based location picker */}
                  <div className="col-12">
                    <label className="mb-2">Pin Your Business Location</label>
                    <LocationPicker value={businessLocation} onChange={setBusinessLocation} />
                  </div>

                  <div className="col-12">
                    <label className="mb-2">Years in Business</label>
                    <input type="number" className="form-control bg-secondary" name="years" value={formData.years} onChange={handleInputChange} required />
                  </div>
                  <div className="col-12">
                    <label className="mb-2">Contact Number</label>
                    <input type="tel" className="form-control bg-secondary" name="contactNumber" value={formData.contactNumber} onChange={handleInputChange} required />
                  </div>
                  <div className="col-12">
                    <label className="mb-2">Annual Revenue</label>
                    <input type="number" className="form-control bg-secondary" name="revenue" value={formData.revenue} onChange={handleInputChange} required />
                  </div>
                  <div className="col-12">
                    <label className="mb-2">EBITDA</label>
                    <input type="text" className="form-control bg-secondary" name="ebitda" value={formData.ebitda} onChange={handleInputChange} required />
                  </div>
                  <div className="col-12">
                    <label className="mb-2">Listing Overview</label>
                    <textarea className="form-control bg-secondary" name="overview" rows={4} value={formData.overview} onChange={handleInputChange} required />
                  </div>

                  <h2>Seller Contact</h2>
                  <div className="col-12 col-md-6">
                    <label className="mb-2">First Name</label>
                    <input type="text" className="form-control bg-secondary" name="firstName" value={formData.firstName} onChange={handleInputChange} required />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="mb-2">Last Name</label>
                    <input type="text" className="form-control bg-secondary" name="lastName" value={formData.lastName} onChange={handleInputChange} required />
                  </div>
                  <div className="col-12">
                    <label className="mb-2">Email Address</label>
                    <input type="email" className="form-control bg-secondary" name="email" value={formData.email} onChange={handleInputChange} required />
                  </div>
                  <div className="col-12">
                    <label className="mb-2">Seller Contact Number</label>
                    <input type="tel" className="form-control bg-secondary" name="sellerContactNumber" value={formData.sellerContactNumber} onChange={handleInputChange} required />
                  </div>
                  <div className="col-12">
                    <label className="mb-2">Are You The Owner Or The Broker?</label>
                    <input type="text" className="form-control bg-secondary" name="ownerOrBroker" value={formData.ownerOrBroker} onChange={handleInputChange} required />
                  </div>

                  <div className="col-12">
                    <div className="form-group d-flex align-items-center">
                      <input type="checkbox" className="bg-secondary me-3" name="confirmed" checked={formData.confirmed} onChange={handleInputChange} required />
                      <p className="my-auto">I confirm the information provided is accurate and I have authority to list this business.</p>
                    </div>
                  </div>

                  <div className="col-12">
                    <button type="submit" className="btn btn-primary w-100 rounded-pill text-white py-3" disabled={submitting}>
                      {submitting ? 'Submitting...' : 'Submit Update Request'} <i className="ti ti-arrow-up-right" />
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <div className="w-100 h-100 d-flex align-items-center justify-content-center">
            <a href="/nda-seller">
              <button className="btn btn-primary">
                Register Business <i className="ti ti-arrow-right" />
              </button>
            </a>
          </div>
        )}
      </div>
    </section>
  );
}