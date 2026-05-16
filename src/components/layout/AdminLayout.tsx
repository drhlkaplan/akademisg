import { Outlet } from "react-router-dom";
import { DashboardLayout } from "./DashboardLayout";

export default function AdminLayout() {
  return (
    <DashboardLayout userRole="admin">
      <Outlet />
    </DashboardLayout>
  );
}
