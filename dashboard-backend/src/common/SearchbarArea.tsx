interface SearchbarAreaProps {
  setSearchOpen?: Function;
  searchOpen?: boolean;
}

export default function SearchbarArea({ setSearchOpen, searchOpen }: SearchbarAreaProps) {
  return (
    <>
     <div className={`search-bg-overlay ${searchOpen ? 'open' : ''}`} id="searchOverlay"></div>
     <div className={`search-form-popup ${searchOpen ? 'open' : ''}`}>
      <h2 className="mb-5 display-6 fw-bold text-white">How may I assist you?</h2>
      <button type="button" className="close-btn" id="searchClose" aria-label="Close" onClick={() => setSearchOpen && setSearchOpen(false)}>
         <i className="ti ti-x"></i>
      </button>
      {/* <!-- Search Form --> */}
      <form className="search-form">
         <input type="search" className="form-control" placeholder="Search..." />
         <button type="submit" className="btn btn-success d-none"><i className="ti ti-search"></i></button>
      </form>
   </div>
    </>
  )
}