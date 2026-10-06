import Breadcrumb from "@/common/Breadcrumb";
import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <div id="smooth-wrapper">
      <div id="smooth-content">
        <Breadcrumb title="Error" pageLink="Error" image="Rectangle 13 (1).svg" />
        <div className="error-section">
          <div className="divider"></div>
          <div className="container">
            <div className="row justify-content-center">
              <div className="col-12 col-sm-10 col-md-8 col-lg-6">
                <div className="error-content text-center">
                  <Image className="mb-5 w-auto h-auto" src="/assets/img/core-img/404.png" alt="" width={1920} height={1080} priority />
                  <Link href="/" className="btn btn-dark fadeInUp" data-delay="0.5">
                    <span>Back To Home <i className="ti ti-arrow-up-right"></i></span>
                    <span>Back To Home <i className="ti ti-arrow-up-right"></i></span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
          <div className="divider"></div>
        </div>
      </div>
    </div>
  )
}