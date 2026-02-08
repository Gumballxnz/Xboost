import NextAuth from "next-auth"
import GithubProvider from "next-auth/providers/github"
import GoogleProvider from "next-auth/providers/google"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const handler = NextAuth({
    providers: [
        GithubProvider({
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
        }),
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
    ],
    callbacks: {
        async signIn({ user, account, profile }) {
            try {
                // Verificar se usuário existe
                const { data: existingUser } = await supabase
                    .from('users')
                    .select('id')
                    .eq('email', user.email)
                    .single()

                if (!existingUser) {
                    // Criar novo usuário
                    await supabase.from('users').insert({
                        email: user.email,
                        name: user.name,
                        avatar_url: user.image,
                        provider: account.provider,
                        provider_id: profile.id || profile.sub,
                        email_verified: true,
                        credits: 5,
                        plan: 'free'
                    })
                }

                return true
            } catch (error) {
                console.error('SignIn error:', error)
                return true // Permite login mesmo com erro no banco
            }
        },
        async session({ session, token }) {
            // Buscar dados do usuário no Supabase
            const { data: user } = await supabase
                .from('users')
                .select('*')
                .eq('email', session.user.email)
                .single()

            if (user) {
                session.user.id = user.id
                session.user.credits = user.credits
                session.user.plan = user.plan
            }

            return session
        },
        async jwt({ token, account }) {
            if (account) {
                token.accessToken = account.access_token
            }
            return token
        }
    },
    pages: {
        signIn: '/login',
        error: '/login',
    },
    session: {
        strategy: 'jwt',
    },
})

export { handler as GET, handler as POST }
