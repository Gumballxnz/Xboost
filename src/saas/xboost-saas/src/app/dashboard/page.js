"use client"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function Dashboard() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [campaigns, setCampaigns] = useState([])
    const [showModal, setShowModal] = useState(false)
    const [formData, setFormData] = useState({ postUrl: '', comments: 5 })

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login")
        }
    }, [status, router])

    if (status === "loading") {
        return (
            <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-500"></div>
            </div>
        )
    }

    const handleCreateCampaign = async (e) => {
        e.preventDefault()
        // TODO: Enviar para API
        const newCampaign = {
            id: Date.now(),
            postUrl: formData.postUrl,
            comments: formData.comments,
            status: 'pending',
            createdAt: new Date().toISOString()
        }
        setCampaigns([newCampaign, ...campaigns])
        setShowModal(false)
        setFormData({ postUrl: '', comments: 5 })
    }

    return (
        <div className="min-h-screen bg-[#0f0f0f]">
            {/* Header */}
            <header className="border-b border-gray-800 bg-[#18181b]">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-white">
                        <span className="text-emerald-500">X</span>Boost
                    </h1>

                    <div className="flex items-center gap-4">
                        <div className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-sm font-medium">
                            {session?.user?.credits || 5} créditos
                        </div>
                        <div className="flex items-center gap-2">
                            <img
                                src={session?.user?.image || '/default-avatar.png'}
                                alt="Avatar"
                                className="w-8 h-8 rounded-full"
                            />
                            <span className="text-white text-sm hidden sm:block">{session?.user?.name}</span>
                        </div>
                        <button
                            onClick={() => signOut({ callbackUrl: '/' })}
                            className="text-gray-400 hover:text-white text-sm"
                        >
                            Sair
                        </button>
                    </div>
                </div>
            </header>

            {/* Main */}
            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <div className="bg-[#18181b] rounded-xl p-6 border border-gray-800">
                        <p className="text-gray-400 text-sm">Créditos</p>
                        <p className="text-3xl font-bold text-white">{session?.user?.credits || 5}</p>
                    </div>
                    <div className="bg-[#18181b] rounded-xl p-6 border border-gray-800">
                        <p className="text-gray-400 text-sm">Campanhas Ativas</p>
                        <p className="text-3xl font-bold text-emerald-500">{campaigns.filter(c => c.status === 'active').length}</p>
                    </div>
                    <div className="bg-[#18181b] rounded-xl p-6 border border-gray-800">
                        <p className="text-gray-400 text-sm">Comentários Enviados</p>
                        <p className="text-3xl font-bold text-white">0</p>
                    </div>
                </div>

                {/* Action Button */}
                <button
                    onClick={() => setShowModal(true)}
                    className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-3 rounded-xl mb-8 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                    + Nova Campanha
                </button>

                {/* Campaigns List */}
                <div className="bg-[#18181b] rounded-xl border border-gray-800">
                    <div className="p-4 border-b border-gray-800">
                        <h2 className="text-lg font-semibold text-white">Minhas Campanhas</h2>
                    </div>

                    {campaigns.length === 0 ? (
                        <div className="p-12 text-center">
                            <p className="text-gray-500">Nenhuma campanha ainda</p>
                            <p className="text-gray-600 text-sm mt-2">Clique em "Nova Campanha" para começar</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-800">
                            {campaigns.map(campaign => (
                                <div key={campaign.id} className="p-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-white font-medium truncate max-w-md">{campaign.postUrl}</p>
                                        <p className="text-gray-500 text-sm">{campaign.comments} comentários</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${campaign.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                            campaign.status === 'active' ? 'bg-blue-500/20 text-blue-400' :
                                                'bg-yellow-500/20 text-yellow-400'
                                        }`}>
                                        {campaign.status === 'completed' ? 'Concluído' :
                                            campaign.status === 'active' ? 'Ativo' : 'Pendente'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
                    <div className="bg-[#18181b] rounded-2xl p-6 w-full max-w-md border border-gray-800 animate-in fade-in zoom-in duration-200">
                        <h3 className="text-xl font-semibold text-white mb-6">Nova Campanha</h3>

                        <form onSubmit={handleCreateCampaign}>
                            <div className="mb-4">
                                <label className="block text-gray-400 text-sm mb-2">Link do Post</label>
                                <input
                                    type="url"
                                    required
                                    placeholder="https://x.com/usuario/status/..."
                                    value={formData.postUrl}
                                    onChange={(e) => setFormData({ ...formData, postUrl: e.target.value })}
                                    className="w-full px-4 py-3 bg-[#0f0f0f] border border-gray-700 rounded-xl text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                                />
                            </div>

                            <div className="mb-6">
                                <label className="block text-gray-400 text-sm mb-2">Número de Comentários</label>
                                <input
                                    type="range"
                                    min="1"
                                    max="50"
                                    value={formData.comments}
                                    onChange={(e) => setFormData({ ...formData, comments: parseInt(e.target.value) })}
                                    className="w-full accent-emerald-500"
                                />
                                <div className="flex justify-between text-gray-500 text-sm mt-1">
                                    <span>1</span>
                                    <span className="text-emerald-400 font-medium">{formData.comments} comentários</span>
                                    <span>50</span>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-3 border border-gray-700 text-gray-400 rounded-xl hover:bg-gray-800 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 font-medium transition-all"
                                >
                                    Criar Campanha
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
