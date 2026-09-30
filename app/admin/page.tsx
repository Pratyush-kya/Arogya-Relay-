"use client";

import { AdminScreen } from "../admin-screen";

export default function AdminPage() {
  return (
    <AdminScreen
      onBackToDashboard={() => {
        window.location.href = "/";
      }}
      onOpenSupabaseConfig={() => {
        window.location.href = "/#supabase";
      }}
    />
  );
}
