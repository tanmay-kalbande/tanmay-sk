import { useEffect } from "react";
import AssistantChat from "./AssistantChat";

export default function AssistantPage() {
  useEffect(() => {
    document.documentElement.setAttribute("data-app-page", "assistant");
    document.title = "Tanmay Kalbande - AI Assistant";
  }, []);

  return <AssistantChat variant="page" />;
}
