import { cn } from "@/lib/utils";

/**
 * A 58px touch-friendly field with a leading icon and a floating label.
 * Pass `as="select"` for the reason dropdown, `fixed` when the value is
 * always filled (date, time), or `filled` to keep the label raised.
 */
export default function FloatingField({
  id,
  label,
  icon: Icon,
  error,
  as = "input",
  fixed = false,
  filled = false,
  children,
  ...rest
}) {
  return (
    <>
      <div className={cn("kf", as === "select" && "sel", (fixed || filled) && "filled", error && "bad")}>
        {Icon ? <Icon className="ico" strokeWidth={2} /> : null}
        {as === "select" ? (
          <select id={id} {...rest}>
            {children}
          </select>
        ) : (
          <input id={id} placeholder=" " {...rest} />
        )}
        <label htmlFor={id}>{label}</label>
      </div>
      {error ? <span className="kf-err">{error}</span> : null}
    </>
  );
}