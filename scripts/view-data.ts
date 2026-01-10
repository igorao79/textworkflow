import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const WORKFLOWS_FILE = path.join(DATA_DIR, 'workflows.json');
const EXECUTIONS_FILE = path.join(DATA_DIR, 'executions.json');

console.log('📊 Workflow Builder - Просмотр сохраненных данных\n');

// Просмотр workflows
if (fs.existsSync(WORKFLOWS_FILE)) {
  console.log('📋 WORKFLOWS:');
  try {
    const workflows = JSON.parse(fs.readFileSync(WORKFLOWS_FILE, 'utf8'));
    workflows.forEach((workflow, index) => {
      console.log(`${index + 1}. ${workflow.name} (${workflow.id})`);
      console.log(`   Статус: ${workflow.isActive ? 'Активен' : 'Неактивен'}`);
      console.log(`   Действий: ${workflow.actions.length}`);
      console.log(`   Триггер: ${workflow.trigger.type}`);
      console.log(`   Создан: ${new Date(workflow.createdAt).toLocaleString('ru-RU')}`);
      console.log('');
    });
  } catch (error) {
    console.error('Ошибка чтения workflows:', error.message);
  }
} else {
  console.log('📋 WORKFLOWS: Нет сохраненных workflow');
}

// Просмотр executions
if (fs.existsSync(EXECUTIONS_FILE)) {
  console.log('\n⚡ EXECUTIONS:');
  try {
    const executions = JSON.parse(fs.readFileSync(EXECUTIONS_FILE, 'utf8'));
    executions.slice(-10).forEach((execution, index) => { // Показываем последние 10
      console.log(`${index + 1}. ${execution.id.slice(-8)} - ${execution.status.toUpperCase()}`);
      console.log(`   Workflow: ${execution.workflowId.slice(-8)}`);
      console.log(`   Начало: ${new Date(execution.startedAt).toLocaleString('ru-RU')}`);
      if (execution.completedAt) {
        console.log(`   Завершение: ${new Date(execution.completedAt).toLocaleString('ru-RU')}`);
      }
      if (execution.error) {
        console.log(`   Ошибка: ${execution.error}`);
      }
      console.log(`   Логов: ${execution.logs.length}`);
      console.log('');
    });
  } catch (error) {
    console.error('Ошибка чтения executions:', error.message);
  }
} else {
  console.log('\n⚡ EXECUTIONS: Нет сохраненных выполнений');
}

console.log('💾 Данные хранятся в папке /data/');
