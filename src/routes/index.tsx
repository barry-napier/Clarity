import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export const Route = createFileRoute('/')({
  component: HomeComponent,
})

function HomeComponent() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-2xl font-medium text-foreground mb-2">Clarity</h1>
        <p className="text-muted-foreground mb-8">
          Your AI companion for daily reflection.
        </p>

        {/* Button variants */}
        <section className="mb-8">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-4">
            Buttons
          </h2>
          <div className="flex flex-wrap gap-3">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
          </div>
        </section>

        {/* Input */}
        <section className="mb-8">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-4">
            Input
          </h2>
          <Input placeholder="What's on your mind?" className="max-w-sm" />
        </section>

        {/* Card */}
        <section className="mb-8">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-4">
            Card
          </h2>
          <Card className="max-w-sm">
            <CardHeader>
              <CardTitle>Daily Check-in</CardTitle>
              <CardDescription>
                Take a moment to reflect on your day.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                How are you feeling right now?
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Tabs */}
        <section className="mb-8">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-4">
            Tabs
          </h2>
          <Tabs defaultValue="new" className="max-w-sm">
            <TabsList>
              <TabsTrigger value="new">New</TabsTrigger>
              <TabsTrigger value="done">Done</TabsTrigger>
            </TabsList>
            <TabsContent value="new" className="mt-2">
              <p className="text-sm text-muted-foreground">
                Your pending items will appear here.
              </p>
            </TabsContent>
            <TabsContent value="done" className="mt-2">
              <p className="text-sm text-muted-foreground">
                Completed items will appear here.
              </p>
            </TabsContent>
          </Tabs>
        </section>

        {/* Accordion */}
        <section className="mb-8">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-4">
            Accordion
          </h2>
          <Accordion type="single" collapsible className="max-w-sm">
            <AccordionItem value="health">
              <AccordionTrigger>Health & Wellness</AccordionTrigger>
              <AccordionContent>
                Track your physical and mental health goals.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="relationships">
              <AccordionTrigger>Relationships</AccordionTrigger>
              <AccordionContent>
                Nurture connections with friends and family.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="career">
              <AccordionTrigger>Career & Growth</AccordionTrigger>
              <AccordionContent>
                Set and achieve professional development goals.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        {/* Theme indicator */}
        <section className="mt-12 pt-8 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Theme: Dark mode (default) • Accent:{' '}
            <span className="text-accent">Amber</span>
          </p>
        </section>
      </div>
    </div>
  )
}
