import { redirect } from "next/navigation";

export default function SettingsBillingRedirect() {
  redirect("/account/billing");
}
