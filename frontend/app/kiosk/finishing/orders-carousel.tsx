"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { parseISO, format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  OrderGroup,
  StatusKind,
  getStatus,
  STATUS_LABEL,
  STATUS_BADGE_CLASS,
  STATUS_BORDER_CLASS,
  STATUS_DATE_CLASS,
} from "./finishing-types";

const CARDS_PER_SLIDE = 3;
const AUTO_ADVANCE_MS = 8000;

function getPulseAnimate(status: StatusKind) {
  if (status === "expired" || status === "due-today") {
    return {
      boxShadow: [
        "0 0 0 0px rgba(239,68,68,0.55)",
        "0 0 0 8px rgba(239,68,68,0)",
        "0 0 0 0px rgba(239,68,68,0)",
      ],
    };
  }
  if (status === "expiring-soon") {
    return {
      boxShadow: [
        "0 0 0 0px rgba(251,191,36,0.55)",
        "0 0 0 8px rgba(251,191,36,0)",
        "0 0 0 0px rgba(251,191,36,0)",
      ],
    };
  }
  return {};
}

function getPulseTransition(status: StatusKind) {
  if (status === "expired" || status === "due-today") {
    return { duration: 1.8, repeat: Infinity, ease: "easeOut" as const };
  }
  if (status === "expiring-soon") {
    return { duration: 2.4, repeat: Infinity, ease: "easeOut" as const };
  }
  return {};
}

interface OrderCardProps {
  order: OrderGroup;
}

function OrderCard({ order }: OrderCardProps) {
  const status = getStatus(order);
  const ratePct = (order.completion_rate * 100).toFixed(1);
  const formattedDate = order.delivery_date
    ? format(parseISO(order.delivery_date), "MMM dd, yyyy")
    : null;

  return (
    <motion.div
      className={cn(
        "h-full rounded-xl border border-gray-200 dark:border-slate-700",
        "bg-white dark:bg-slate-800",
        "border-l-[6px] p-5 flex flex-col gap-3",
        status === "done" && "opacity-80",
        STATUS_BORDER_CLASS[status]
      )}
      animate={getPulseAnimate(status)}
      transition={getPulseTransition(status)}
    >
      {/* Header: order number + badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-3xl font-black text-gray-900 dark:text-white leading-tight truncate">
            {order.order_number}
          </div>
          <div className="text-sm text-gray-500 dark:text-slate-400 truncate mt-0.5">
            {order.style_name}
          </div>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-3 py-1 text-sm font-bold whitespace-nowrap mt-0.5",
            STATUS_BADGE_CLASS[status]
          )}
        >
          {STATUS_LABEL[status]}
        </span>
      </div>

      {/* Delivery */}
      <div className={cn("text-sm font-semibold", STATUS_DATE_CLASS[status])}>
        {formattedDate ? `📦 Delivery: ${formattedDate}` : "📦 No delivery date"}
      </div>

      {/* Size breakdown */}
      <div className="border-t border-gray-200 dark:border-slate-600 pt-3 flex-1 space-y-2">
        <div className="grid grid-cols-5 text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-slate-500 mb-2">
          <span>Size</span>
          <span className="text-right">In</span>
          <span className="text-right">Out</span>
          <span className="text-right">WIP</span>
          <span className="text-right">Done%</span>
        </div>

        {order.sizes.map((s, i) => (
          <div key={i} className="grid grid-cols-5 text-base tabular-nums">
            <span className="font-semibold text-gray-900 dark:text-white truncate">
              {s.size_name}
            </span>
            <span className="text-right font-semibold text-gray-900 dark:text-white">
              {s.input.toLocaleString()}
            </span>
            <span className="text-right font-semibold text-gray-900 dark:text-white">
              {s.output.toLocaleString()}
            </span>
            <span className="text-right font-bold text-lg text-amber-500 dark:text-amber-400">
              {s.wip.toLocaleString()}
            </span>
            <span className="text-right font-bold text-green-600 dark:text-green-400">
              {s.rate.toFixed(0)}%
            </span>
          </div>
        ))}

        {order.sizes.length > 1 && (
          <div className="grid grid-cols-5 text-base tabular-nums border-t border-gray-200 dark:border-slate-600 pt-2 mt-1 font-black text-lg">
            <span className="text-gray-900 dark:text-white">Total</span>
            <span className="text-right text-gray-900 dark:text-white">
              {order.total_input.toLocaleString()}
            </span>
            <span className="text-right text-gray-900 dark:text-white">
              {order.total_output.toLocaleString()}
            </span>
            <span className="text-right text-amber-500 dark:text-amber-400">
              {order.total_wip.toLocaleString()}
            </span>
            <span className="text-right text-green-600 dark:text-green-400">
              {ratePct}%
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? "-100%" : "100%", opacity: 0 }),
};

interface OrdersCarouselProps {
  groups: OrderGroup[];
}

export function OrdersCarousel({ groups }: OrdersCarouselProps) {
  const [slide, setSlide] = useState(0);
  const [direction, setDirection] = useState(1);
  const directionRef = useRef(1);

  // Chunk groups into slides
  const slides: OrderGroup[][] = [];
  for (let i = 0; i < groups.length; i += CARDS_PER_SLIDE) {
    slides.push(groups.slice(i, i + CARDS_PER_SLIDE));
  }
  const totalSlides = Math.max(slides.length, 1);

  // Clamp slide index when groups change
  useEffect(() => {
    setSlide((s) => Math.min(s, Math.max(totalSlides - 1, 0)));
  }, [totalSlides]);

  // Auto-advance
  useEffect(() => {
    if (totalSlides <= 1) return;
    const id = setInterval(() => {
      directionRef.current = 1;
      setDirection(1);
      setSlide((s) => (s + 1) % totalSlides);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [totalSlides]);

  const goPrev = () => {
    setDirection(-1);
    setSlide((s) => (s - 1 + totalSlides) % totalSlides);
  };

  const goNext = () => {
    setDirection(1);
    setSlide((s) => (s + 1) % totalSlides);
  };

  const goTo = (i: number) => {
    setDirection(i > slide ? 1 : -1);
    setSlide(i);
  };

  if (groups.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-400 dark:text-slate-500">
          <div className="text-2xl font-bold mb-1">No Orders</div>
          <div className="text-sm">No active finishing orders found</div>
        </div>
      </div>
    );
  }

  const currentCards = slides[slide] ?? [];
  const padCount = CARDS_PER_SLIDE - currentCards.length;

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3">
      {/* Slide area */}
      <div className="flex-1 min-h-0 relative">
        {/* Prev arrow */}
        {totalSlides > 1 && (
          <button
            onClick={goPrev}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 -ml-4
              flex items-center justify-center w-10 h-10 rounded-full shadow-lg
              bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600
              text-gray-700 dark:text-slate-200
              hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}

        {/* Animated slide */}
        <div className="absolute inset-0 overflow-hidden">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={slide}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className="absolute inset-0 flex gap-4"
            >
              {currentCards.map((order) => (
                <div key={order.order_number} className="flex-1 min-w-0">
                  <OrderCard order={order} />
                </div>
              ))}
              {Array.from({ length: padCount }).map((_, i) => (
                <div key={`pad-${i}`} className="flex-1" />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Next arrow */}
        {totalSlides > 1 && (
          <button
            onClick={goNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 -mr-4
              flex items-center justify-center w-10 h-10 rounded-full shadow-lg
              bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600
              text-gray-700 dark:text-slate-200
              hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Dot indicators */}
      {totalSlides > 1 && (
        <div className="shrink-0 flex justify-center items-center gap-2">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={cn(
                "rounded-full transition-all duration-200",
                i === slide
                  ? "w-6 h-2.5 bg-blue-500"
                  : "w-2.5 h-2.5 bg-gray-300 dark:bg-slate-600 hover:bg-gray-400 dark:hover:bg-slate-500"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
