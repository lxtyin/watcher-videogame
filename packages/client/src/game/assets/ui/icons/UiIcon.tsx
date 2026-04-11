import type { HTMLAttributes } from "react";

export type UiIconName =
  | "chevron-left"
  | "chevron-right"
  | "copy"
  | "create-room"
  | "home"
  | "join-room"
  | "return";

interface UiIconProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  name: UiIconName;
}

export function UiIcon({ className, name, ...props }: UiIconProps) {
  return (
    <span
      aria-hidden="true"
      className={["ui-icon", `ui-icon--${name}`, className ?? ""].filter(Boolean).join(" ")}
      {...props}
    />
  );
}
