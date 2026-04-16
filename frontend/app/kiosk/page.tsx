"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Scissors, Sparkles, Grid3X3 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function KioskPage() {
  const router = useRouter();

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {/* Sewing Kiosk */}
        <Card className="group cursor-pointer transition-all hover:shadow-lg hover:scale-105">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <Scissors className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl">Sewing Kiosk</CardTitle>
            <CardDescription className="text-base">
              Monitor sewing line performance, quality control, and parts
              inventory
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button
              onClick={() => router.push("/kiosk/sewing")}
              size="lg"
              className="w-full">
              Enter Sewing Dashboard
            </Button>
          </CardContent>
        </Card>

        {/* Finishing Kiosk */}
        <Card className="group cursor-pointer transition-all hover:shadow-lg hover:scale-105">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <Sparkles className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl">Finishing Kiosk</CardTitle>
            <CardDescription className="text-base">
              Monitor finishing line performance and quality control metrics
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button
              onClick={() => router.push("/kiosk/finishing")}
              size="lg"
              className="w-full">
              Enter Finishing Dashboard
            </Button>
          </CardContent>
        </Card>

        {/* Garments Heatmap */}
        <Card className="group cursor-pointer transition-all hover:shadow-lg hover:scale-105">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <Grid3X3 className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl">Garments Heatmap</CardTitle>
            <CardDescription className="text-base">
              Visual status grid of all garments organized by order and progress
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button
              onClick={() => router.push("/kiosk/heatmap")}
              size="lg"
              className="w-full">
              View Heatmap
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
