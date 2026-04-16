import type { NavItem } from "@/components/app/nav-main";
import {
  Home,
  Package,
  PaintRoller,
  Tags,
  BookOpenText,
  Settings2,
} from "lucide-react";

export const navigation: NavItem[] = [
  {
    title: "Overview",
    url: "/",
    icon: Home,
  },
  {
    title: "Styles",
    url: "/styles",
    icon: PaintRoller,
  },
  {
    title: "Orders",
    url: "/orders",
    icon: Package,
  },
  {
    title: "Bundles",
    url: "/bundles",
    icon: Tags,
  },
  {
    title: "Reports",
    url: "/reports",
    icon: BookOpenText,
    items: [
      {
        title: "Sewing Dashboard",
        url: "/reports/sewing-dashboard",
      },
    ],
  },
  {
    title: "Configuration",
    url: "/configuration",
    icon: Settings2,
    items: [
      {
        title: "Buyers",
        url: "/configuration/buyers",
      },
      {
        title: "Seasons",
        url: "/configuration/seasons",
      },
      {
        title: "Sizes",
        url: "/configuration/sizes",
      },
      {
        title: "Colors",
        url: "/configuration/colors",
      },
      {
        title: "Defects",
        url: "/configuration/defects",
      },
      {
        title: "Lines",
        url: "/configuration/lines",
      },
      {
        title: "Line Targets",
        url: "/configuration/line-targets",
      },
      {
        title: "Cut Parts",
        url: "/configuration/cut-parts",
      },
      {
        title: "Spreads",
        url: "/configuration/spreads",
      },
    ],
  },
];
