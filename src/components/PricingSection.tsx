import { PricingCard } from "./PricingCard";

const pricingTiers = [
  {
    name: "Basic",
    model: "Gemini 1.5 Flash / GPT-4o-mini",
    description: "Perfect for getting started with AI",
    prices: {
      oneHour: 10,
      twoHours: 18,
      extraHour: 6,
    },
    features: [
      "Access to Gemini 1.5 Flash",
      "Access to GPT-4o-mini",
      "Fast response times",
      "Standard support",
      "Hourly session tracking",
    ],
  },
  {
    name: "Standard",
    model: "Gemini 1.5 Pro",
    description: "Advanced capabilities for power users",
    prices: {
      oneHour: 25,
      twoHours: 45,
      extraHour: 15,
    },
    features: [
      "Access to Gemini 1.5 Pro",
      "Enhanced reasoning capabilities",
      "Priority response times",
      "Priority support",
      "Extended context windows",
    ],
    popular: true,
  },
  {
    name: "Pro",
    model: "GPT-4o (OpenAI)",
    description: "Ultimate AI experience",
    prices: {
      oneHour: 30,
      twoHours: 55,
      extraHour: 20,
    },
    features: [
      "Access to GPT-4o",
      "Superior reasoning",
      "Fastest response times",
      "Premium support",
      "Maximum context length",
    ],
  },
];

const videoPricingTiers = [
  {
    name: "Starter Video Pack",
    videos: 1,
    price: 30,
    description: "Try AI video generation",
  },
  {
    name: "Pro Video Pack",
    videos: 3,
    price: 50,
    description: "Best value for creators",
    popular: true,
  },
  {
    name: "Unlimited Video",
    videos: 10,
    price: 150,
    description: "For serious production",
  },
];

export const PricingSection = () => {
  return (
    <section id="pricing" className="py-24 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent pointer-events-none" />
      
      <div className="container mx-auto relative">
        <div className="text-center space-y-4 mb-16 animate-fade-up">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your needs. No hidden fees, no surprises.
          </p>
        </div>
        
        {/* Chat Pricing */}
        <h3 className="text-2xl font-semibold text-center mb-8">AI Chat Sessions</h3>
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-20">
          {pricingTiers.map((tier, index) => (
            <div
              key={tier.name}
              className="animate-fade-up"
              style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'backwards' }}
            >
              <PricingCard tier={tier} />
            </div>
          ))}
        </div>

        {/* Video Pricing */}
        <h3 className="text-2xl font-semibold text-center mb-8">AI Video Generation</h3>
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {videoPricingTiers.map((tier, index) => (
            <div
              key={tier.name}
              className={`animate-fade-up border rounded-xl p-6 text-center space-y-4 transition-all ${
                tier.popular
                  ? 'border-white bg-white/5 shadow-xl scale-105'
                  : 'border-white/20 bg-white/[0.02] hover:border-white/40'
              }`}
              style={{ animationDelay: `${(index + 3) * 0.1}s`, animationFillMode: 'backwards' }}
            >
              {tier.popular && (
                <span className="px-3 py-1 text-xs font-medium rounded-full bg-white text-black">
                  Best Value
                </span>
              )}
              <h4 className="text-xl font-bold">{tier.name}</h4>
              <p className="text-sm text-muted-foreground">{tier.description}</p>
              <div className="text-4xl font-bold">₹{tier.price}</div>
              <p className="text-sm text-muted-foreground">{tier.videos} video{tier.videos > 1 ? 's' : ''}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
