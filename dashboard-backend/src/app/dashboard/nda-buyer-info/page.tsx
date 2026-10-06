'use client';

import { useState, useMemo, ChangeEvent, FormEvent, useEffect } from 'react';
import Select, { StylesConfig, SingleValue } from 'react-select';
import countryList from 'react-select-country-list';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import LocationPicker from '@/components/LocationPicker';

interface CountryOption {
    label: string;
    value: string;
}

interface RegistrationData {
    _id?: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    country: CountryOption | null;
    userId: string;
    location: {
        address: string;
        lat: number | undefined;
        lng: number | undefined;
    };
    mapsIframe: string;
}

export default function Register() {
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

    const options = useMemo(() => countryList().getData() as CountryOption[], []);

    const [location, setLocation] = useState<{
        address: string;
        lat: number;
        lng: number;
        mapsIframe: string;
    }>({
        address: '',
        lat: 0,
        lng: 0,
        mapsIframe: '',
    });

    const [formData, setFormData] = useState<RegistrationData>({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        country: null,
        userId: '',
        location: {
            address: '',
            lat: undefined,
            lng: undefined,
        },
        mapsIframe: '',
    });

    // Fetch existing registration when session is ready
    useEffect(() => {
        if (status === 'loading') return;
        if (!session) {
            setLoading(false);
            return;
        }

        const fetchRegistration = async () => {
            try {
                const res = await fetch('/api/admin/buyers-registration/user');
                if (res.status === 404) {
                    // No registration yet – new user, stay in create mode
                    setLoading(false);
                    // Prefill name/email from session
                    setFormData(prev => ({
                        ...prev,
                        firstName: session.user?.name?.split(' ')[0] || '',
                        lastName: session.user?.name?.split(' ').slice(1).join(' ') || '',
                        email: session.user?.email || '',
                        userId: (session.user as any)?.id || session.user?.email || '',
                    }));
                    return;
                }
                if (!res.ok) throw new Error('Failed to load');
                const data = await res.json();

                // Set form data including country
                setFormData({
                    ...data,
                    country: options.find(c => c.value === data.country) || null,
                    userId: data.userId || (session.user as any)?.id || session.user?.email || '',
                });

                // FIX: Also set the location state for LocationPicker
                if (data.location) {
                    setLocation({
                        address: data.location.address || '',
                        lat: data.location.lat ?? 0,
                        lng: data.location.lng ?? 0,
                        mapsIframe: data.mapsIframe || '',
                    });
                }

                setLoading(false);
            } catch (err: any) {
                setSubmitError(err.message);
                setLoading(false);
            }
        };
        fetchRegistration();
    }, [session, status, options]);

    const handleCountryChange = (selectedOption: SingleValue<CountryOption>) => {
        setFormData(prev => ({ ...prev, country: selectedOption }));
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
        setFormData(prev => ({ ...prev, [name]: val }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setSubmitError(null);
        setSubmitSuccess(null);

        try {
            const payload = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                phone: formData.phone,
                country: formData.country?.value || formData.country?.label || '', // FIX: send string value
                userId: formData.userId,
                location: {
                    address: location.address,
                    lat: location.lat,
                    lng: location.lng,
                },
                mapsIframe: location.mapsIframe,
            };

            const res = await fetch('/api/admin/buyers-registration/update-request', {
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
        singleValue: (provided) => ({
            ...provided,
            color: 'black',
            padding: '0.5rem',
        }),
        menu: (provided) => ({ ...provided, backgroundColor: '#fff', zIndex: 9999 }),
        input: (provided) => ({ ...provided, color: 'black' }),
    };

    if (loading) {
        return <div className="container mt-5 text-center">Loading...</div>;
    }

    return (
        <section className="contact-info-section">
            <div className="container mt-5">
                <div className="row row-reverse g-5">
                    <div className="col-12 col-md-12">
                        <h2>Register For Fully Accessing Site Functionalities</h2>
                        <p className="mb-5">List confidentially on Boomr and connect with verified sellers through an NDA-protected process.</p>

                        {submitSuccess && (
                            <div className="alert alert-success" role="alert">
                                {submitSuccess}
                            </div>
                        )}
                        {submitError && (
                            <div className="alert alert-danger" role="alert">
                                {submitError}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div className="row g-4">
                                <div className="col-12 col-md-6">
                                    <label className="mb-2">First Name</label>
                                    <input type="text" className="form-control bg-secondary" placeholder="Your First Name" name="firstName" value={formData.firstName} onChange={handleInputChange} required />
                                </div>
                                <div className="col-12 col-md-6">
                                    <label className="mb-2">Last Name</label>
                                    <input type="text" className="form-control bg-secondary" placeholder="Your Last Name" name="lastName" value={formData.lastName} onChange={handleInputChange} required />
                                </div>
                                <div className="col-12">
                                    <label className="mb-2">Email Address</label>
                                    <input type="email" className="form-control bg-secondary" placeholder="Email address" name="email" value={formData.email} onChange={handleInputChange} required />
                                </div>
                                <div className="col-12">
                                    <label className="mb-2">Country</label>
                                    <Select
                                        options={options}
                                        value={formData.country}
                                        onChange={handleCountryChange}
                                        styles={customStyles}
                                        isClearable={false}
                                    />
                                </div>
                                <div className="col-12">
                                    <label className="mb-2">Contact Number</label>
                                    <input type="tel" className="form-control bg-secondary" placeholder="Your Contact Number" name="phone" value={formData.phone} onChange={handleInputChange} required />
                                </div>
                                <div className="col-12">
                                    <label className="mb-2">Your Location</label>
                                    <LocationPicker value={location} onChange={setLocation} />
                                </div>

                                <p className="small text-muted">
                                    Boomr will share the above information with the listing owner for evaluation
                                    purposes. By submitting you confirm you have read and agree to our{' '}
                                    <Link href="#" className="text-primary">Terms of Service</Link> and{' '}
                                    <Link href="#" className="text-primary">Privacy Policy</Link>.
                                </p>

                                <div className="col-12">
                                    <button type="submit" className="btn btn-primary w-100 rounded-pill py-3" disabled={submitting}>
                                        {submitting ? 'Sending…' : <>Request Update <i className="ti ti-arrow-up-right" /></>}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    );
}