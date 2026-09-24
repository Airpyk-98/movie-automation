import { Bricolage_Grotesque, Courier_Prime } from 'next/font/google';
import './globals.css';

const ui = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-ui' });
const script = Courier_Prime({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-script' });

export const metadata = {
  title: 'Movie Studio',
  description: 'Turn a script and a cast into animated scenes.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${ui.variable} ${script.variable}`}>
      <body>{children}</body>
    </html>
  );
}
