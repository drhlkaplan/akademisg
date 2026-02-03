import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge-custom";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Building2,
  BookOpen,
  Award,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Plus,
  MoreHorizontal,
  Download,
} from "lucide-react";
import { Link } from "react-router-dom";

const stats = [
  {
    title: "Toplam Kullanıcı",
    value: "2,458",
    change: "+12%",
    trend: "up",
    icon: Users,
    color: "text-info",
    bgColor: "bg-info/10",
  },
  {
    title: "Aktif Firmalar",
    value: "156",
    change: "+5%",
    trend: "up",
    icon: Building2,
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    title: "Aktif Eğitimler",
    value: "48",
    change: "+2",
    trend: "up",
    icon: BookOpen,
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  {
    title: "Verilen Sertifikalar",
    value: "8,234",
    change: "+18%",
    trend: "up",
    icon: Award,
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
];

const recentEnrollments = [
  {
    id: 1,
    user: "Mehmet Yılmaz",
    email: "mehmet@abc.com",
    company: "ABC İnşaat",
    course: "İnşaat Sektörü İSG Eğitimi",
    date: "15 Oca 2024",
    status: "active",
  },
  {
    id: 2,
    user: "Ayşe Demir",
    email: "ayse@xyz.com",
    company: "XYZ Lojistik",
    course: "Forklift Operatör Eğitimi",
    date: "14 Oca 2024",
    status: "active",
  },
  {
    id: 3,
    user: "Ali Kara",
    email: "ali@def.com",
    company: "DEF Kimya",
    course: "Kimyasal Madde Güvenliği",
    date: "14 Oca 2024",
    status: "pending",
  },
  {
    id: 4,
    user: "Fatma Öztürk",
    email: "fatma@ghi.com",
    company: "GHI Gıda",
    course: "Temel İSG Eğitimi",
    date: "13 Oca 2024",
    status: "completed",
  },
  {
    id: 5,
    user: "Hasan Yıldız",
    email: "hasan@jkl.com",
    company: "JKL Madencilik",
    course: "Maden Güvenliği Eğitimi",
    date: "13 Oca 2024",
    status: "active",
  },
];

const topCompanies = [
  { name: "ABC İnşaat", users: 124, certificates: 98 },
  { name: "XYZ Lojistik", users: 89, certificates: 76 },
  { name: "DEF Kimya", users: 67, certificates: 54 },
  { name: "GHI Gıda", users: 45, certificates: 38 },
];

export default function AdminDashboard() {
  return (
    <DashboardLayout userRole="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Yönetim Paneli
            </h1>
            <p className="text-muted-foreground">
              Platform istatistikleri ve son aktiviteler
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Rapor İndir
            </Button>
            <Button variant="accent">
              <Plus className="mr-2 h-4 w-4" />
              Yeni Eğitim
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {stat.value}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      {stat.trend === "up" ? (
                        <TrendingUp className="h-4 w-4 text-success" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-destructive" />
                      )}
                      <span
                        className={`text-sm ${
                          stat.trend === "up"
                            ? "text-success"
                            : "text-destructive"
                        }`}
                      >
                        {stat.change}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        bu ay
                      </span>
                    </div>
                  </div>
                  <div
                    className={`h-10 w-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}
                  >
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Enrollments */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-semibold">
                  Son Kayıtlar
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/admin/users">Tümünü Gör</Link>
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kullanıcı</TableHead>
                      <TableHead className="hidden md:table-cell">
                        Firma
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">
                        Eğitim
                      </TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead className="text-right"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentEnrollments.map((enrollment) => (
                      <TableRow key={enrollment.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">
                              {enrollment.user}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {enrollment.email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {enrollment.company}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell max-w-[200px] truncate">
                          {enrollment.course}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              enrollment.status === "completed"
                                ? "success"
                                : enrollment.status === "active"
                                ? "active"
                                : "pending"
                            }
                          >
                            {enrollment.status === "completed"
                              ? "Tamamlandı"
                              : enrollment.status === "active"
                              ? "Devam Ediyor"
                              : "Beklemede"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Top Companies */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold">
                  En Aktif Firmalar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {topCompanies.map((company, index) => (
                  <div
                    key={company.name}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center text-sm font-bold text-accent">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">
                          {company.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {company.users} kullanıcı
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">
                        {company.certificates}
                      </p>
                      <p className="text-xs text-muted-foreground">sertifika</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-primary text-primary-foreground">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-2">Hızlı İşlemler</h3>
                <div className="space-y-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full justify-start"
                    asChild
                  >
                    <Link to="/admin/users/add">
                      <Users className="mr-2 h-4 w-4" />
                      Toplu Kullanıcı Ekle
                    </Link>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full justify-start"
                    asChild
                  >
                    <Link to="/admin/courses/add">
                      <BookOpen className="mr-2 h-4 w-4" />
                      SCORM Paketi Yükle
                    </Link>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full justify-start"
                    asChild
                  >
                    <Link to="/admin/reports">
                      <Download className="mr-2 h-4 w-4" />
                      Rapor Oluştur
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
