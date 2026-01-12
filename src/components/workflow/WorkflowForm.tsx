'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WorkflowEditor } from './WorkflowEditor';
import { Workflow } from '@/types/workflow';
import { ExecutionMonitorModal } from './WorkflowEditor';

export function WorkflowForm() {

  const [workflowData, setWorkflowData] = useState<Omit<Workflow, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>>({
    name: '',
    description: '',
    trigger: { id: 'trigger_1', type: 'webhook', config: { url: '', method: 'POST', headers: {} } },
    actions: []
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [workflowId, setWorkflowId] = useState<string | undefined>();
  const [showExecutionMonitor, setShowExecutionMonitor] = useState(false);


  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    console.log('🚀 handleSubmit called, creating workflow first...');
    console.log('📋 Workflow data:', workflowData);

    try {
      // Сначала создаем workflow без выполнения
      const createResponse = await fetch('/api/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...workflowData,
          name: workflowData.name || `Workflow ${Date.now()}`,
          isActive: true
        }),
      });

      const createResult = await createResponse.json();

      if (!createResponse.ok) {
        throw new Error(createResult.error || 'Failed to create workflow');
      }

      console.log(`✅ Workflow создан! ID: ${createResult.workflow.id}`);
      setWorkflowId(createResult.workflow.id);

      // Теперь открываем модалку выполнения
      setShowExecutionMonitor(true);

    } catch (error) {
      console.error('Ошибка при создании workflow:', error);
      alert('Ошибка при создании workflow');
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
            onSubmit={handleSubmit}
            workflowId={workflowId}
            workflowName={workflowData.name}
          />
        </CardContent>
      </Card>

      {/* Модалка выполнения workflow */}
      <ExecutionMonitorModal
        isOpen={showExecutionMonitor}
        onClose={() => setShowExecutionMonitor(false)}
        onExecute={async () => {
          // Выполняем workflow через API
          const executeResponse = await fetch('/api/workflows/run', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              workflowId: workflowId,
              triggerData: {
                name: 'Workflow User',
                email: 'noreply@workflow.com',
                message: 'Workflow executed successfully'
              }
            }),
          });

          if (!executeResponse.ok) {
            throw new Error('Failed to execute workflow');
          }

          return executeResponse.json();
        }}
        actions={workflowData.actions}
        workflowId={workflowId}
        workflowName={workflowData.name}
      />
    </div>
  );
}
