import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { FirmBrandingProvider } from "@/contexts/FirmBrandingContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
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
const About = lazyRetry(() => import("./pages/About"));
const Services = lazyRetry(() => import("./pages/Services"));
const CourseDetail = lazyRetry(() => import("./pages/CourseDetail"));
const Pricing = lazyRetry(() => import("./pages/Pricing"));
const CorporateSolutions = lazyRetry(() => import("./pages/CorporateSolutions"));
const Contact = lazyRetry(() => import("./pages/Contact"));
const Blog = lazyRetry(() => import("./pages/Blog"));
const BlogPost = lazyRetry(() => import("./pages/BlogPost"));
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
const CourseHistory = lazyRetry(() => import("./pages/dashboard/CourseHistory"));
const MyExams = lazyRetry(() => import("./pages/dashboard/MyExams"));
const Help = lazyRetry(() => import("./pages/dashboard/Help"));
const ProfileSettings = lazyRetry(() => import("./pages/dashboard/ProfileSettings"));
const GroupsManagement = lazyRetry(() => import("./pages/admin/GroupsManagement"));
const ActivityLogs = lazyRetry(() => import("./pages/admin/ActivityLogs"));
const AdminSettings = lazyRetry(() => import("./pages/admin/AdminSettings"));
const LiveSessionsManagement = lazyRetry(() => import("./pages/admin/LiveSessionsManagement"));
const SectorsManagement = lazyRetry(() => import("./pages/admin/SectorsManagement"));
const TrainingTypesManagement = lazyRetry(() => import("./pages/admin/TrainingTypesManagement"));
const Topic4PacksManagement = lazyRetry(() => import("./pages/admin/Topic4PacksManagement"));
const FaceToFaceSessionsManagement = lazyRetry(() => import("./pages/admin/FaceToFaceSessionsManagement"));
const SessionAttendance = lazyRetry(() => import("./pages/admin/SessionAttendance"));
const FaqManagement = lazyRetry(() => import("./pages/admin/FaqManagement"));
const MyFaceToFaceSessions = lazyRetry(() => import("./pages/dashboard/MyFaceToFaceSessions"));
const CourseTemplateRules = lazyRetry(() => import("./pages/admin/CourseTemplateRules"));
const CompanyTopic4Assignment = lazyRetry(() => import("./pages/admin/CompanyTopic4Assignment"));
const ComplianceReport = lazyRetry(() => import("./pages/admin/ComplianceReport"));
const RecurrenceReport = lazyRetry(() => import("./pages/admin/RecurrenceReport"));
const F2FAttendanceReport = lazyRetry(() => import("./pages/admin/F2FAttendanceReport"));
const DocumentGeneration = lazyRetry(() => import("./pages/admin/DocumentGeneration"));
const RegulationInfo = lazyRetry(() => import("./pages/RegulationInfo"));
const FirmDashboard = lazyRetry(() => import("./pages/firm/FirmDashboard"));
const FirmEmployees = lazyRetry(() => import("./pages/firm/FirmEmployees"));
const FirmCourses = lazyRetry(() => import("./pages/firm/FirmCourses"));
const FirmReports = lazyRetry(() => import("./pages/firm/FirmReports"));
const FirmCertificates = lazyRetry(() => import("./pages/firm/FirmCertificates"));
const NotFound = lazyRetry(() => import("./pages/NotFound"));
const KVKK = lazyRetry(() => import("./pages/legal/KVKK"));
const PrivacyPolicy = lazyRetry(() => import("./pages/legal/PrivacyPolicy"));
const TermsOfService = lazyRetry(() => import("./pages/legal/TermsOfService"));
const CookiePolicy = lazyRetry(() => import("./pages/legal/CookiePolicy"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <FirmBrandingProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <CookieConsentBanner />
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/course/:courseId" element={<CourseDetail />} />
            <Route path="/about" element={<About />} />
            <Route path="/services" element={<Services />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/corporate" element={<CorporateSolutions />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/verify" element={<CertificateVerify />} />
            <Route path="/kvkk" element={<KVKK />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/cookies" element={<CookiePolicy />} />
            <Route path="/regulation" element={<RegulationInfo />} />
            
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
            <Route
              path="/admin/logs"
              element={
                <ProtectedRoute requireAdmin>
                  <ActivityLogs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/sectors"
              element={
                <ProtectedRoute requireAdmin>
                  <SectorsManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/training-types"
              element={
                <ProtectedRoute requireAdmin>
                  <TrainingTypesManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/topic4-packs"
              element={
                <ProtectedRoute requireAdmin>
                  <Topic4PacksManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/company-topic4"
              element={
                <ProtectedRoute requireAdmin>
                  <CompanyTopic4Assignment />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/face-to-face"
              element={
                <ProtectedRoute requireAdmin>
                  <FaceToFaceSessionsManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/attendance/:sessionId"
              element={
                <ProtectedRoute requireAdmin>
                  <SessionAttendance />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/faq"
              element={
                <ProtectedRoute requireAdmin>
                  <FaqManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/course-template-rules"
              element={
                <ProtectedRoute requireAdmin>
                  <CourseTemplateRules />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/live-sessions"
              element={
                <ProtectedRoute requireAdmin>
                  <LiveSessionsManagement />
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
              path="/dashboard/courses/:enrollmentId"
              element={
                <ProtectedRoute>
                  <CourseHistory />
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
            <Route
              path="/dashboard/face-to-face"
              element={
                <ProtectedRoute>
                  <MyFaceToFaceSessions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/profile"
              element={
                <ProtectedRoute>
                  <ProfileSettings />
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
