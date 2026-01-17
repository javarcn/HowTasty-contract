import '@rainbow-me/rainbowkit/styles.css';
import './globals.css';
import { Providers } from '../components/Providers';

export const metadata = {
  title: '好吃么 - 去中心化美食点评',
  description: '在 Monad 链上记录真实的食物点评',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
