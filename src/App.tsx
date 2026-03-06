import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";

const Login = lazy(() => import("./pages/auth/Login"));
const Register = lazy(() => import("./pages/auth/Register"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
const Courses = lazy(() => import("./pages/Courses"));
const StudentDashboard = lazy(() => import("./pages/dashboard/StudentDashboard"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const UsersManagement = lazy(() => import("./pages/admin/UsersManagement"));
const CoursesManagement = lazy(() => import("./pages/admin/CoursesManagement"));
const FirmsManagement = lazy(() => import("./pages/admin/FirmsManagement"));
const ExamsManagement = lazy(() => import("./pages/admin/ExamsManagement"));
const ExamReports = lazy(() => import("./pages/admin/ExamReports"));
const CertificatesManagement = lazy(() => import("./pages/admin/CertificatesManagement"));
const ExamTaking = lazy(() => import("./pages/exam/ExamTaking"));
const CourseLearning = lazy(() => import("./pages/course/CourseLearning"));
const CertificateVerify = lazy(() => import("./pages/CertificateVerify"));
const MyCertificates = lazy(() => import("./pages/dashboard/MyCertificates"));
const MyCourses = lazy(() => import("./pages/dashboard/MyCourses"));
const MyExams = lazy(() => import("./pages/dashboard/MyExams"));
const Help = lazy(() => import("./pages/dashboard/Help"));
const GroupsManagement = lazy(() => import("./pages/admin/GroupsManagement"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
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
            <Route
              path="/admin/certificates"
              element={
                <ProtectedRoute requireAdmin>
                  <CertificatesManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/groups"
              element={
                <ProtectedRoute requireAdmin>
                  <GroupsManagement />
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
            <Route
              path="/dashboard/courses"
              element={
                <ProtectedRoute>
                  <MyCourses />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/exams"
              element={
                <ProtectedRoute>
                  <MyExams />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/help"
              element={
                <ProtectedRoute>
                  <Help />
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
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
