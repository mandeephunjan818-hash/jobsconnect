'use client';

import React, { useState, useRef, useEffect } from 'react';
import SimpleReactValidator from 'simple-react-validator';

interface FormState {
  name: string;
  email: string;
  subject: string;
  phone: string;
  company: string;
  message: string;
}

const ContactForm: React.FC = () => {
  const [forms, setForms] = useState<FormState>({
    name: '',
    email: '',
    subject: '',
    phone: '',
    company: '',
    message: '',
  });

  const [, forceUpdate] = useState(0);
  const validator = useRef(
    new SimpleReactValidator({ className: 'errorMessage' })
  );

  const changeHandler = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForms(prev => ({ ...prev, [name]: value }));

    if (validator.current.allValid()) {
      validator.current.hideMessages();
    } else {
      validator.current.showMessages();
    }

    // Force re-render to show validation message updates
    forceUpdate(prev => prev + 1);
  };

  const submitHandler = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (validator.current.allValid()) {
      validator.current.hideMessages();
      alert('Form submitted successfully!'); // You can replace this with actual logic

      setForms({
        name: '',
        email: '',
        subject: '',
        phone: '',
        company: '',
        message: '',
      });
    } else {
      validator.current.showMessages();
      forceUpdate(prev => prev + 1);
    }
  };

  return (
    <form onSubmit={submitHandler} className="contact-form">
      <div className="row">
        <div className="col-lg-6">
          <div className="input-field">
            <label htmlFor="name">Name*</label>
            <div className="input-box">
              <input
                value={forms.name}
                type="text"
                name="name"
                id="name"
                className="form-control"
                onChange={changeHandler}
                onBlur={changeHandler}
              />
              {validator.current.message('name', forms.name, 'required|alpha_space')}
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="input-field">
            <label htmlFor="email">Email*</label>
            <div className="input-box">
              <input
                value={forms.email}
                type="email"
                name="email"
                id="email"
                className="form-control"
                onChange={changeHandler}
                onBlur={changeHandler}
              />
              {validator.current.message('email', forms.email, 'required|email')}
            </div>
          </div>
        </div>

        <div className="col-lg-12">
          <div className="input-field">
            <label htmlFor="phone">Phone*</label>
            <div className="input-box">
              <input
                value={forms.phone}
                type="tel"
                name="phone"
                id="phone"
                className="form-control"
                onChange={changeHandler}
                onBlur={changeHandler}
              />
              {validator.current.message('phone', forms.phone, 'required|phone')}
            </div>
          </div>
        </div>

        <div className="col-lg-12">
          <div className="input-field text-field">
            <label htmlFor="message">Message*</label>
            <div className="input-box">
              <textarea
                value={forms.message}
                name="message"
                id="message"
                className="form-control"
                placeholder="How can we help you?"
                onChange={changeHandler}
                onBlur={changeHandler}
              ></textarea>
              {validator.current.message('message', forms.message, 'required')}
            </div>
          </div>
        </div>
      </div>

      <div className="cp-det-btn mt-20 d-grid">
        <button className="cp-btn" type="submit">
          Send us a message <i className="fal fa-arrow-right"></i>
        </button>
      </div>
    </form>
  );
};

export default ContactForm;
