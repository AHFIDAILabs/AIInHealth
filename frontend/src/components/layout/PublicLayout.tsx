import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { FloatingCTA } from './FloatingCTA';
import { AskWidget } from './AskWidget';
import { LanguageProvider } from '../../contexts/LanguageContext';

export const PublicLayout = () => (
  <LanguageProvider>
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
    {/* Opposite corner (bottom-left) from FloatingCTA (bottom-right) so the
        two floating launchers never overlap. */}
    <AskWidget />
  </div>
  </LanguageProvider>
);
