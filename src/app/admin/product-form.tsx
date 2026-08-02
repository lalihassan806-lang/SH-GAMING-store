"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { upsertProductAction } from "@/app/actions/admin";
import type { Category } from "@/lib/supabase/types";

export function ProductForm({ categories }: { categories: Category[] }) {
  const [pending, start] = useTransition();

  return (
    <form
      action={(fd) =>
        start(async () => {
          const res = await upsertProductAction(fd);
          if (res && "error" in res && res.error) toast.error(res.error);
          else {
            toast.success("Saved");
            (document.getElementById("prod-form") as HTMLFormElement)?.reset();
          }
        })
      }
      id="prod-form"
      className="space-y-3 rounded-2xl border border-border bg-card/60 p-4"
    >
      <div className="space-y-1">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={3} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="price">Price (PKR)</Label>
          <Input id="price" name="price" type="number" min={0} step="1" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="category_id">Category</Label>
          <select
            id="category_id"
            name="category_id"
            className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
          >
            <option value="">— none —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="image_url">Image URL</Label>
        <Input id="image_url" name="image_url" type="url" placeholder="https://…" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="demo_url">Demo URL</Label>
        <Input id="demo_url" name="demo_url" type="url" placeholder="https://youtu.be/…" />
      </div>
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input type="checkbox" name="is_active" defaultChecked className="accent-primary" />
        Active (visible in store)
      </label>
      <Button type="submit" variant="gradient" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Save product"}
      </Button>
    </form>
  );
}
