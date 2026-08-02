export type Category = {
  id: string;
  slug: string;
  name: string;
  created_at: string;
};

export type Product = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  price: number;
  image_url: string | null;
  demo_url: string | null;
  category_id: string | null;
  is_active: boolean;
  rating: number | null;
  review_count: number | null;
  created_at: string;
  updated_at: string;
  category?: Category | null;
};

export type OrderStatus = "pending" | "paid" | "delivered" | "cancelled";

export type Order = {
  id: string;
  user_id: string | null;
  product_id: string | null;
  product_title: string;
  amount: number;
  payment_method: "jazzcash" | "easypaisa";
  txn_id: string | null;
  buyer_name: string | null;
  buyer_contact: string | null;
  buyer_email: string | null;
  status: OrderStatus;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  is_admin: boolean;
  created_at: string;
};
