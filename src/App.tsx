import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { FirmBrandingProvider } from "@/contexts/FirmBrandingContext";
import { SiteSettingsProvider } from "@/contexts/SiteSettingsContext";
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
const Topic4PackLessons = lazyRetry(() => import("./pages/admin/Topic4PackLessons"));
const Topic4ScormCheck = lazyRetry(() => import("./pages/admin/Topic4ScormCheck"));
const FaceToFaceSessionsManagement = lazyRetry(() => import("./pages/admin/FaceToFaceSessionsManagement"));
const SessionAttendance = lazyRetry(() => import("./pages/admin/SessionAttendance"));
const FaqManagement = lazyRetry(() => import("./pages/admin/FaqManagement"));
const MyFaceToFaceSessions = lazyRetry(() => import("./pages/dashboard/MyFaceToFaceSessions"));
const CourseTemplateRules = lazyRetry(() => import("./pages/admin/CourseTemplateRules"));
const CompanyTopic4Assignment = lazyRetry(() => import("./pages/admin/CompanyTopic4Assignment"));
const GroupTopic4Rules = lazyRetry(() => import("./pages/admin/GroupTopic4Rules"));
const ComplianceReport = lazyRetry(() => import("./pages/admin/ComplianceReport"));
const RecurrenceReport = lazyRetry(() => import("./pages/admin/RecurrenceReport"));
const F2FAttendanceReport = lazyRetry(() => import("./pages/admin/F2FAttendanceReport"));
const DocumentGeneration = lazyRetry(() => import("./pages/admin/DocumentGeneration"));
const MigrationDashboard = lazyRetry(() => import("./pages/admin/MigrationDashboard"));
const R2CorsTest = lazyRetry(() => import("./pages/admin/R2CorsTest"));
const JoinRequests = lazyRetry(() => import("./pages/admin/JoinRequests"));
const AdminBlog = lazyRetry(() => import("./pages/admin/AdminBlog"));
const AdminServices = lazyRetry(() => import("./pages/admin/AdminServices"));
const AdminCourseCovers = lazyRetry(() => import("./pages/admin/AdminCourseCovers"));
const RegulationInfo = lazyRetry(() => import("./pages/RegulationInfo"));
const FirmDashboard = lazyRetry(() => import("./pages/firm/FirmDashboard"));
const FirmEmployees = lazyRetry(() => import("./pages/firm/FirmEmployees"));
const FirmCourses = lazyRetry(() => import("./pages/firm/FirmCourses"));
const FirmReports = lazyRetry(() => import("./pages/firm/FirmReports"));
const FirmCertificates = lazyRetry(() => import("./pages/firm/FirmCertificates"));
const AttendSession = lazyRetry(() => import("./pages/attend/AttendSession"));
const NotFound = lazyRetry(() => import("./pages/NotFound"));
const KVKK = lazyRetry(() => import("./pages/legal/KVKK"));
const PrivacyPolicy = lazyRetry(() => import("./pages/legal/PrivacyPolicy"));
const TermsOfService = lazyRetry(() => import("./pages/legal/TermsOfService"));
const CookiePolicy = lazyRetry(() => import("./pages/legal/CookiePolicy"));
const AdminLayout = lazyRetry(() => import("./components/layout/AdminLayout"));
const StudentLayout = lazyRetry(() => import("./components/layout/StudentLayout"));
const CompanyLayout = lazyRetry(() => import("./components/layout/CompanyLayout"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <FirmBrandingProvider>
      <SiteSettingsProvider>
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
            <Route path="/attend" element={<ProtectedRoute><AttendSession /></ProtectedRoute>} />
            
            {/* Protected Student Dashboard - shared layout */}
            <Route
              element={
                <ProtectedRoute>
                  <StudentLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<StudentDashboard />} />
              <Route path="/dashboard/certificates" element={<MyCertificates />} />
              <Route path="/dashboard/courses" element={<MyCourses />} />
              <Route path="/dashboard/courses/:enrollmentId" element={<CourseHistory />} />
              <Route path="/dashboard/exams" element={<MyExams />} />
              <Route path="/dashboard/help" element={<Help />} />
              <Route path="/dashboard/face-to-face" element={<MyFaceToFaceSessions />} />
              <Route path="/dashboard/profile" element={<ProfileSettings />} />
            </Route>

            {/* Protected Admin Dashboard - shared layout */}
            <Route
              element={
                <ProtectedRoute requireAdmin>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<UsersManagement />} />
              <Route path="/admin/courses" element={<CoursesManagement />} />
              <Route path="/admin/companies" element={<FirmsManagement />} />
              <Route path="/admin/join-requests" element={<JoinRequests />} />
              <Route path="/admin/blog" element={<AdminBlog />} />
              <Route path="/admin/services" element={<AdminServices />} />
              <Route path="/admin/course-covers" element={<AdminCourseCovers />} />
              <Route path="/admin/exams" element={<ExamsManagement />} />
              <Route path="/admin/reports" element={<ExamReports />} />
              <Route path="/admin/certificates" element={<CertificatesManagement />} />
              <Route path="/admin/groups" element={<GroupsManagement />} />
              <Route path="/admin/certificate-templates" element={<CertificateTemplates />} />
              <Route path="/admin/analytics" element={<AnalyticsDashboard />} />
              <Route path="/admin/report-center" element={<ReportCenter />} />
              <Route path="/admin/logs" element={<ActivityLogs />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
              <Route path="/admin/sectors" element={<SectorsManagement />} />
              <Route path="/admin/training-types" element={<TrainingTypesManagement />} />
              <Route path="/admin/topic4-packs" element={<Topic4PacksManagement />} />
              <Route path="/admin/topic4-packs/:packId/lessons" element={<Topic4PackLessons />} />
              <Route path="/admin/topic4-scorm-check" element={<Topic4ScormCheck />} />
              <Route path="/admin/company-topic4" element={<CompanyTopic4Assignment />} />
              <Route path="/admin/group-topic4-rules" element={<GroupTopic4Rules />} />
              <Route path="/admin/face-to-face" element={<FaceToFaceSessionsManagement />} />
              <Route path="/admin/attendance/:sessionId" element={<SessionAttendance />} />
              <Route path="/admin/faq" element={<FaqManagement />} />
              <Route path="/admin/course-template-rules" element={<CourseTemplateRules />} />
              <Route path="/admin/live-sessions" element={<LiveSessionsManagement />} />
              <Route path="/admin/compliance-report" element={<ComplianceReport />} />
              <Route path="/admin/recurrence-report" element={<RecurrenceReport />} />
              <Route path="/admin/f2f-attendance-report" element={<F2FAttendanceReport />} />
              <Route path="/admin/documents" element={<DocumentGeneration />} />
              <Route path="/admin/migration" element={<MigrationDashboard />} />
              <Route path="/admin/r2-cors-test" element={<R2CorsTest />} />
            </Route>

            {/* Protected Firm Admin Dashboard - shared layout */}
            <Route
              element={
                <ProtectedRoute requireFirmAdmin>
                  <CompanyLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/firm" element={<FirmDashboard />} />
              <Route path="/firm/employees" element={<FirmEmployees />} />
              <Route path="/firm/courses" element={<FirmCourses />} />
              <Route path="/firm/reports" element={<FirmReports />} />
              <Route path="/firm/certificates" element={<FirmCertificates />} />
            </Route>

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
      </SiteSettingsProvider>
      </FirmBrandingProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
