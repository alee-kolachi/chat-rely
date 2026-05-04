import { redirect } from "next/navigation";

export default function AgentSettingsIndexRedirect() {
  redirect("/agent-settings/general");
}
