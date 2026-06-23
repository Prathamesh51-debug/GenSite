import { Link } from 'react-router-dom';
import { assets } from '../assets/assets';
import { TwitterIcon, GithubIcon, LinkedinIcon, SparklesIcon } from 'lucide-react';

const footerLinks = [
  {
    title: 'Product',
    links: [
      { label: 'Home', to: '/' },
      { label: 'Community', to: '/community' },
      { label: 'Pricing', to: '/pricing' },
      { label: 'My Projects', to: '/projects' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', to: '#' },
      { label: 'Guides', to: '#' },
      { label: 'Changelog', to: '#' },
      { label: 'Support', to: '#' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', to: '#' },
      { label: 'Blog', to: '#' },
      { label: 'Careers', to: '#' },
      { label: 'Contact', to: '#' },
    ],
  },
];

const socials = [
  { Icon: TwitterIcon, label: 'Twitter', href: '#' },
  { Icon: GithubIcon, label: 'GitHub', href: '#' },
  { Icon: LinkedinIcon, label: 'LinkedIn', href: '#' },
];

const Footer = () => {
  return (
    <footer className="relative mt-32 text-gray-400">
      <div className="divider-gradient w-full" />
      <div className="max-w-6xl mx-auto px-6 pt-16 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
          {}
          <div className="col-span-2">
            <Link to="/" className="inline-flex items-center gap-2">
              <img src={assets.logo} alt="logo" className="h-7" />
            </Link>
            <p className="text-sm text-gray-400 mt-4 max-w-xs leading-relaxed">
              Turn a single prompt into a beautiful, responsive website. Design, build and publish — powered by AI.
            </p>
            <div className="flex items-center gap-3 mt-6">
              {socials.map(({ Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="flex items-center justify-center size-9 rounded-lg glass hover:bg-white/10 hover:text-white hover:-translate-y-0.5 smooth-transition"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          {}
          {footerLinks.map((col) => (
            <div key={col.title}>
              <h4 className="text-white font-medium text-sm mb-4">{col.title}</h4>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.to} className="text-sm hover:text-indigo-400 smooth-transition">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-14 pt-8 border-t border-white/10">
          <p className="text-xs text-gray-500">© {new Date().getFullYear()} SiteBuilder — crafted by Prathamesh. All rights reserved.</p>
          <div className="flex items-center gap-6 text-xs text-gray-500">
            <a href="#" className="hover:text-gray-300 smooth-transition">Privacy</a>
            <a href="#" className="hover:text-gray-300 smooth-transition">Terms</a>
            <span className="flex items-center gap-1.5"><SparklesIcon className="size-3 text-indigo-400" /> Powered by AI</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
