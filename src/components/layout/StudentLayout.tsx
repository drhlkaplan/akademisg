import { Outlet } from "react-router-dom";
import { DashboardLayout } from "./DashboardLayout";

export default function StudentLayout() {
  return (
    <DashboardLayout userRole="student">
      <Outlet />
    </DashboardLayout>
  );
}
