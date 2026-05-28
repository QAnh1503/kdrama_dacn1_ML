"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Footer } from "@/components/footer"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Layers, BarChart3, Tv, Mail, MessageSquare } from "lucide-react"

const features = [
  {
    icon: Layers,
    title: "AI-Powered Predictions",
    description: "Our XGBoost model analyzes multiple factors including cast, genre, platform, and historical data to predict drama ratings with 94% accuracy."
  },
  {
    icon: BarChart3,
    title: "Data Analytics",
    description: "Explore comprehensive charts and insights about K-Drama trends, genre performance, and platform distribution over the years."
  },
  {
    icon: Tv,
    title: "Drama Discovery",
    description: "Browse our curated collection of Korean dramas with detailed information, trailers, cast details, and user reviews."
  }
]

const steps = [
  {
    number: 1,
    title: "Enter Drama Details",
    description: "Input the drama name, genre, cast, director, episodes, and platform."
  },
  {
    number: 2,
    title: "AI Analysis",
    description: "Our model processes the data and analyzes 50+ features."
  },
  {
    number: 3,
    title: "Get Prediction",
    description: "Receive predicted rating, trend level, and key factors."
  },
  {
    number: 4,
    title: "Explore Insights",
    description: "Dive deeper with charts and browse recommendations."
  }
]

const faqs = [
  {
    question: "How accurate are the predictions?",
    answer: "Our XGBoost model achieves approximately 94% accuracy on the validation dataset. The model is trained on over 2,800 Korean dramas with various features including cast popularity, genre, platform, and historical performance data."
  },
  {
    question: "Can I predict ratings for upcoming dramas?",
    answer: "Yes! You can enter the details of any upcoming drama including expected cast, genre, platform, and release year. The model will provide a predicted rating based on historical patterns and similar dramas."
  },
  {
    question: "How often is the model updated?",
    answer: "We update our model quarterly to include new drama releases and refine predictions based on actual ratings. This ensures our predictions stay accurate and relevant with current trends."
  },
  {
    question: "What factors have the biggest impact on ratings?",
    answer: "Based on our analysis, the top factors are: Actor popularity (92%), Genre - especially Romance (78%), Platform - Netflix shows higher ratings (71%), Director reputation (65%), and Episode count - 16 episodes is optimal (54%)."
  },
  {
    question: "Is the service free to use?",
    answer: "Yes, the basic prediction and browsing features are completely free. We may introduce premium features in the future for advanced analytics and API access."
  }
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="border-b border-border bg-card/50 px-6 py-16 text-center">
        <h1 className="text-3xl font-bold md:text-4xl">
          About <span className="text-primary">K-Drama Predictor</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          We use machine learning and data analysis to predict Korean drama
          ratings and help viewers discover their next favorite show.
        </p>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-6 py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <Card 
                key={index} 
                className="bg-card border-border text-center transition-all hover:border-primary/50"
              >
                <CardContent className="pt-8">
                  <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                    <Icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* How It Works */}
      <div className="border-y border-border bg-card/30 px-6 py-16">
        <div className="container mx-auto">
          <h2 className="mb-12 text-center text-2xl font-bold md:text-3xl">
            How It Works
          </h2>
          <div className="grid gap-6 md:grid-cols-4">
            {steps.map((step) => (
              <Card key={step.number} className="bg-card border-border text-center">
                <CardContent className="pt-8">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                    {step.number}
                  </div>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="container mx-auto px-6 py-16">
        <h2 className="mb-8 text-center text-2xl font-bold md:text-3xl">
          Frequently Asked Questions
        </h2>
        <div className="mx-auto max-w-3xl">
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="rounded-lg border border-border bg-card px-4"
              >
                <AccordionTrigger className="text-left hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>

      {/* Contact Section */}
      <div className="border-t border-border bg-card/30 px-6 py-16">
        <div className="container mx-auto">
          <Card className="mx-auto max-w-xl border-border bg-card">
            <CardHeader className="text-center">
              <CardTitle>Get in Touch</CardTitle>
              <CardDescription>
                Have questions, feedback, or suggestions? We would love to hear from you!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input placeholder="Your name" className="bg-input" />
                <Input placeholder="Your email" type="email" className="bg-input" />
              </div>
              <Input placeholder="Subject" className="bg-input" />
              <textarea 
                placeholder="Your message..."
                className="min-h-24 w-full rounded-md border border-border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="flex gap-3">
                <Button className="flex-1 bg-primary hover:bg-primary/90">
                  <Mail className="mr-2 h-4 w-4" />
                  Send Message
                </Button>
                <Button variant="outline" className="flex-1">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Live Chat
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  )
}
