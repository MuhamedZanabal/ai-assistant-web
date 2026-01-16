import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex-1">
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-16 sm:py-24">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-6">
            AI Assistant Web
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground mb-8">
            A production-ready AI assistant interface built with Next.js, OpenAI,
            and TypeScript. Features real-time streaming, tool calling, and
            persistent conversations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/chat"
              className="inline-flex items-center justify-center px-6 py-3 text-base font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Start Chatting
            </Link>
            <Link
              href="https://github.com/your-org/ai-assistant-web"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-6 py-3 text-base font-medium rounded-lg border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              View on GitHub
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 border-t bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-background rounded-lg p-6 shadow-sm">
              <h3 className="text-xl font-semibold mb-3">Real-time Streaming</h3>
              <p className="text-muted-foreground">
                Experience fluid conversations with streaming responses from the AI.
                See the assistant's thoughts as they develop.
              </p>
            </div>
            <div className="bg-background rounded-lg p-6 shadow-sm">
              <h3 className="text-xl font-semibold mb-3">Tool Calling</h3>
              <p className="text-muted-foreground">
                The assistant can read files, execute code, search the web, and
                transform data. Extendable tool system included.
              </p>
            </div>
            <div className="bg-background rounded-lg p-6 shadow-sm">
              <h3 className="text-xl font-semibold mb-3">Persistent Memory</h3>
              <p className="text-muted-foreground">
                Conversations are stored in PostgreSQL. Pick up where you left off
                with full conversation history.
              </p>
            </div>
            <div className="bg-background rounded-lg p-6 shadow-sm">
              <h3 className="text-xl font-semibold mb-3">Production Ready</h3>
              <p className="text-muted-foreground">
                Docker, Kubernetes, observability, security, and CI/CD pipelines
                configured out of the box.
              </p>
            </div>
            <div className="bg-background rounded-lg p-6 shadow-sm">
              <h3 className="text-xl font-semibold mb-3">Type Safe</h3>
              <p className="text-muted-foreground">
                Full TypeScript support with strict typing throughout the codebase.
                Catch errors at compile time.
              </p>
            </div>
            <div className="bg-background rounded-lg p-6 shadow-sm">
              <h3 className="text-xl font-semibold mb-3">Observable</h3>
              <p className="text-muted-foreground">
                OpenTelemetry instrumentation for metrics, traces, and logs.
                Prometheus and Grafana ready.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-12">Built With</h2>
          <div className="flex flex-wrap justify-center gap-8">
            {[
              { name: 'Next.js', url: 'https://nextjs.org/' },
              { name: 'TypeScript', url: 'https://www.typescriptlang.org/' },
              { name: 'OpenAI', url: 'https://openai.com/' },
              { name: 'PostgreSQL', url: 'https://www.postgresql.org/' },
              { name: 'Redis', url: 'https://redis.io/' },
              { name: 'Prisma', url: 'https://www.prisma.io/' },
              { name: 'Docker', url: 'https://www.docker.com/' },
              { name: 'Kubernetes', url: 'https://kubernetes.io/' },
            ].map((tech) => (
              <a
                key={tech.name}
                href={tech.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-lg text-muted-foreground hover:text-foreground transition-colors"
              >
                {tech.name}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t">
        <div className="max-w-6xl mx-auto text-center text-sm text-muted-foreground">
          <p>
            AI Assistant Web - Open Source AI Interface
          </p>
          <p className="mt-2">
            Licensed under MIT License
          </p>
        </div>
      </footer>
    </main>
  );
}
