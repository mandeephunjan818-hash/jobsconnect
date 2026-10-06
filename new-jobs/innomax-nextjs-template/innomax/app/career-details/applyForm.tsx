import React from 'react';

const ApplyForm = () => {

    return (
        <div className="cs-contact-wrap cs-contact-form cd-contact-form">
            <h2 className="xb-title">Apply for this job</h2>
            <p className="xb-content">innomax doesn’t accept unsolicited resumes from recruiters or employment agencies.</p>
            <form className="contact-form">
                <div className="row">
                    <div className="col-lg-6">
                        <div className="input-field">
                            <label htmlFor="name">Name*</label>
                            <div className="input-box">
                                <input type="text" name="text" id="name" required />
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-6">
                        <div className="input-field">
                            <label htmlFor="email">Email*</label>
                            <div className="input-box">
                                <input type="email" name="email" id="email" required />
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-6">
                        <div className="input-field">
                            <label htmlFor="phone">Phone*</label>
                            <div className="input-box">
                                <input type="tel" name="number" id="phone" />
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-6">
                        <div className="input-field">
                            <label htmlFor="address">Address*</label>
                            <div className="input-box">
                                <input type="text" name="text" id="address" />
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-12">
                        <div className="input-field text-field">
                            <label htmlFor="message">Cover Letter</label>
                            <div className="input-box">
                                <textarea name="massage" id="message"></textarea>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="cp-contact-bottom ul_li_between mt-20">
                    <div className="xb-item--left mt-20">
                        <label htmlFor="file">Upload your resume / CV</label>
                        <input id="file" type="file" required />
                        <p className="xb-item--content"><span>Accepted file types :</span> pdf, doc, jpg, Max. file size: 15 MB.</p>
                    </div>
                    <div className="cp-det-btn mt-20">
                        <button className="cp-btn">Submit now <i className="fal fa-arrow-right"></i></button>
                    </div>
                </div>
            </form>
        </div>
    )
}

export default ApplyForm;