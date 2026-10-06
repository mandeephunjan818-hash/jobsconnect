
// app/not-found.tsx
export default function NotFound() {
  return (
    <div className="not-found-page">
      <h1>404 - Page Not Found</h1>
      <p>Sorry, the page you are looking for does not exist.</p>
      <a href="/" className="go-home-button">Go back home</a>
    </div>
  );
}
