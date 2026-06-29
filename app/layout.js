export const metadata = {
  title: 'Weekly Report Bot',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body style={{ fontFamily: 'sans-serif', padding: 40 }}>
        {children}
      </body>
    </html>
  );
}
