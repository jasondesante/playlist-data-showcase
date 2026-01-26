import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import './Toast.css';

export interface ToastProps {
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  onClose?: () => void;
}

export function Toast({ message, type = 'info', duration = 4000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose?.(), 300); // Wait for exit animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose?.(), 300);
  };

  return (
    <div className={`toast toast-${type} ${isVisible ? 'toast-visible' : 'toast-hidden'}`}>
      <div className="toast-content">
        <span className="toast-message">{message}</span>
        <button className="toast-close" onClick={handleClose} aria-label="Close">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

interface ToastItem {
  id: string;
  message: string;
  type: ToastProps['type'];
}

let toastId = 0;
const toasts: Map<string, ToastItem> = new Map();

export function showToast(message: string, type: ToastProps['type'] = 'info') {
  const id = `toast-${toastId++}`;
  toasts.set(id, { id, message, type });

  // Dispatch custom event for ToastContainer
  window.dispatchEvent(new CustomEvent('toast-show', { detail: { id, message, type } }));

  return id;
}

export function removeToast(id: string) {
  toasts.delete(id);
  window.dispatchEvent(new CustomEvent('toast-remove', { detail: { id } }));
}

interface ToastContainerProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

export function ToastContainer({ position = 'top-right' }: ToastContainerProps) {
  const [visibleToasts, setVisibleToasts] = useState<Map<string, ToastItem>>(new Map());

  useEffect(() => {
    const handleShow = (e: CustomEvent) => {
      const { id, message, type } = e.detail;
      setVisibleToasts(prev => new Map(prev).set(id, { id, message, type }));
    };

    const handleRemove = (e: CustomEvent) => {
      const { id } = e.detail;
      setVisibleToasts(prev => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
    };

    window.addEventListener('toast-show', handleShow as EventListener);
    window.addEventListener('toast-remove', handleRemove as EventListener);

    return () => {
      window.removeEventListener('toast-show', handleShow as EventListener);
      window.removeEventListener('toast-remove', handleRemove as EventListener);
    };
  }, []);

  return (
    <div className={`toast-container toast-container-${position}`}>
      {Array.from(visibleToasts.values()).map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}

export default Toast;
