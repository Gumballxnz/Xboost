"use client"
import { signIn } from "next-auth/react"

export default function LoginPage() {
    return (
        <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-white mb-2">
                        <span className="text-emerald-500">X</span>Boost
                    </h1>
                    <p className="text-gray-400">Aumente seu engajamento no X</p>
                </div>

                {/* Login Card */}
                <div className="bg-[#18181b] rounded-2xl p-8 border border-gray-800 shadow-xl">
                    <h2 className="text-xl font-semibold text-white text-center mb-6">
                        Entrar na sua conta
                    </h2>

                    <div className="space-y-4">
                        {/* Google Login */}
                        <button
                            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white text-black rounded-xl font-medium hover:bg-gray-100 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.087 0 12 0 7.31 0 3.255 2.69 1.291 6.617l3.975 3.148Z" />
                                <path fill="#34A853" d="M16.04 18.013c-1.09.703-2.474 1.078-4.04 1.078a7.077 7.077 0 0 1-6.723-4.823l-3.998 3.066C3.299 21.352 7.32 24 12 24c3.24 0 5.957-1.156 7.961-3.006l-3.922-2.981Z" />
                                <path fill="#4A90E2" d="M19.834 10.09H12v3.909h4.518c-.547 1.667-1.575 2.822-2.943 3.405l3.922 2.981c2.124-1.922 3.503-4.798 3.503-8.245 0-.687-.078-1.386-.166-2.05Z" />
                                <path fill="#FBBC05" d="M5.266 14.235c-.175-.845-.266-1.72-.266-2.615s.091-1.77.266-2.615l-3.975-3.148C.486 7.643 0 9.773 0 12c0 2.227.486 4.357 1.291 6.143l3.975-3.908Z" />
                            </svg>
                            Continuar com Google
                        </button>

                        {/* GitHub Login */}
                        <button
                            onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
                            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#333] text-white rounded-xl font-medium hover:bg-[#444] transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                            </svg>
                            Continuar com GitHub
                        </button>
                    </div>

                    <div className="mt-6 pt-6 border-t border-gray-700">
                        <p className="text-center text-gray-500 text-sm">
                            Ao continuar, você concorda com nossos{" "}
                            <a href="#" className="text-emerald-500 hover:underline">Termos</a>
                            {" "}e{" "}
                            <a href="#" className="text-emerald-500 hover:underline">Privacidade</a>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-gray-500 text-sm mt-6">
                    © 2024 XBoost. Todos os direitos reservados.
                </p>
            </div>
        </div>
    )
}
