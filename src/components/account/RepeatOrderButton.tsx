import { repeatOrderAction } from "@/lib/actions/order";
import { Button } from "@/components/ui";

/**
 * «Повторить заказ»: товары из заказа добавляются в корзину Server Action.
 * Обычная форма — работает и без JavaScript, после успеха сервер редиректит в корзину.
 */
export function RepeatOrderButton({
  orderId,
  variant = "outline",
  size = "md",
  className,
}: {
  orderId: string;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success" | "link";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  return (
    <form action={repeatOrderAction}>
      <input type="hidden" name="orderId" value={orderId} />
      <Button type="submit" variant={variant} size={size} className={className}>
        Повторить заказ
      </Button>
    </form>
  );
}
