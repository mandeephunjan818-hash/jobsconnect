import Image from "next/image";

// images import   
import portfolio_p9_img from "@/assets/images/portfolio/p9.png";
import portfolio_p10_img from "@/assets/images/portfolio/p10.png";
import portfolio_p11_img from "@/assets/images/portfolio/p11.png";



const SinglePortfolioArea = () => {
  return (
    <>
      <div className="luminix-padding-section">
        <div className="container">
          <div className="row">
            <div className="col-lg-8">
              <div className="mr-30">
                <div className="luminix-p-d-thumb" data-aos="fade-up" data-aos-duration="700">
                  <Image width={826} height={500} src={portfolio_p9_img} alt="here is theme image" />
                </div>
                <div className="luminix-p-d-content">
                  <h3>Project overview:</h3>
                  <p>A market analysis presents a comprehensive picture of your target markets, including market size, trends, limiters, competitors, and growth opportunities. Knowing the current and future trajectory allows companies to adapt or divert their strategies and offerings to the most profitable and viable markets.</p>
                </div>
                <div className="luminix-p-d-content">
                  <h3>Project overview:</h3>
                  <p>By regularly analyzing their markets, businesses gain actionable data that they can use to inform their strategies and make strategic business decisions.</p>
                  <ul>
                    <li>While many elements can impact sales performance, one key factor is the quantity and quality of your leads.</li>
                    <li>With targeted insights, your organization can evaluate your current markets and spot levers to revitalize your growth through new products to launch.</li>
                    <li>Analysis of new & adjacent markets helps determine whether sufficient opportunity exists today and in the future to make expansion a smart investment.</li>
                  </ul>
                  <div className="row">
                    <div className="col-lg-6">
                      <div className="luminix-p-d-thumb3">
                        <Image width={401} height={277} src={portfolio_p10_img} alt="here is theme image" />
                      </div>
                    </div>
                    <div className="col-lg-6">
                      <div className="luminix-p-d-thumb3">
                        <Image width={401} height={277} src={portfolio_p11_img} alt="here is theme image" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="luminix-p-d-content pb-0">
                  <h3>What we did for this project:</h3>
                  <p>Market analysis insights are an investment in your business’s growth and overall success. 95% of companies that use targeted data to inform their growth strategies saw increased revenue, and 86% reported a 4x ROI.</p>
                  <p>A complete analysis should include a comprehensive strategy for monitoring target markets to remain informed and quickly adapt to new opportunities and challenges.</p>
                </div>
              </div>
            </div>
            <div className="col-lg-4">
              <div className="luminix-p-d-sidebar">
                <h5 className="sidebar-title2">Project information</h5>
                <ul>
                  <li><span>Client:</span> Porter Victoria</li>
                  <li><span>Category:</span> Digital Marketing</li>
                  <li><span>Date:</span> 20 January, 2024</li>
                  <li><a href="mailto:name@gmail.com" className="link"><span>Website Link:</span> example@gmail.com</a></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SinglePortfolioArea;