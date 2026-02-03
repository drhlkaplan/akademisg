import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge-custom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  Award,
  Clock,
  TrendingUp,
  ArrowRight,
  Play,
  CheckCircle,
} from "lucide-react";
import { Link } from "react-router-dom";

const stats = [
  {
    title: "Aktif Eğitimler",
    value: "3",
    icon: BookOpen,
    color: "text-info",
    bgColor: "bg-info/10",
  },
  {
    title: "Tamamlanan",
    value: "5",
    icon: CheckCircle,
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    title: "Sertifikalar",
    value: "5",
    icon: Award,
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  {
    title: "Toplam Süre",
    value: "42 saat",
    icon: Clock,
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
];

const activeCourses = [
  {
    id: 1,
    title: "Temel İş Sağlığı ve Güvenliği Eğitimi",
    category: "Az Tehlikeli",
    badge: "dangerLow" as const,
    progress: 75,
    duration: "8 Saat",
    remaining: "2 Saat",
  },
  {
    id: 2,
    title: "Makine Güvenliği ve Risk Değerlendirmesi",
    category: "Tehlikeli",
    badge: "dangerMedium" as const,
    progress: 40,
    duration: "12 Saat",
    remaining: "7.2 Saat",
  },
  {
    id: 3,
    title: "Kimyasal Madde Güvenliği",
    category: "Çok Tehlikeli",
    badge: "dangerHigh" as const,
    progress: 15,
    duration: "16 Saat",
    remaining: "13.6 Saat",
  },
];

const recentCertificates = [
  {
    id: 1,
    title: "Ofis Ergonomisi ve İSG",
    date: "15 Ocak 2024",
    code: "ISG-2024-00125",
  },
  {
    id: 2,
    title: "Yangın Güvenliği Eğitimi",
    date: "10 Ocak 2024",
    code: "ISG-2024-00098",
  },
];

export default function StudentDashboard() {
  return (
    <DashboardLayout userRole="student">
      <div className="space-y-6">
        {/* Welcome */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Hoş Geldiniz, Ahmet! 👋
            </h1>
            <p className="text-muted-foreground">
              Eğitimlerinize kaldığınız yerden devam edin.
            </p>
          </div>
          <Button variant="accent" asChild>
            <Link to="/courses">
              Yeni Eğitim Keşfet
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`h-12 w-12 rounded-lg ${stat.bgColor} flex items-center justify-center`}
                  >
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {stat.value}
                    </p>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Active Courses */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Devam Eden Eğitimler
              </h2>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/dashboard/courses">Tümünü Gör</Link>
              </Button>
            </div>

            <div className="space-y-4">
              {activeCourses.map((course) => (
                <Card key={course.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={course.badge}>{course.category}</Badge>
                        </div>
                        <h3 className="font-semibold text-foreground mb-1">
                          {course.title}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {course.duration}
                          </span>
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-4 w-4" />
                            %{course.progress} tamamlandı
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="w-32">
                          <Progress value={course.progress} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1">
                            Kalan: {course.remaining}
                          </p>
                        </div>
                        <Button variant="accent" size="sm">
                          <Play className="h-4 w-4 mr-1" />
                          Devam Et
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Recent Certificates */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Son Sertifikalar
              </h2>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/dashboard/certificates">Tümü</Link>
              </Button>
            </div>

            <div className="space-y-3">
              {recentCertificates.map((cert) => (
                <Card key={cert.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                        <Award className="h-5 w-5 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground text-sm truncate">
                          {cert.title}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {cert.date}
                        </p>
                        <p className="text-xs text-accent font-mono mt-1">
                          {cert.code}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm">
                        İndir
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Quick Actions */}
            <Card className="bg-gradient-accent">
              <CardContent className="p-4">
                <h3 className="font-semibold text-accent-foreground mb-2">
                  Sertifika Doğrula
                </h3>
                <p className="text-sm text-accent-foreground/80 mb-4">
                  Sertifika numarası ile doğrulama yapın.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  asChild
                >
                  <Link to="/verify">Doğrula</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
