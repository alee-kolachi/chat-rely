import { redirect } from "next/navigation";

export default function SettingsGeneralRedirect() {
  redirect("/account/profile");
}
