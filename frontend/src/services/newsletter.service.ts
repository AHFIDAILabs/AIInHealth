import { api } from './api';

export type NewsletterSource = 'updates' | 'concept_note';

export const subscribeNewsletter = async (input: { email: string; firstName: string; source: NewsletterSource }): Promise<void> => {
  await api.post('/newsletter/subscribe', input);
};
