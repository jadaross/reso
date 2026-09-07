/* PROTOTYPE — throwaway. Wayfinder ticket 06. Delete with the rest of the prototype. */

export const metadata = { title: "Reso — look and feel prototype" };

export default function PrototypeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,700&family=Inter+Tight:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&family=Fraunces:ital,opsz,wght@0,9..144,400;1,9..144,400&family=Karla:wght@400;500;600&display=swap"
      />
      {children}
    </>
  );
}
