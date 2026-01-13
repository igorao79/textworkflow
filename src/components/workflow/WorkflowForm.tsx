'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WorkflowEditor } from './WorkflowEditor';
import { Workflow } from '@/types/workflow';
import { notifySuccess, notifyError } from '@/services/notificationService';

export function WorkflowForm() {

  const [workflowData, setWorkflowData] = useState<Omit<Workflow, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>>({
    name: '',
    description: '',
    trigger: { id: 'trigger_1', type: 'webhook', config: { url: '', method: 'POST', headers: {} } },
    actions: []
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [executionCompleted, setExecutionCompleted] = useState(false);
  const [executionHasError, setExecutionHasError] = useState(false);


  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setIsSubmitting(true);
    setExecutionCompleted(false);
    setExecutionHasError(false);

    console.log('🚀 handleSubmit called, sending workflow to API...');
    console.log('📋 Workflow data:', workflowData);

    try {
      // Отправляем данные на сервер для создания и запуска workflow
      const dataToSend = {
        workflowData: {
          ...workflowData,
          name: workflowData.name || `Workflow ${Date.now()}`,
          isActive: true
        },
        triggerData: {
          name: 'Workflow User',
          email: 'noreply@workflow.com',
          message: 'Workflow executed successfully',
          userId: 'test-user-123' // Временное значение для тестирования
        }
      };

      console.log('📤 Sending data to API:', {
        workflowData: {
          name: dataToSend.workflowData.name,
          trigger: dataToSend.workflowData.trigger?.type,
          actionsCount: dataToSend.workflowData.actions?.length,
          hasId: 'id' in dataToSend.workflowData
        },
        triggerData: !!dataToSend.triggerData
      });

      const response = await fetch('/api/workflows/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      const result = await response.json();

      console.log('📡 API response received:', {
        status: response.status,
        ok: response.ok,
        result: result
      });

      if (!response.ok) {
        // Workflow execution failed
        const errorMessage = result.error || result.details || 'Workflow execution failed';
        console.error(`❌ Workflow execution failed:`, errorMessage);

        // Устанавливаем флаги завершения с ошибкой для UI
        setExecutionCompleted(true);
        setExecutionHasError(true);

        // Отправляем уведомление об ошибке
        notifyError(
          'Ошибка выполнения workflow',
          `Workflow "${workflowData.name || `Workflow ${result.workflowId?.slice(-8) || 'unknown'}`}" завершен с ошибкой: ${errorMessage}`
        );

        return; // Не продолжаем выполнение
      }

      console.log(`✅ Workflow выполнен успешно! ID: ${result.workflowId}`);

      // Устанавливаем флаги успешного выполнения для UI
      setExecutionCompleted(true);
      setExecutionHasError(false);

      // Отправляем уведомление об успешном выполнении
      notifySuccess(
        'Workflow выполнен',
        `Workflow "${workflowData.name || `Workflow ${result.workflowId.slice(-8)}`}" успешно выполнен`
      );

      // Активируем workflow для email триггера
      if (workflowData.trigger.type === 'email') {
        console.log('📧 Activating email trigger workflow...');
        try {
          const activateResponse = await fetch(`/api/cron/activate/${result.workflowId}`, {
            method: 'POST',
          });

          const activateResult = await activateResponse.json();
          console.log('📧 Email trigger activation response:', activateResult);

          if (activateResponse.ok) {
            console.log('✅ Email trigger workflow activated successfully');
          } else {
            console.warn('⚠️ Failed to activate email trigger workflow:', activateResult);
          }
        } catch (activateError) {
          console.warn('⚠️ Error activating email trigger workflow:', activateError);
        }
      }
    } catch (error) {
      console.error('Ошибка при запуске workflow:', error);
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
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            setIsSubmitting={setIsSubmitting}
            executionCompleted={executionCompleted}
            executionHasError={executionHasError}
          />
        </CardContent>
      </Card>
    </div>
  );
}
