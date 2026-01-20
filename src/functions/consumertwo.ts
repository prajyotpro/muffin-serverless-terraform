import { SQSEvent } from 'aws-lambda';
import { MyService } from '../services/myservice';

// --- 4. CONSUMER TWO (The Background Worker) ---
// Triggered by SQS -> Processes message -> Deletes from Queue (automatically)
export const handler = async (event: SQSEvent) => {
  const myService = new MyService();

  for (const record of event.Records) {
    const payload = record.body;
    
    // Simulate heavy work (e.g., Image processing, DB write)
    console.log(`[WORKER] Processing message ID: ${record.messageId}`);
    console.log(`[WORKER] Payload: ${payload}`);

    myService.doSomething();
    
    // If you throw an error here, SQS will retry later.
    // If you return successfully, SQS deletes the message.
    await new Promise(resolve => setTimeout(resolve, 1000)); 
  }
};