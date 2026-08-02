export function SiteFooter() {
  const storeName = process.env.NEXT_PUBLIC_STORE_NAME || "DRIP CLIENT";
  const wa = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP;
  return (
    <footer className="border-t border-border/60 py-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-2 px-4 text-xs text-muted-foreground sm:flex-row">
        <p>© {new Date().getFullYear()} {storeName}. All rights reserved.</p>
        {wa && (
          <a
            href={`https://wa.me/${wa.replace(/\D/g, "")}`}
            target="_blank"
            className="hover:text-foreground"
          >
            Support: {wa}
          </a>
        )}
      </div>
    </footer>
  );
}
