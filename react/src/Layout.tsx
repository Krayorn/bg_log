import { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <main className='bg-[radial-gradient(ellipse_at_center,rgba(40,69,102,1),rgba(14,21,32,1))] h-full min-h-screen p-6 flex flex-col'>
      {children}
    </main>
  );
}
