import { redirect } from "next/navigation";

/** /order/success on its own has nothing to show. */
export default function OrderSuccessIndex() {
  redirect("/shop");
}
