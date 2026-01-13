'use client';

import { useEffect } from 'react';
import toast from 'react-hot-toast';

export function ToastHandler() {
  useEffect(() => {
    // Обработчик кликов на toast уведомлениях для плавного исчезновения
    const handleToastClick = (event: Event) => {
      const target = event.target as HTMLElement;
      const toastElement = target.closest('[data-sonner-toaster] [data-sonner-toast]') ||
                          target.closest('.Toastify__toast');

      if (toastElement) {
        event.preventDefault();
        event.stopPropagation();

        // Добавляем класс для анимации исчезновения при клике
        toastElement.classList.add('Toastify__toast-click-exit');

        // Находим и закрываем соответствующий toast через 300ms
        const closeButton = toastElement.querySelector('[data-dismiss="true"], .Toastify__close-button');
        if (closeButton) {
          setTimeout(() => {
            (closeButton as HTMLElement).click();
          }, 50);
        } else {
          // Fallback: ищем toast по ID и закрываем через toast API
          const toastId = toastElement.getAttribute('data-toast-id') ||
                         toastElement.getAttribute('id');
          if (toastId) {
            setTimeout(() => {
              toast.dismiss(toastId);
            }, 300);
          }
        }
      }
    };

    // Добавляем обработчик событий на document
    document.addEventListener('click', handleToastClick, true);

    return () => {
      document.removeEventListener('click', handleToastClick, true);
    };
  }, []);

  return null;
}
