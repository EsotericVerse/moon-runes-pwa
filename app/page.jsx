import LocApp from './loc/LocApp';

export const metadata = {
  title: 'LOC 月典',
  description: 'LOC unified Next.js application shell with modular, on-demand feature loading.'
};

export default function HomePage() {
  return <LocApp />;
}
