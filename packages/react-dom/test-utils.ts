//@ts-ignore
import { createRoot } from 'react-dom';
import { ReactElementType } from 'shared';

export function renderIntoContainer(element: ReactElementType) {
  const div = document.createElement('div');
  createRoot(div).render(element);
}
