import { Outlet } from "react-router-dom";
import { DashboardLayout } from "./DashboardLayout";

export default function CompanyLayout() {
  return (
    <DashboardLayout userRole="company">
      <Outlet />
    </DashboardLayout>
  );
}
