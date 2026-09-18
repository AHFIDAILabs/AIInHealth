import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { FloatingCTA } from './FloatingCTA';

export const PublicLayout = () => (
  <div className="flex min-h-screen flex-col">
    <Navbar />
    {/* Navbar measures its own real height (it changes with the utility-row
        breakpoint and the logo's responsive size, neither of which lines up
        cleanly with a single Tailwind cut) and writes it to --header-height,
        so this always clears the fixed header exactly, at every width. */}
    <main className="flex-1" style={{ paddingTop: 'var(--header-height, 4rem)' }}>
      <Outlet />
    </main>
    <Footer />
    <FloatingCTA />
  </div>
);
