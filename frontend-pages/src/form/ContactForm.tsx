"use client";
import * as yup from "yup";
import { toast } from 'react-toastify';
import { useForm } from "react-hook-form";
import { yupResolver } from '@hookform/resolvers/yup';
import { FiUser, FiMail, FiEdit3, FiMessageSquare } from 'react-icons/fi';
import RightArrawWhitIcon from '@/svg/RightArrawWhitIcon';

interface FormData {
  Fname: string;
  email: string;
  subject: string;
  message: string;
}

const schema = yup
  .object({
    Fname: yup.string().required().label("Name"),
    email: yup.string().required().email().label("Email"),
    subject: yup.string().required().label("Subject"),
    message: yup.string().required().label("Message"),
  })
  .required();

export default function ContactForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.Fname,
          email: data.email,
          site: window.location.hostname,
          subject: data.subject,
          message: data.message,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to send message');
      }

      toast.success("Message sent successfully! We'll get back to you soon.");
      reset();
    } catch (error: any) {
      toast.error(error.message || "Failed to send message. Please try again.");
      console.error('Submission error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="lmx-contact-form" noValidate>
      <div className="lmx-contact-field">
        <div className={`lmx-contact-input-wrap${errors.Fname ? ' has-error' : ''}`}>
          <span className="lmx-contact-input-icon"><FiUser size={16} /></span>
          <input type="text" placeholder="Your Name" {...register("Fname")} disabled={isSubmitting} />
        </div>
        {errors.Fname?.message && <p className="lmx-contact-error">{errors.Fname.message}</p>}
      </div>

      <div className="lmx-contact-row">
        <div className="lmx-contact-field">
          <div className={`lmx-contact-input-wrap${errors.email ? ' has-error' : ''}`}>
            <span className="lmx-contact-input-icon"><FiMail size={16} /></span>
            <input type="email" placeholder="Email Address" {...register("email")} disabled={isSubmitting} />
          </div>
          {errors.email?.message && <p className="lmx-contact-error">{errors.email.message}</p>}
        </div>

        <div className="lmx-contact-field">
          <div className={`lmx-contact-input-wrap${errors.subject ? ' has-error' : ''}`}>
            <span className="lmx-contact-input-icon"><FiEdit3 size={16} /></span>
            <input type="text" placeholder="Subject" {...register("subject")} disabled={isSubmitting} />
          </div>
          {errors.subject?.message && <p className="lmx-contact-error">{errors.subject.message}</p>}
        </div>
      </div>

      <div className="lmx-contact-field">
        <div className={`lmx-contact-input-wrap lmx-contact-textarea-wrap${errors.message ? ' has-error' : ''}`}>
          <span className="lmx-contact-input-icon lmx-contact-input-icon--top"><FiMessageSquare size={16} /></span>
          <textarea
            className="button-text"
            placeholder="Your Message"
            rows={5}
            {...register("message")}
            disabled={isSubmitting}
          />
        </div>
        {errors.message?.message && <p className="lmx-contact-error">{errors.message.message}</p>}
      </div>

      <div className="lmx-contact-form-footer">
        <button
          className="luminix-default-btn extra-btn4 pill lmx-contact-submit-btn"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Sending...' : 'Send Message'}
          <RightArrawWhitIcon />
        </button>
        <p className="lmx-contact-safe-note">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Your information is safe with us and will never be shared.
        </p>
      </div>
    </form>
  );
}