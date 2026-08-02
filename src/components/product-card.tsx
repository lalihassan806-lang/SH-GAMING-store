import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatPKR } from "@/lib/utils";
import type { Product } from "@/lib/supabase/types";

export function ProductCard({ product }: { product: Product }) {
  const img = product.image_url || "/placeholder.png";
  return (
    <Link href={`/product/${product.slug}`} className="block">
      <Card className="group h-full">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
          <Image
            src={img}
            alt={product.title}
            fill
            sizes="(max-width: 640px) 100vw, 33vw"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        </div>
        <CardContent className="space-y-2 p-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-1 text-sm font-semibold">
              {product.title}
            </h3>
            {product.category && (
              <Badge variant="outline">{product.category.name}</Badge>
            )}
          </div>
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {product.description}
          </p>
          <div className="flex items-center justify-between pt-1">
            <span className="text-sm font-bold drip-gradient-text">
              {formatPKR(product.price)}
            </span>
            <div className="flex items-center gap-0.5 text-xs text-amber-400">
              <Star className="h-3 w-3 fill-amber-400" />
              {Number(product.rating || 5).toFixed(1)}
              <span className="text-muted-foreground">
                ({product.review_count || 0})
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
