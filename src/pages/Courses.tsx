import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge-custom";
import { MainLayout } from "@/components/layout/MainLayout";
import {
  Search,
  Filter,
  Clock,
  Users,
  Star,
  ArrowRight,
  BookOpen,
  Award,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const courses = [
  {
    id: 1,
    title: "Temel İş Sağlığı ve Güvenliği Eğitimi",
    category: "Az Tehlikeli",
    badge: "dangerLow" as const,
    duration: "8 Saat",
    students: 2450,
    rating: 4.8,
    image: "/placeholder.svg",
    description:
      "İSG mevzuatı, risk değerlendirmesi ve temel güvenlik prensipleri.",
  },
  {
    id: 2,
    title: "İnşaat Sektörü İSG Eğitimi",
    category: "Çok Tehlikeli",
    badge: "dangerHigh" as const,
    duration: "16 Saat",
    students: 1820,
    rating: 4.9,
    image: "/placeholder.svg",
    description:
      "Yüksekte çalışma, kazı güvenliği, iskele kullanımı ve kişisel koruyucu donanım.",
  },
  {
    id: 3,
    title: "Makine Güvenliği ve Risk Değerlendirmesi",
    category: "Tehlikeli",
    badge: "dangerMedium" as const,
    duration: "12 Saat",
    students: 1350,
    rating: 4.7,
    image: "/placeholder.svg",
    description:
      "Makine koruyucuları, kilitleme/etiketleme prosedürleri ve bakım güvenliği.",
  },
  {
    id: 4,
    title: "Kimyasal Madde Güvenliği",
    category: "Çok Tehlikeli",
    badge: "dangerHigh" as const,
    duration: "16 Saat",
    students: 980,
    rating: 4.8,
    image: "/placeholder.svg",
    description:
      "MSDS okuma, kimyasal depolama, dökülme müdahalesi ve kişisel korunma.",
  },
  {
    id: 5,
    title: "Ofis Ergonomisi ve İSG",
    category: "Az Tehlikeli",
    badge: "dangerLow" as const,
    duration: "4 Saat",
    students: 3200,
    rating: 4.6,
    image: "/placeholder.svg",
    description:
      "Ergonomik çalışma ortamı, ekran başı çalışma ve stres yönetimi.",
  },
  {
    id: 6,
    title: "Forklift Operatör Eğitimi",
    category: "Tehlikeli",
    badge: "dangerMedium" as const,
    duration: "12 Saat",
    students: 1560,
    rating: 4.9,
    image: "/placeholder.svg",
    description:
      "Forklift kullanım kuralları, yük taşıma güvenliği ve bakım prosedürleri.",
  },
];

export default function Courses() {
  return (
    <MainLayout>
      {/* Header */}
      <section className="bg-primary py-16">
        <div className="container">
          <div className="max-w-2xl">
            <Badge variant="active" className="mb-4">
              <BookOpen className="h-3 w-3 mr-1" />
              Online Eğitimler
            </Badge>
            <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              İSG Eğitim Kataloğu
            </h1>
            <p className="text-primary-foreground/70">
              Tehlike sınıfınıza uygun, SCORM tabanlı online eğitimlerle yasal
              zorunluluklarınızı karşılayın.
            </p>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="py-6 bg-secondary/50 border-b border-border">
        <div className="container">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Eğitim ara..."
                className="pl-10 bg-card"
              />
            </div>
            <div className="flex gap-3">
              <Select>
                <SelectTrigger className="w-[180px] bg-card">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Tehlike Sınıfı" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="low">Az Tehlikeli</SelectItem>
                  <SelectItem value="medium">Tehlikeli</SelectItem>
                  <SelectItem value="high">Çok Tehlikeli</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-[150px] bg-card">
                  <SelectValue placeholder="Sıralama" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popular">En Popüler</SelectItem>
                  <SelectItem value="newest">En Yeni</SelectItem>
                  <SelectItem value="rating">En Yüksek Puan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </section>

      {/* Course Grid */}
      <section className="py-12">
        <div className="container">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div
                key={course.id}
                className="group bg-card rounded-xl border border-border overflow-hidden hover:shadow-xl transition-all duration-300 hover:border-accent/50"
              >
                {/* Image */}
                <div className="relative h-48 bg-secondary overflow-hidden">
                  <img
                    src={course.image}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <Badge
                    variant={course.badge}
                    className="absolute top-3 left-3"
                  >
                    {course.category}
                  </Badge>
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3 className="font-semibold text-lg text-foreground mb-2 group-hover:text-accent transition-colors">
                    {course.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {course.description}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {course.duration}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {course.students.toLocaleString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-warning fill-warning" />
                      {course.rating}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <Button
                      variant="accent"
                      className="flex-1"
                      asChild
                    >
                      <Link to={`/courses/${course.id}`}>
                        Eğitime Başla
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="outline" size="icon">
                      <Award className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Placeholder */}
          <div className="flex justify-center mt-12">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((page) => (
                <Button
                  key={page}
                  variant={page === 1 ? "accent" : "outline"}
                  size="icon"
                  className="h-10 w-10"
                >
                  {page}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
