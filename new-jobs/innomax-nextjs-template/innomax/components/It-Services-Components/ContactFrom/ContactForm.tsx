'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-toastify';
import icon1 from '../../../public/images/icon/user-black.svg';
import icon2 from '../../../public/images/icon/sms.svg';
import icon3 from '../../../public/images/icon/call.svg';
import icon4 from '../../../public/images/icon/company-icon.svg';
import Image from 'next/image';

// Schema matching original validation rules
const contactSchema = z.object({
  name: z
    .string()
    .min(1, 'This field is required')
    .regex(/^[a-zA-Z\s]+$/, 'Only letters and spaces allowed'),
  email: z
    .string()
    .min(1, 'This field is required')
    .email('Invalid email address'),
  phone: z
    .string()
    .min(1, 'This field is required')
    .regex(/^\+?[\d\s\-().]{7,20}$/, 'Invalid phone number'),
  company: z.string().min(1, 'This field is required'),
  message: z.string().min(1, 'This field is required'),
});

type FormFields = z.infer<typeof contactSchema>;

const ContactForm: React.FC = () => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormFields>({
    resolver: zodResolver(contactSchema),
    mode: 'onChange', // live validation on change/blur
  });

  const onSubmit = async (data: FormFields) => {
    try {
      const res = await fetch('https://jobs-connect.vercel.app/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone,
          company: data.company,
          message: data.message,
          site: typeof window !== 'undefined' ? window.location.hostname : '',
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to send message');

      toast.success("Message sent successfully! We'll get back to you soon.");
      reset();
    } catch (error: any) {
      toast.error(error.message || 'Failed to send message. Please try again.');
      console.error('Submission error:', error);
    }
  };

  return (
    <form className="contact-form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="row">
        {/* Name */}
        <div className="col-lg-6">
          <div className="input-field pos-rel">
            <input
              type="text"
              className="form-control"
              placeholder="Goladria Gomez"
              {...register('name')}
            />
            {errors.name && (
              <span className="errorMessage">{errors.name.message}</span>
            )}
            <div className="img">
              <Image src={icon1} alt="User icon" />
            </div>
          </div>
        </div>

        {/* Email */}
        <div className="col-lg-6">
          <div className="input-field pos-rel">
            <input
              type="email"
              className="form-control"
              placeholder="newjobs@canada.com"
              {...register('email')}
            />
            {errors.email && (
              <span className="errorMessage">{errors.email.message}</span>
            )}
            <div className="img">
              <Image src={icon2} alt="Email icon" />
            </div>
          </div>
        </div>

        {/* Phone */}
        <div className="col-lg-6">
          <div className="input-field pos-rel">
            <input
              type="tel"
              className="form-control"
              placeholder="+8250-3560 6565"
              {...register('phone')}
            />
            {errors.phone && (
              <span className="errorMessage">{errors.phone.message}</span>
            )}
            <div className="img">
              <Image src={icon3} alt="Phone icon" />
            </div>
          </div>
        </div>

        {/* Company */}
        <div className="col-lg-6">
          <div className="input-field pos-rel">
            <input
              type="text"
              className="form-control"
              placeholder="Company Name"
              {...register('company')}
            />
            {errors.company && (
              <span className="errorMessage">{errors.company.message}</span>
            )}
            <div className="img">
              <Image src={icon4} alt="Company icon" />
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="col-lg-12">
          <div className="input-field text-field pos-rel">
            <textarea
              className="form-control"
              placeholder="How can we help you?"
              {...register('message')}
            />
            {errors.message && (
              <span className="errorMessage">{errors.message.message}</span>
            )}
            <div className="img">
              <Image src={icon2} alt="Message icon" />
            </div>
          </div>
        </div>

        {/* Submit Button (preserved original markup) */}
        <div className="xb-btn text-start float-start">
          <button
            type="submit"
            className="thm-btn thm-btn--fill_icon thm-btn--data thm-btn--data_blue"
            disabled={isSubmitting}
          >
            <div className="xb-item--hidden">
              <span className="xb-item--hidden-text">
                {isSubmitting ? 'Sending...' : 'Send'}
              </span>
            </div>
            <div className="xb-item--holder">
              <span className="xb-item--text xb-item--text1">
                {isSubmitting ? 'Sending...' : 'Send'}
              </span>
              <div className="xb-item--icon">
                <i className="fal fa-plus"></i>
              </div>
              <span className="xb-item--text xb-item--text2">
                {isSubmitting ? 'Sending...' : 'Send'}
              </span>
            </div>
          </button>
        </div>
      </div>
    </form>
  );
};

export default ContactForm;