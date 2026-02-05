import Layout from './Layout';

export default function About() {
  return (
    <Layout noNav>
      <div className="max-w-lg mx-auto text-white">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-slate-100">About</h1>
          <a
            href="/"
            className="text-slate-400 text-sm hover:text-slate-200 transition-colors"
          >
            ← back
          </a>
        </div>

        <div className="space-y-6 text-slate-300 leading-relaxed">
          <p>
            Hi, I'm <span className="text-slate-100 font-medium">Krayorn</span> and
            I made this website. If you have any feedbacks, ideas or suggestions
            please send them my way! You can also just send me a message to chat,
            I'd be delighted!
          </p>

          <div className="flex flex-wrap gap-4">
            <a
              href="https://x.com/Krayorn"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-600/30 hover:bg-slate-700/50 hover:border-slate-500/50 transition-all duration-200 text-slate-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              @Krayorn
            </a>
            <a
              href="https://github.com/Krayorn"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-600/30 hover:bg-slate-700/50 hover:border-slate-500/50 transition-all duration-200 text-slate-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
              Krayorn
            </a>
            <span className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-600/30 text-slate-200">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
              me@krayorn.com
            </span>
          </div>

          <p>
            You can find more stuff I made on{' '}
            <a
              href="https://krayorn.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors"
            >
              my blog
            </a>
            , and if you like big board games with tons of miniatures, you might
            be interested in{' '}
            <a
              href="https://pileofshame.krayorn.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors"
            >
              Pile of Shame
            </a>
            {' '}to track your miniature collection.
          </p>
        </div>
      </div>
    </Layout>
  );
}
