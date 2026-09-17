import { Link } from 'react-router-dom';
import { AhfidBadge } from '../ui/AhfidBadge';
import summitMark from '../../assets/images/summit_logo_mark.png';

export const Footer = () => (
  <footer className="w-full justify-between border-t border-slate-800 bg-navy">
    <div className="flex w-full flex-col gap-10 px-4 py-5 sm:flex-row sm:justify-between sm:px-6">
      <div className="flex flex-col items-start gap-2.5">
        <img src={summitMark} alt="" aria-hidden="true" className="h-9 w-9 rounded-md" />
        <p className="font-display text-lg font-semibold text-white">AI in Health Summit 2026</p>
        <p className="max-w-sm text-sm leading-relaxed text-slate-400">
          Catalyzing a coordinated national and regional ecosystem for the responsible adoption, governance,
          financing, and implementation of AI for stronger health systems.
        </p>
      </div>

      <div className="grid gap-10 sm:grid-cols-3">
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">About</p>
          <ul className="space-y-2.5 text-sm text-slate-300">
            <li><a href="https://ahfid.org/" target="_blank" rel="noopener noreferrer" className="hover:text-orange">About AHFID</a></li>
            <li><Link to="/about" className="hover:text-orange">About the Summit</Link></li>
            <li><Link to="/contact" className="hover:text-orange">Contact</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Summit</p>
          <ul className="space-y-2.5 text-sm text-slate-300">
            <li><Link to="/agenda" className="hover:text-orange">Agenda</Link></li>
            <li><Link to="/speakers" className="hover:text-orange">Speakers</Link></li>
            <li><Link to="/partners" className="hover:text-orange">Partners</Link></li>
            <li><Link to="/innovation-showcase" className="hover:text-orange">Innovation Showcase</Link></li>
            <li><Link to="/gallery" className="hover:text-orange">Gallery</Link></li>
            <li><Link to="/abstracts/submit" className="hover:text-orange">Submit an Abstract</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Legal &amp; Support</p>
          <ul className="space-y-2.5 text-sm text-slate-300">
            <li><Link to="/privacy" className="hover:text-orange">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-orange">Terms of Service</Link></li>
            <li>
              <a href="mailto:info@aihealthsummit2026.ng" className="hover:text-orange">info@aihealthsummit2026.ng</a>
            </li>
          </ul>
        </div>
      </div>
    </div>
     <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-slate-800 pt-8 sm:flex-row sm:items-center">
        <AhfidBadge />
        <p className="text-xs text-slate-500">
          Abuja, Nigeria &middot; 19&ndash;20 October 2026 &middot; &copy; 2026 AI in Health Summit. All rights reserved.
        </p>
      </div>
  </footer>
);
