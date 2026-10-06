 
 
import ScrollToTop from "@/common/scroll-to-top";
import { ToastContainer } from "react-toastify";



const Wrapper = ({ children }: { children: React.ReactNode }) => {
 

	return (
		<>
			{children}
			<ScrollToTop />
			<ToastContainer position="top-right"/>
		</>
	);
};

export default Wrapper;
