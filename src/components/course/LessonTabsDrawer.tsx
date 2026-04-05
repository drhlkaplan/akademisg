/**
 * LessonTabsDrawer — Floating drawer for Notes, Discussion, AI Tutor, Help.
 * Does NOT affect the SCORM player height.
 */

import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MessageSquare, PanelRightOpen } from "lucide-react";
import { LessonTabs } from "./LessonTabs";
import type { LessonItem } from "./LessonSidebar";

interface LessonTabsDrawerProps {
  lesson: LessonItem | null;
  courseTitle: string;
  category?: string;
  dangerClass?: string;
}

export function LessonTabsDrawer({ lesson, courseTitle, category, dangerClass }: LessonTabsDrawerProps) {
  const [open, setOpen] = useState(false);

  if (!lesson) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-4 right-4 z-30 gap-2 shadow-lg bg-background/95 backdrop-blur-sm border-border hover:bg-accent/10"
        >
          <PanelRightOpen className="h-4 w-4" />
          <span className="hidden sm:inline">Notlar & Yardım</span>
          <MessageSquare className="h-4 w-4 sm:hidden" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:w-[420px] p-0 overflow-hidden">
        <div className="h-full overflow-auto pt-8">
          <LessonTabs
            lesson={lesson}
            courseTitle={courseTitle}
            category={category}
            dangerClass={dangerClass}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
