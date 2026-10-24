import { ChartNoAxesColumn } from "lucide-react";

type BrandMarkProps = {
  size?: "sm" | "lg";
};

const sizeClasses = {
  sm: {
    container: "h-9 w-9 rounded-xl",
    icon: "h-[18px] w-[18px]",
  },
  lg: {
    container: "h-14 w-14 rounded-2xl",
    icon: "h-7 w-7",
  },
};

export function BrandMark({ size = "sm" }: BrandMarkProps) {
  const classes = sizeClasses[size];

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center border border-emerald-300/20 bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-lg shadow-emerald-950/30 ${classes.container}`}
    >
      <ChartNoAxesColumn className={classes.icon} strokeWidth={2.5} />
    </span>
  );
}
