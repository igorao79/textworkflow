'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { WorkflowEditor } from './WorkflowEditor';

export function WorkflowForm() {

  const [workflowData, setWorkflowData] = useState({
    name: '',
    description: '',
    trigger: { type: 'webhook' as const, config: { url: '' } },
    actions: []
  });

  const [isSubmitting, setIsSubmitting] = useState(false);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Отправляем данные на сервер для создания и запуска workflow
      const response = await fetch('/api/workflows/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflowData: {
            ...workflowData,
            name: workflowData.name || `Workflow ${Date.now()}`,
            isActive: true
          },
          triggerData: {
            name: 'Workflow User',
            email: 'noreply@workflow.com',
            message: 'Workflow executed successfully'
          }
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.details || 'Failed to create and run workflow');
      }

      alert(`Workflow выполнен успешно! ID: ${result.workflowId}`);
    } catch (error) {
      console.error('Ошибка при запуске workflow:', error);
      alert('Произошла ошибка при запуске workflow');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">

      {/* Визуальный редактор workflow */}
      <Card>
        <CardHeader>
          <CardTitle>Редактор Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <WorkflowEditor
            workflowData={workflowData}
            onWorkflowChange={setWorkflowData}
          />
        </CardContent>
      </Card>

      {/* Кнопка запуска */}
      <div className="flex justify-center">
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          size="lg"
          className="px-8 py-3 text-lg font-semibold"
        >
          {isSubmitting ? 'Запуск...' : 'Запустить Workflow'}
        </Button>
      </div>
    </div>
  );
}
