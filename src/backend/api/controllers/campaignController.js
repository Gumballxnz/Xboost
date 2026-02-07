
const supabase = require('../../config/supabase');
const campaignQueue = require('../../queues/process-campaign.job');

exports.createCampaign = async (req, res) => {
    try {
        const { postUrl, commentCount } = req.body;
        const user = req.user; // Do JWT Middleware (que precisa ser atualizado para buscar user no DB)

        if (!postUrl || (!postUrl.includes('twitter.com') && !postUrl.includes('x.com'))) {
            return res.status(400).json({ error: 'URL inválida. Use links do Twitter/X.' });
        }

        const count = parseInt(commentCount) || 5;
        const cost = count; // 1 crédito por comentário

        // 1. Verificar Créditos no Supabase
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('credits')
            .eq('id', user.id) // O ID vem do token JWT (sub)
            .single();

        if (userError || !userData) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        if (userData.credits < cost) {
            return res.status(402).json({ error: `Créditos insuficientes. Você tem ${userData.credits}, mas precisa de ${cost}.` });
        }

        // 2. Deduzir Créditos
        const { error: updateError } = await supabase
            .from('users')
            .update({ credits: userData.credits - cost })
            .eq('id', user.id);

        if (updateError) throw updateError;

        // 3. Criar Campanha no DB
        const { data: campaign, error: campError } = await supabase
            .from('campaigns')
            .insert([{
                user_id: user.id,
                post_url: postUrl,
                comment_count: count,
                status: 'queued',
                cost: cost
            }])
            .select()
            .single();

        if (campError) throw campError;

        // 4. Adicionar Job na Fila BullMQ
        await campaignQueue.add('process-campaign', {
            campaignId: campaign.id,
            userId: user.id,
            postUrl,
            commentCount: count
        });

        res.status(201).json({
            message: 'Campanha criada com sucesso!',
            campaignId: campaign.id,
            newBalance: userData.credits - cost,
            status: 'queued'
        });

    } catch (error) {
        console.error('Erro ao criar campanha:', error);
        // Tentar reembolsar em caso de erro crítico? (Fica para Sprint de Robustez)
        res.status(500).json({ error: 'Erro interno ao processar campanha.' });
    }
};

exports.listCampaigns = async (req, res) => {
    try {
        const { data: campaigns, error } = await supabase
            .from('campaigns')
            .select('*')
            .eq('user_id', req.user.id) // Buscar apenas do usuário logado
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json(campaigns.map(c => ({
            id: c.id,
            url: c.post_url,
            status: c.status,
            count: c.comment_count,
            date: c.created_at
        })));
    } catch (error) {
        console.error('Erro ao listar campanhas:', error);
        res.status(500).json({ error: 'Erro ao buscar histórico.' });
    }
};
