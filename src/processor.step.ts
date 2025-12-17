import type { EventConfig, Handlers } from 'motia';
import z from 'zod';
import { get_transcript } from './utils/audio-parser';
import { mail_user } from './utils/email-manager';

const inputSchema = z.object({
  url: z.string(),
  to: z.string(),
  purpose: z.string()
});

export const config: EventConfig = {
  name: 'ProcessContent',
  type: 'event',
  description: 'Processes content request by transcribing and sending email',
  subscribes: ['content.requested'],
  emits: [],
  flows:["content-forge-flow"],
  input: inputSchema
};

export const handler: Handlers['ProcessContent'] = async (input, { logger }) => {
  try {
    const { url, to, purpose } = input;
    
    logger.info('Processing started...', { url, to, purpose });

    const content = await get_transcript(url, purpose);
    
    if (!content) {
      throw new Error('No content generated');
    }

    await mail_user(to, content);
    
    logger.info('✅ Workflow completed successfully!', { to });
    
  } catch (error : any) {
    if (error.status === 400 || error.code === 'model_decommissioned') {
       logger.error('❌ Permanent Error - Stopping Retries', { error });
       
       throw new Error(error.message); 
    }
  }
};