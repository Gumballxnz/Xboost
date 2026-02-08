import Link from "next/link"

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">
            <span className="text-emerald-500">X</span>Boost
          </h1>
          <Link
            href="/login"
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-6 py-2 rounded-lg transition-all"
          >
            Entrar
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-white mb-6">
            Aumente seu <span className="text-emerald-500">engajamento</span> no X
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
            Comentários automáticos inteligentes gerados por IA para suas postagens. Mais interação, mais alcance.
          </p>
          <Link
            href="/login"
            className="inline-block bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-all hover:scale-105"
          >
            Começar Grátis →
          </Link>
          <p className="text-gray-500 text-sm mt-4">5 créditos grátis • Sem cartão necessário</p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <div className="bg-[#18181b] rounded-2xl p-6 border border-gray-800">
            <div className="text-3xl mb-4">🤖</div>
            <h3 className="text-lg font-semibold text-white mb-2">IA Avançada</h3>
            <p className="text-gray-400">Comentários únicos e contextuais gerados por inteligência artificial.</p>
          </div>
          <div className="bg-[#18181b] rounded-2xl p-6 border border-gray-800">
            <div className="text-3xl mb-4">⚡</div>
            <h3 className="text-lg font-semibold text-white mb-2">Rápido</h3>
            <p className="text-gray-400">Comentários entregues em minutos após a criação da campanha.</p>
          </div>
          <div className="bg-[#18181b] rounded-2xl p-6 border border-gray-800">
            <div className="text-3xl mb-4">🔒</div>
            <h3 className="text-lg font-semibold text-white mb-2">Seguro</h3>
            <p className="text-gray-400">Contas rotativas e proxies para máxima segurança.</p>
          </div>
        </div>

        {/* Pricing - Preços reduzidos 75% */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">Planos</h2>
          <p className="text-gray-400">Escolha o melhor para você</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {/* Basic */}
          <div className="bg-[#18181b] rounded-2xl p-6 border border-gray-800">
            <h3 className="text-lg font-semibold text-white mb-2">Basic</h3>
            <div className="mb-4">
              <span className="text-4xl font-bold text-white">125</span>
              <span className="text-gray-400 ml-1">MZN</span>
            </div>
            <ul className="space-y-3 text-gray-400 text-sm mb-6">
              <li className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span> 50 créditos
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span> Suporte por email
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span> Dashboard completo
              </li>
            </ul>
            <button className="w-full py-3 border border-emerald-500 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-white transition-all">
              Comprar
            </button>
          </div>

          {/* Pro */}
          <div className="bg-[#18181b] rounded-2xl p-6 border-2 border-emerald-500 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">
              POPULAR
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Pro</h3>
            <div className="mb-4">
              <span className="text-4xl font-bold text-white">225</span>
              <span className="text-gray-400 ml-1">MZN</span>
            </div>
            <ul className="space-y-3 text-gray-400 text-sm mb-6">
              <li className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span> 100 créditos
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span> Suporte prioritário
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span> Relatórios avançados
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span> API de integração
              </li>
            </ul>
            <button className="w-full py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 font-medium transition-all">
              Comprar
            </button>
          </div>

          {/* Business */}
          <div className="bg-[#18181b] rounded-2xl p-6 border border-gray-800">
            <h3 className="text-lg font-semibold text-white mb-2">Business</h3>
            <div className="mb-4">
              <span className="text-4xl font-bold text-white">625</span>
              <span className="text-gray-400 ml-1">MZN</span>
            </div>
            <ul className="space-y-3 text-gray-400 text-sm mb-6">
              <li className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span> 500 créditos
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span> Suporte 24/7
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span> Contas dedicadas
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span> Gerente de conta
              </li>
            </ul>
            <button className="w-full py-3 border border-emerald-500 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-white transition-all">
              Comprar
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8">
        <p className="text-center text-gray-500 text-sm">
          © 2024 XBoost. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  )
}
