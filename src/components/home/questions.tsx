import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionQuestionsTrigger,
} from "@/components/ui/accordion";

const qas = [
  {
    question: "How does RateGen help DMCs streamline pricing and quotations?",
    ans: "RateGen uses AI to automate rate management, process queries instantly, and generate accurate quotations—saving time and reducing errors.",
  },
  {
    question: "Can I customize pricing rules and policies for my DMC?",
    ans: "Yes, RateGen lets you define your own pricing rules, markups, and policies so quotes always match your business needs.",
  },
  {
    question: "How does RateGen handle incomplete queries from travel agents?",
    ans: "The AI fills gaps intelligently using context, defaults, and your DMC's rules, while flagging unclear inputs for quick clarification.",
  },
  {
    question: "Does RateGen integrate with my existing workflow?",
    ans: "Absolutely—RateGen connects with your existing sheets, APIs, and CRM/booking systems to fit seamlessly into your process.",
  },
  {
    question: "Is there a free plan available?",
    ans: "Yes, we offer a starter plan so you can try RateGen before scaling with advanced features.",
  },
];

export default function Questions() {
  return (
    <section className="space-y-20">
      <div className="text-center space-y-3">
        <p className="text-3xl sm:text-6xl font-bold text-white leading-tight">
          Got Questions?&nbsp;
          <span className="bg-gradient-to-r from-emerald-500 to-emerald-200  bg-clip-text text-transparent">
            We&apos;ve Got Answers!
          </span>
        </p>
        <p className="font-semibold text-white/70 text-[10px] sm:text-xl  max-w-2xs sm:max-w-5xl mx-auto">
          See how RateGen streamlines DMC pricing, automates quotes, and boosts
          efficiency with AI.
        </p>
      </div>

      <div className="w-full sm:w-4/5 md:w-1/2 mx-auto">
        <Accordion type="single" collapsible className="w-full">
          {qas.map((q, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="text-white border-white/40"
            >
              <AccordionQuestionsTrigger>
                {q.question}
              </AccordionQuestionsTrigger>
              <AccordionContent className="text-white/60">
                <p>{q.ans}</p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
