import { ApiRouteConfig, Handlers } from 'motia';
import z from 'zod';

const bodySchema = z.object({
  url: z.string().url('Invalid URL format'),
  to: z.string().email('Invalid email format'),
  purpose: z.string().min(3, 'Purpose must be at least 3 characters'),
  extra : z.string()
});

export const config: ApiRouteConfig = {
  name: 'SubmitContent',
  type: 'api',
  path: '/api/generate',
  method: 'POST',
  description: 'Receives content request and emits event for processing',
  bodySchema: bodySchema,
  emits: ['content.requested'],
  flows:["content-forge-flow"],
  responseSchema: {
    200: z.object({
      message: z.string(),
      requestId: z.string()
    }),
    500: z.object({
      error: z.string()
    })
  }
};

export const handler: Handlers['SubmitContent'] = async (req, { emit, logger }) => {
  try {
    const { url, to, purpose, extra } = req.body;
    
    logger.info('Received new content request', { url, to, purpose, extra });

    await emit({
      topic: 'content.requested',
      data: { url, to, purpose, extra }
    });

    return { 
      status: 200, 
      body: { 
        message: "🚀 Workflow started! Check your email in a few seconds.",
        requestId: crypto.randomUUID()
      } 
    };
  } catch (error) {
    logger.error('Failed to submit content request', { error });
    return {
      status: 500,
      body: { error: 'Failed to process request' }
    };
  }
};