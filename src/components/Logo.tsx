import Link from "next/link";

export default function Logo({
  href = "/",
  compact = false,
}: {
  href?: string;
  compact?: boolean;
}) {
  const name = process.env.NEXT_PUBLIC_STORE_NAME || "SH GAMING STORE";
  const [first, ...rest] = name.split(" ");

  return (
    <Link href={href} className="group flex items-center gap-2.5">
      <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gold-grad shadow-gold">
        <span className="text-[15px] font-extrabold text-black">SH</span>
      </span>
      {!compact && (
        <span className="text-[15px] font-extrabold tracking-tight text-white">
          {first}{" "}
          <span className="bg-gold-grad bg-clip-text text-transparent">
            {rest.join(" ")}
          </span>
        </span>
      )}
    </Link>
  );
}
