import { SiteShell } from "@/components/layouts/SiteShell";
import { ChatAssistant } from "@/features/chat/ChatAssistant";

export default function ChatPage() {
  return (
    <SiteShell
      title="AI Chat Concierge"
      description="Ask questions about queues, amenities, routing, and venue operations in a single conversational flow."
    >
      <ChatAssistant />
    </SiteShell>
  );
}
