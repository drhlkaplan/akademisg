import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import Courses from "./pages/Courses";
import StudentDashboard from "./pages/dashboard/StudentDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UsersManagement from "./pages/admin/UsersManagement";
import CoursesManagement from "./pages/admin/CoursesManagement";
import FirmsManagement from "./pages/admin/FirmsManagement";
import ExamsManagement from "./pages/admin/ExamsManagement";
import ExamReports from "./pages/admin/ExamReports";
import ExamTaking from "./pages/exam/ExamTaking";
import CourseLearning from "./pages/course/CourseLearning";
import CertificateVerify from "./pages/CertificateVerify";
import MyCertificates from "./pages/dashboard/MyCertificates";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/verify" element={<CertificateVerify />} />
            
            {/* Protected Student Dashboard */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
            
            {/* Protected Admin Dashboard */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute requireAdmin>
                  <UsersManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/courses"
              element={
                <ProtectedRoute requireAdmin>
                  <CoursesManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/companies"
              element={
                <ProtectedRoute requireAdmin>
                  <FirmsManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/exams"
              element={
                <ProtectedRoute requireAdmin>
                  <ExamsManagement />
                </ProtectedRoute>
              }
            />
            
            {/* Exam Reports */}
            <Route
              path="/admin/reports"
              element={
                <ProtectedRoute requireAdmin>
                  <ExamReports />
                </ProtectedRoute>
              }
            />
            
            {/* Student Certificates */}
            <Route
              path="/dashboard/certificates"
              element={
                <ProtectedRoute>
                  <MyCertificates />
                </ProtectedRoute>
              }
            />

            {/* Protected Course Learning */}
            <Route
              path="/learn/:courseId"
              element={
                <ProtectedRoute>
                  <CourseLearning />
                </ProtectedRoute>
              }
            />

            {/* Protected Exam Taking */}
            <Route
              path="/exam/:examId/:enrollmentId"
              element={
                <ProtectedRoute>
                  <ExamTaking />
                </ProtectedRoute>
              }
            />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
