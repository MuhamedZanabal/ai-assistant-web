/**
 * Database Seed Script
 * Populates the database with initial data
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create sample sessions
  const sessions = await Promise.all([
    prisma.session.create({
      data: {
        title: 'Welcome to AI Assistant',
        userId: 'demo-user',
        systemPrompt: `You are AI Assistant, a helpful and harmless AI assistant.
You are designed to be helpful, harmless, and honest.
You should answer questions, help with tasks, and engage in conversation.
You have access to various tools that extend your capabilities.
Always be clear about what you can and cannot do.`,
        messages: {
          create: [
            {
              role: 'user',
              content: 'Hello! What can you help me with?',
            },
            {
              role: 'assistant',
              content: 'Hello! I\'m your AI Assistant. I can help you with a wide variety of tasks including:\n\n' +
                '• Answering questions and explaining concepts\n' +
                '• Writing and editing code\n' +
                '• Reading and writing files\n' +
                '• Searching the web for information\n' +
                '• Data transformation and analysis\n' +
                '• And much more!\n\n' +
                'What would you like to work on today?',
            },
          ],
        },
      },
    }),
    prisma.session.create({
      data: {
        title: 'Code Review Session',
        userId: 'demo-user',
        systemPrompt: 'You are a helpful code review assistant. Review code for bugs, security issues, and best practices.',
      },
    }),
    prisma.session.create({
      data: {
        title: 'Data Analysis',
        userId: 'demo-user',
        systemPrompt: 'You are a data analysis assistant. Help users understand and work with their data.',
      },
    }),
  ]);

  console.log('✅ Created', sessions.length, 'sample sessions');
  console.log('✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
