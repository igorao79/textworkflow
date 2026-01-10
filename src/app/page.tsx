'use client';

import { WorkflowForm } from '@/components/workflow/WorkflowForm';

export default function Home() {
  return (
    <div
      className="min-h-screen bg-background"
      style={{ backgroundColor: '#0a0a0a', color: '#ffffff' }}
    >
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <header className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Workflow Builder
            </h1>
            <p className="text-xl text-muted-foreground mb-4">
              Создавайте и управляйте автоматизированными процессами
            </p>
          </header>

          <WorkflowForm />
        </div>
      </div>
    </div>
  );
}
