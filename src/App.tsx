import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { FirmBrandingProvider } from "@/contexts/FirmBrandingContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";

// Retry wrapper for lazy imports to handle chunk loading failures
function lazyRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  retries = 2
): React.LazyExoticComponent<T> {
  return lazy(() =>
    factory().catch((err) => {
      if (retries > 0) {
        return new Promise<{ default: T }>((resolve) =>
          setTimeout(() => resolve(lazyRetry(factory, retries - 1) as any), 1000)
        );
      }
      // Last resort: reload the page to get fresh chunks
      window.location.reload();
      throw err;
    })
  );
}

const Login = lazyRetry(() => import("./pages/auth/Login"));
const Register = lazyRetry(() => import("./pages/auth/Register"));
const ForgotPassword = lazyRetry(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazyRetry(() => import("./pages/auth/ResetPassword"));
const Courses = lazyRetry(() => import("./pages/Courses"));
const StudentDashboard = lazyRetry(() => import("./pages/dashboard/StudentDashboard"));
const AdminDashboard = lazyRetry(() => import("./pages/admin/AdminDashboard"));
const UsersManagement = lazyRetry(() => import("./pages/admin/UsersManagement"));
const CoursesManagement = lazyRetry(() => import("./pages/admin/CoursesManagement"));
const FirmsManagement = lazyRetry(() => import("./pages/admin/FirmsManagement"));
const ExamsManagement = lazyRetry(() => import("./pages/admin/ExamsManagement"));
const ExamReports = lazyRetry(() => import("./pages/admin/ExamReports"));
const CertificatesManagement = lazyRetry(() => import("./pages/admin/CertificatesManagement"));
const CertificateTemplates = lazyRetry(() => import("./pages/admin/CertificateTemplates"));
const AnalyticsDashboard = lazyRetry(() => import("./pages/admin/AnalyticsDashboard"));
const ReportCenter = lazyRetry(() => import("./pages/admin/ReportCenter"));
const ExamTaking = lazyRetry(() => import("./pages/exam/ExamTaking"));
const CourseLearning = lazyRetry(() => import("./pages/course/CourseLearning"));
const CertificateVerify = lazyRetry(() => import("./pages/CertificateVerify"));
const MyCertificates = lazyRetry(() => import("./pages/dashboard/MyCertificates"));
const MyCourses = lazyRetry(() => import("./pages/dashboard/MyCourses"));
const MyExams = lazyRetry(() => import("./pages/dashboard/MyExams"));
const Help = lazyRetry(() => import("./pages/dashboard/Help"));
const GroupsManagement = lazyRetry(() => import("./pages/admin/GroupsManagement"));
const FirmDashboard = lazyRetry(() => import("./pages/firm/FirmDashboard"));
const FirmEmployees = lazyRetry(() => import("./pages/firm/FirmEmployees"));
const FirmCourses = lazyRetry(() => import("./pages/firm/FirmCourses"));
const FirmReports = lazyRetry(() => import("./pages/firm/FirmReports"));
const FirmCertificates = lazyRetry(() => import("./pages/firm/FirmCertificates"));
const NotFound = lazyRetry(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <FirmBrandingProvider>
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
            <Route
              path="/admin/certificate-templates"
              element={
                <ProtectedRoute requireAdmin>
                  <CertificateTemplates />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/analytics"
              element={
                <ProtectedRoute requireAdmin>
                  <AnalyticsDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/report-center"
              element={
                <ProtectedRoute requireAdmin>
                  <ReportCenter />
                </ProtectedRoute>
              }
            />
            
            {/* Firm Admin Dashboard */}
            <Route
              path="/firm"
              element={
                <ProtectedRoute requireFirmAdmin>
                  <FirmDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/firm/employees"
              element={
                <ProtectedRoute requireFirmAdmin>
                  <FirmEmployees />
                </ProtectedRoute>
              }
            />
            <Route
              path="/firm/courses"
              element={
                <ProtectedRoute requireFirmAdmin>
                  <FirmCourses />
                </ProtectedRoute>
              }
            />
            <Route
              path="/firm/reports"
              element={
                <ProtectedRoute requireFirmAdmin>
                  <FirmReports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/firm/certificates"
              element={
                <ProtectedRoute requireFirmAdmin>
                  <FirmCertificates />
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
      </FirmBrandingProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
