import type { WhatsAppMessageDisplay } from "@/types/whatsapp";

export type DayGroup = { date: string; items: WhatsAppMessageDisplay[] };

export function groupByDay(messages: WhatsAppMessageDisplay[]): DayGroup[] {
  const days: DayGroup[] = [];
  let currentDay = "";
  for (const msg of messages) {
    const day = new Date(msg.timestamp).toDateString();
    if (day !== currentDay) {
      currentDay = day;
      days.push({ date: msg.timestamp, items: [] });
    }
    days[days.length - 1].items.push(msg);
  }
  return days;
}

export function isRunStart(msgs: WhatsAppMessageDisplay[], idx: number): boolean {
  if (idx === 0) return true;
  const prev = msgs[idx - 1];
  const curr = msgs[idx];
  if (prev.senderPhone !== curr.senderPhone) return true;
  const gap = new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime();
  return gap > 3 * 60 * 1000;
}
